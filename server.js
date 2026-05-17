const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "db.json");
const sessions = new Map();
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
        if (url.pathname === "/api/session" && req.method === "GET") return session(req, res);
        if (url.pathname === "/api/state" && req.method === "GET") return getState(req, res);
        if (url.pathname === "/api/state" && req.method === "PUT") return putState(req, res);
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
  if (!user || user.active === false || !verifyPassword(password || "", user)) return json(res, 401, { error: "بيانات الدخول غير صحيحة أو الحساب غير فعال" });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, createdAt: Date.now() });
  json(res, 200, { token, user: publicUser(user) });
}

async function session(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  json(res, 200, { user: publicUser(auth.user) });
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
  const role = auth.user.role;
  const guarded = roleGuard(role, auth.db, next);
  if (!guarded.ok) return json(res, 403, { error: guarded.error });
  const merged = { ...next, users: mergeUsers(auth.db.users, next.users || []) };
  await writeDb(merged);
  json(res, 200, { ok: true });
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
  return { ...db, users: db.users.map(publicUser) };
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
  return seed;
}

function user(id, name, email, password, role) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { id, name, email, role, active: true, salt, passwordHash: hashPassword(password, salt) };
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
}

function verifyPassword(password, userObj) {
  return crypto.timingSafeEqual(Buffer.from(hashPassword(password, userObj.salt), "hex"), Buffer.from(userObj.passwordHash, "hex"));
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
