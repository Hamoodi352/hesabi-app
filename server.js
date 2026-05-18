const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch {}

const root = __dirname;
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "db.json");
const sessions = new Map();
const streamClients = new Set();
const port = Number(process.env.PORT || 4173);
const usePg = Boolean(process.env.DATABASE_URL);

let pgPool = null;
if (usePg) {
  const { Pool } = require("pg");
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
}

bootstrap()
  .then(() => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        if (url.pathname === "/api/login" && req.method === "POST") return login(req, res);
        if (url.pathname === "/api/signup" && req.method === "POST") return signup(req, res);
        if (url.pathname === "/api/verify-email" && req.method === "POST") return verifyEmail(req, res);
        if (url.pathname === "/api/password/request-reset" && req.method === "POST") return requestPasswordReset(req, res);
        if (url.pathname === "/api/password/confirm-reset" && req.method === "POST") return confirmPasswordReset(req, res);
        if (url.pathname === "/api/session" && req.method === "GET") return session(req, res);
        if (url.pathname === "/api/team/users" && req.method === "POST") return createTeamUser(req, res);
        if (url.pathname.startsWith("/api/team/users/") && req.method === "PUT") return updateTeamUser(req, res, url);
        if (url.pathname === "/api/state" && req.method === "GET") return getState(req, res);
        if (url.pathname === "/api/state" && req.method === "PUT") return putState(req, res);
        if (url.pathname === "/api/stream" && req.method === "GET") return streamState(req, res, url);
        return staticFile(url.pathname, res);
      } catch (error) {
        json(res, 500, { error: error.message || "Server error" });
      }
    });

    server.listen(port, () => {
      console.log(`Invoice app running at http://localhost:${port}`);
      console.log(usePg ? "Storage: PostgreSQL" : "Storage: Local JSON file");
      console.log("Default admin: admin@example.com / admin123");
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });

async function bootstrap() {
  await ensureStateStore();
}

async function login(req, res) {
  const body = await readBody(req);
  const db = await readDb();
  const { email, password } = JSON.parse(body || "{}");
  const user = db.users.find((item) => item.email === email);
  if (!user || user.active === false || user.emailVerified === false || !verifyPassword(password || "", user)) return json(res, 401, { error: "بيانات الدخول غير صحيحة أو الحساب غير فعال/غير مؤكد" });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, createdAt: Date.now() });
  json(res, 200, { token, user: publicUser(user) });
}

