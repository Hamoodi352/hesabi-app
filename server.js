const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "db.json");
const sessions = new Map();
const port = Number(process.env.PORT || 4173);

ensureDb();

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
  console.log("Default admin: admin@example.com / admin123");
});

function login(req, res) {
  readBody(req).then((body) => {
    const db = readDb();
    const { email, password } = JSON.parse(body || "{}");
    const user = db.users.find((item) => item.email === email);
    if (!user || user.active === false || !verifyPassword(password || "", user)) return json(res, 401, { error: "بيانات الدخول غير صحيحة أو الحساب غير فعال" });
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { userId: user.id, createdAt: Date.now() });
    json(res, 200, { token, user: publicUser(user) });
  });
}

function session(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  json(res, 200, { user: publicUser(auth.user) });
}

function getState(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  json(res, 200, sanitizeState(auth.db));
}

function putState(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  readBody(req).then((body) => {
    const next = JSON.parse(body || "{}");
    const role = auth.user.role;
    const guarded = roleGuard(role, auth.db, next);
    if (!guarded.ok) return json(res, 403, { error: guarded.error });
    const merged = { ...next, users: mergeUsers(auth.db.users, next.users || []) };
    writeDb(merged);
    json(res, 200, { ok: true });
  });
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

  // Financial safety: non-admin users cannot hard-delete core records.
  const protectedCollections = ["invoices", "payments", "expenses", "credits"];
  for (const key of protectedCollections) {
    const before = Array.isArray(current[key]) ? current[key] : [];
    const after = Array.isArray(next[key]) ? next[key] : [];
    if (after.length < before.length) return { ok: false, error: "لا يمكن حذف سجلات مالية مباشرة بهذا الدور" };
  }

  // Cashier/employee are restricted to operational flows only.
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

function requireAuth(req, res) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const session = sessions.get(token);
  const db = readDb();
  const user = session ? db.users.find((item) => item.id === session.userId) : null;
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

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (fs.existsSync(dbPath)) return;
  const seed = JSON.parse(fs.readFileSync(path.join(root, "seed.json"), "utf8"));
  seed.users = [
    user("u-admin", "المدير", "admin@example.com", "admin123", "admin"),
    user("u-accountant", "المحاسب", "accountant@example.com", "accountant123", "accountant"),
    user("u-cashier", "الكاشير", "cashier@example.com", "cashier123", "cashier"),
    user("u-employee", "موظف", "employee@example.com", "employee123", "employee"),
  ];
  writeDb(seed);
}

function user(id, name, email, password, role) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { id, name, email, role, active: true, salt, passwordHash: hashPassword(password, salt) };
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
}

function verifyPassword(password, user) {
  return crypto.timingSafeEqual(Buffer.from(hashPassword(password, user.salt), "hex"), Buffer.from(user.passwordHash, "hex"));
}

function readDb() {
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDb(data) {
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