async function signup(req, res) {
  const body = await readBody(req);
  const { name, email, password } = JSON.parse(body || "{}");
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");
  if (!cleanName || !cleanEmail || cleanPassword.length < 6) return json(res, 400, { error: "الاسم والبريد مطلوبان وكلمة المرور 6 أحرف على الأقل" });

  const db = await readDb();
  if (db.users.some((u) => String(u.email || "").toLowerCase() === cleanEmail)) return json(res, 409, { error: "البريد مستخدم مسبقًا" });
  db.pendingUsers ||= [];
  db.emailVerifications ||= [];
  db.pendingUsers = db.pendingUsers.filter((u) => String(u.email || "").toLowerCase() !== cleanEmail);
  db.emailVerifications = db.emailVerifications.filter((v) => String(v.email || "").toLowerCase() !== cleanEmail);

  const salt = crypto.randomBytes(16).toString("hex");
  const pending = {
    id: `u-${Date.now().toString(36)}`,
    name: cleanName,
    email: cleanEmail,
    role: "employee",
    active: true,
    emailVerified: true,
    salt,
    passwordHash: hashPassword(cleanPassword, salt),
  };
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeSalt = crypto.randomBytes(12).toString("hex");
  db.pendingUsers.push(pending);
  db.emailVerifications.push({
    email: cleanEmail,
    codeHash: hashPassword(code, codeSalt),
    codeSalt,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  await writeDb(bumpRevision(db));

  const delivered = await sendVerificationCode(cleanEmail, code);
  if (!delivered) {
    return json(res, 200, {
      ok: true,
      delivery: "code",
      debugCode: code,
      smtpConfigured: isSmtpConfigured(),
      message: isSmtpConfigured()
        ? "Email send failed. Use the fallback code."
        : "SMTP is not configured on the server. Use the fallback code.",
    });
  }
  return json(res, 200, { ok: true, delivery: "email", smtpConfigured: true, message: "Verification code sent to your email." });
}

async function verifyEmail(req, res) {
  const body = await readBody(req);
  const { email, code } = JSON.parse(body || "{}");
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanCode = String(code || "").trim();
  const db = await readDb();
  db.pendingUsers ||= [];
  db.emailVerifications ||= [];
  const pending = db.pendingUsers.find((u) => String(u.email || "").toLowerCase() === cleanEmail);
  const verification = db.emailVerifications.find((v) => String(v.email || "").toLowerCase() === cleanEmail);
  if (!pending || !verification) return json(res, 400, { error: "Verification request not found" });
  if (Date.now() > Number(verification.expiresAt || 0)) return json(res, 400, { error: "Verification code expired" });
  if (!timingSafeEquals(hashPassword(cleanCode, verification.codeSalt), verification.codeHash)) return json(res, 400, { error: "Invalid verification code" });
  if (!db.users.some((u) => String(u.email || "").toLowerCase() === cleanEmail)) db.users.push(pending);
  db.pendingUsers = db.pendingUsers.filter((u) => String(u.email || "").toLowerCase() !== cleanEmail);
  db.emailVerifications = db.emailVerifications.filter((v) => String(v.email || "").toLowerCase() !== cleanEmail);
  await writeDb(bumpRevision(db));
  broadcastStateChange();
  return json(res, 200, { ok: true, message: "Account verified successfully" });
}


async function requestPasswordReset(req, res) {
  const body = await readBody(req);
  const { email } = JSON.parse(body || "{}");
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) return json(res, 400, { error: "Email is required" });
  const db = await readDb();
  const user = db.users.find((u) => String(u.email || "").toLowerCase() === cleanEmail && u.active !== false);
  if (!user) return json(res, 404, { error: "Account not found" });
  db.passwordResets ||= [];
  db.passwordResets = db.passwordResets.filter((item) => String(item.email || "").toLowerCase() !== cleanEmail);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeSalt = crypto.randomBytes(12).toString("hex");
  db.passwordResets.push({
    email: cleanEmail,
    codeHash: hashPassword(code, codeSalt),
    codeSalt,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  await writeDb(bumpRevision(db));
  const delivered = await sendEmailCode(cleanEmail, code, "Password reset code", "Reset code");
  if (!delivered) return json(res, 200, { ok: true, delivery: "code", debugCode: code, message: "Use this code to reset your password." });
  return json(res, 200, { ok: true, delivery: "email", message: "Reset code sent to your email." });
}

async function confirmPasswordReset(req, res) {
  const body = await readBody(req);
  const { email, code, newPassword } = JSON.parse(body || "{}");
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanCode = String(code || "").trim();
  const password = String(newPassword || "");
  if (password.length < 6) return json(res, 400, { error: "Password must be at least 6 chars" });
  const db = await readDb();
  db.passwordResets ||= [];
  const reset = db.passwordResets.find((item) => String(item.email || "").toLowerCase() === cleanEmail);
  const user = db.users.find((u) => String(u.email || "").toLowerCase() === cleanEmail);
  if (!reset || !user) return json(res, 400, { error: "Reset request not found" });
  if (Date.now() > Number(reset.expiresAt || 0)) return json(res, 400, { error: "Reset code expired" });
  if (!timingSafeEquals(hashPassword(cleanCode, reset.codeSalt), reset.codeHash)) return json(res, 400, { error: "Invalid reset code" });
  const salt = crypto.randomBytes(16).toString("hex");
  user.salt = salt;
  user.passwordHash = hashPassword(password, salt);
  db.passwordResets = db.passwordResets.filter((item) => String(item.email || "").toLowerCase() !== cleanEmail);
  await writeDb(bumpRevision(db));
  return json(res, 200, { ok: true, message: "Password changed successfully" });
}
async function session(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  json(res, 200, { user: publicUser(auth.user) });
}

async function createTeamUser(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  if (auth.user.role !== "admin") return json(res, 403, { error: "فقط المدير يمكنه إضافة مستخدمين" });
  const body = await readBody(req);
  const { name, email, password, role } = JSON.parse(body || "{}");
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");
  const cleanRole = ["accountant", "cashier", "employee", "viewer"].includes(role) ? role : "employee";
  if (!cleanName || !cleanEmail || cleanPassword.length < 6) return json(res, 400, { error: "الاسم والبريد مطلوبان وكلمة المرور 6 أحرف على الأقل" });
  const db = await readDb();
  if (db.users.some((u) => String(u.email || "").toLowerCase() === cleanEmail)) return json(res, 409, { error: "البريد مستخدم مسبقًا" });
  const salt = crypto.randomBytes(16).toString("hex");
  const newUser = {
    id: `u-${Date.now().toString(36)}`,
    name: cleanName,
    email: cleanEmail,
    role: cleanRole,
    active: true,
    emailVerified: true,
    salt,
    passwordHash: hashPassword(cleanPassword, salt),
  };
  db.users.push(newUser);
  await writeDb(bumpRevision(db));
  broadcastStateChange();
  return json(res, 200, { ok: true, user: publicUser(newUser) });
}

async function updateTeamUser(req, res, url) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  if (auth.user.role !== "admin") return json(res, 403, { error: "Only admin can edit users" });
  const userId = decodeURIComponent(url.pathname.split("/").pop() || "");
  if (!userId) return json(res, 400, { error: "User id is required" });
  const body = await readBody(req);
  const payload = JSON.parse(body || "{}");
  const db = await readDb();
  const target = db.users.find((item) => item.id === userId);
  if (!target) return json(res, 404, { error: "User not found" });
  if (target.id === auth.user.id && payload.active === false) return json(res, 400, { error: "Cannot deactivate current login user" });
  if (payload.role && ["admin", "accountant", "cashier", "employee", "viewer"].includes(payload.role)) target.role = payload.role;
  if (payload.active !== undefined) target.active = Boolean(payload.active);
  if (payload.name !== undefined) {
    const clean = String(payload.name || "").trim();
    if (clean) target.name = clean;
  }
  await writeDb(bumpRevision(db));
  broadcastStateChange();
  return json(res, 200, { ok: true, user: publicUser(target) });
}

async function getState(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  json(res, 200, sanitizeState(auth.db));
}

async function putState(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const body = await readBody(req);
  const next = JSON.parse(body || "{}");
  const baseRevision = Number(next._baseRevision || 0);
  const currentRevision = Number(auth.db._meta?.revision || 1);
  if (baseRevision && baseRevision !== currentRevision) return json(res, 409, { error: "State changed on another device", code: "REVISION_CONFLICT", latestRevision: currentRevision });
  const role = auth.user.role;
  const guarded = roleGuard(role, auth.db, next);
  if (!guarded.ok) return json(res, 403, { error: guarded.error });
  const merged = { ...next, users: mergeUsers(auth.db.users, next.users || []) };
  delete merged._baseRevision;
  delete merged._revision;
  const withRevision = bumpRevision(merged, currentRevision);
  await writeDb(withRevision);
  broadcastStateChange();
  json(res, 200, { ok: true, revision: withRevision._meta.revision });
}

async function streamState(req, res, url) {
  const token = url.searchParams.get("token") || "";
  const sessionObj = sessions.get(token);
  const db = await readDb();
  const user = sessionObj ? db.users.find((item) => item.id === sessionObj.userId) : null;
  if (!user || user.active === false) return json(res, 401, { error: "يرجى تسجيل الدخول" });

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  res.write(`event: ready\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);

  const client = { res };
  streamClients.add(client);
  const keepAlive = setInterval(() => {
    try {
      res.write(`event: ping\ndata: ${Date.now()}\n\n`);
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    streamClients.delete(client);
  });
}

function broadcastStateChange() {
  if (!streamClients.size) return;
  const payload = `event: state\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`;
  for (const client of streamClients) {
    try {
      client.res.write(payload);
    } catch {
      streamClients.delete(client);
    }
  }
}

function roleGuard(role, current, next) {
  if (role === "admin") return { ok: true };
  if (role === "viewer") return { ok: false, error: "المستخدم للعرض فقط" };

  const changed = (key) => JSON.stringify(current[key] || null) !== JSON.stringify(next[key] || null);
  const blockedForAccountant = ["settings", "users", "accounts", "products"];
  const blockedForCashier = ["settings", "users", "accounts", "products", "contacts", "expenses", "categories"];
  const blocked = role === "accountant" ? blockedForAccountant : blockedForCashier;
  const badKey = blocked.find(changed);
  if (badKey) return { ok: false, error: "الصلاحية لا تسمح بتعديل هذا القسم" };

  const protectedCollections = ["invoices", "payments", "expenses", "credits"];
  for (const key of protectedCollections) {
    const before = Array.isArray(current[key]) ? current[key] : [];
    const after = Array.isArray(next[key]) ? next[key] : [];
    if (after.length < before.length) return { ok: false, error: "لا يمكن حذف سجلات مالية مباشرة بهذا الدور" };
  }

  if (role === "cashier" || role === "employee") {
    const allowedKeys = new Set(["currentUserId", "invoices", "payments", "activityLog"]);
    const modifiedKeys = Object.keys(next).filter((key) => JSON.stringify(current[key] ?? null) !== JSON.stringify(next[key] ?? null));
    const illegalKey = modifiedKeys.find((key) => !allowedKeys.has(key));
    if (illegalKey) return { ok: false, error: "هذا الدور لا يملك تعديل هذا القسم" };
  }

  return { ok: true };
}

function staticFile(urlPath, res) {
  const clean = urlPath === "/" ? "/index.html" : urlPath;
  const file = path.normalize(path.join(root, clean));
  if (!file.startsWith(root)) return json(res, 403, { error: "Forbidden" });
  fs.readFile(file, (error, content) => {
    if (error) return json(res, 404, { error: "Not found" });
    res.writeHead(200, { "Content-Type": contentType(file) });
    res.end(content);
  });
}

async function requireAuth(req, res) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const sessionObj = sessions.get(token);
  const db = await readDb();
  const user = sessionObj ? db.users.find((item) => item.id === sessionObj.userId) : null;
  if (!user || user.active === false) {
    json(res, 401, { error: "يرجى تسجيل الدخول" });
    return null;
  }
  return { user, db };
}

function sanitizeState(db) {
  const sanitized = { ...db, users: db.users.map(publicUser) };
  delete sanitized.pendingUsers;
  delete sanitized.emailVerifications;
  delete sanitized.passwordResets;
  sanitized._revision = Number(db._meta?.revision || 1);
  return sanitized;
}

function publicUser(user) {
  const { passwordHash, salt, ...safe } = user;
  return safe;
}

function mergeUsers(existing, incoming) {
  return existing.map((user) => {
    const visible = incoming.find((item) => item.id === user.id) || {};
    return { ...user, name: visible.name || user.name, role: visible.role || user.role, active: visible.active ?? user.active };
  });
}

async function ensureStateStore() {
  if (usePg) {
    await ensurePgState();
    return;
  }
  ensureFileState();
}

async function ensurePgState() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const existing = await pgPool.query("SELECT id FROM app_state WHERE id = 1");
  if (existing.rowCount > 0) return;
  const seed = loadSeed();
  await pgPool.query("INSERT INTO app_state (id, data) VALUES (1, $1::jsonb)", [JSON.stringify(seed)]);
}

function ensureFileState() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (fs.existsSync(dbPath)) return;
  const seed = loadSeed();
  fs.writeFileSync(dbPath, JSON.stringify(seed, null, 2), "utf8");
}

function loadSeed() {
  const seed = JSON.parse(fs.readFileSync(path.join(root, "seed.json"), "utf8"));
  seed.users = [
    user("u-admin", "المدير", "admin@example.com", "admin123", "admin"),
    user("u-accountant", "المحاسب", "accountant@example.com", "accountant123", "accountant"),
    user("u-cashier", "الكاشير", "cashier@example.com", "cashier123", "cashier"),
    user("u-employee", "موظف", "employee@example.com", "employee123", "employee"),
  ];
  seed.pendingUsers = [];
  seed.emailVerifications = [];
  seed.passwordResets = [];
  seed._meta = { revision: 1, updatedAt: Date.now() };
  return seed;
}

function bumpRevision(data, currentRevision = null) {
  const current = currentRevision || Number(data?._meta?.revision || 1);
  data._meta = {
    revision: current + 1,
    updatedAt: Date.now(),
  };
  return data;
}

function user(id, name, email, password, role) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { id, name, email, role, active: true, salt, passwordHash: hashPassword(password, salt) };
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
}

function verifyPassword(password, userObj) {
  return timingSafeEquals(hashPassword(password, userObj.salt), userObj.passwordHash);
}

function timingSafeEquals(a, b) {
  try {
    return crypto.timingSafeEqual(Buffer.from(String(a), "utf8"), Buffer.from(String(b), "utf8"));
  } catch {
    return false;
  }
}

async function sendVerificationCode(email, code) {
  return sendEmailCode(email, code, "Verify your account", "Verification code");
}

async function sendEmailCode(email, code, subject, textPrefix) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!nodemailer || !host || !user || !pass || !from) {
    console.log(`Verification code for ${email}: ${code}`);
    return false;
  }
  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transport.sendMail({
      from,
      to: email,
      subject,
      text: `${textPrefix}: ${code}\nExpires in 15 minutes.`,
    });
    return true;
  } catch (error) {
    console.log("SMTP send failed:", error.message || error);
    console.log(`Verification code for ${email}: ${code}`);
    return false;
  }
}

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && (process.env.SMTP_FROM || process.env.SMTP_USER));
}

async function readDb() {
  if (usePg) {
    const result = await pgPool.query("SELECT data FROM app_state WHERE id = 1");
    return result.rows[0]?.data || loadSeed();
  }
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

async function writeDb(data) {
  if (usePg) {
    await pgPool.query("UPDATE app_state SET data = $1::jsonb, updated_at = NOW() WHERE id = 1", [JSON.stringify(data)]);
    return;
  }
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function contentType(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".webmanifest")) return "application/manifest+json; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

