const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { DatabaseSync } = require("node:sqlite");

const app = express();
app.use(express.json());

/* ========== قاعدة البيانات ========== */
const os = require("os");

let DATA_DIR = __dirname;
try {
  fs.accessSync(__dirname, fs.constants.W_OK);
} catch {
  DATA_DIR = os.tmpdir();   // المجلد الأصلي للقراءة فقط، نستعمل المجلد المؤقت
}

const db = new DatabaseSync(path.join(DATA_DIR, "store.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    rating REAL DEFAULT 4,
    ratingCount INTEGER DEFAULT 0,
    image TEXT DEFAULT 'placeholder.jpeg',
    description TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS orders (
    number INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'جديد',
    date TEXT NOT NULL
  );
`);

try { db.exec("ALTER TABLE orders ADD COLUMN coupon TEXT"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN discount REAL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN userId INTEGER"); } catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS coupons (
    code TEXT PRIMARY KEY,
    percent INTEGER NOT NULL,
    active INTEGER DEFAULT 1
  )
`);
db.prepare("INSERT OR IGNORE INTO coupons (code,percent) VALUES (?,?)").run("save10", 10);
db.prepare("INSERT OR IGNORE INTO coupons (code,percent) VALUES (?,?)").run("save20", 20);

function findCoupon(code) {
  return db.prepare("SELECT * FROM coupons WHERE code = ? AND active = 1")
    .get(String(code || "").trim().toUpperCase());
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, file), "utf8"));
  } catch {
    return fallback;
  }
}

// نقل البيانات القديمة من ملفات JSON (يحصل مرة واحدة فقط)
if (db.prepare("SELECT COUNT(*) AS n FROM products").get().n === 0) {
  const old = readJson("products.json", []);
  const ins = db.prepare(
    "INSERT INTO products (id,name,category,price,rating,ratingCount,image,description) VALUES (?,?,?,?,?,?,?,?)"
  );
  for (const p of old) {
    ins.run(p.id, p.name, p.category, p.price, p.rating ?? 4,
            p.ratingCount ?? 0, p.image ?? "placeholder.jpeg", p.description ?? "");
  }
}

if (db.prepare("SELECT COUNT(*) AS n FROM orders").get().n === 0) {
  const old = readJson("orders.json", []);
  const ins = db.prepare(
    "INSERT INTO orders (number,name,phone,address,items,total,status,date) VALUES (?,?,?,?,?,?,?,?)"
  );
  for (const o of old) {
    ins.run(o.number, o.name, o.phone, o.address, JSON.stringify(o.items || {}),
            o.total || 0, o.status || "جديد", o.date || new Date().toISOString());
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS ratings (
    productId INTEGER NOT NULL,
    voter TEXT NOT NULL,
    stars INTEGER NOT NULL,
    PRIMARY KEY (productId, voter)
  )
`);

// نقل التقييمات القديمة من ratings.json (مرة واحدة فقط)
if (db.prepare("SELECT COUNT(*) AS n FROM ratings").get().n === 0) {
  const old = readJson("ratings.json", {});
  const ins = db.prepare("INSERT OR IGNORE INTO ratings (productId,voter,stars) VALUES (?,?,?)");
  for (const id of Object.keys(old)) {
    for (const v of old[id]) ins.run(Number(id), String(v.voter), Number(v.stars));
  }
}

function readProducts() {
  return db.prepare("SELECT * FROM products ORDER BY id").all();
}

function readOrders() {
  return db.prepare("SELECT * FROM orders ORDER BY number").all()
    .map(o => ({ ...o, items: JSON.parse(o.items) }));
}

const crypto = require("crypto");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    userId INTEGER NOT NULL,
    expires INTEGER NOT NULL
  );
`);
db.prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + crypto.scryptSync(pw, salt, 64).toString("hex");
}

function checkPassword(pw, stored) {
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(pw, salt, 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, "hex"));
}

const sha = t => crypto.createHash("sha256").update(t).digest("hex");

function getCookie(req, name) {
  const part = (req.headers.cookie || "").split(";")
    .map(s => s.trim()).find(s => s.startsWith(name + "="));
  return part ? part.slice(name.length + 1) : null;
}

function startSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token,userId,expires) VALUES (?,?,?)")
    .run(sha(token), userId, Date.now() + 7 * 86400000);
  const secure = req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  res.setHeader("Set-Cookie",
    `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 86400}${secure}`);
}

app.use((req, res, next) => {
  req.user = null;
  const token = getCookie(req, "sid");
  if (token) {
    const row = db.prepare(
      "SELECT u.id,u.name,u.email,s.expires FROM sessions s JOIN users u ON u.id = s.userId WHERE s.token = ?"
    ).get(sha(token));
    if (row && row.expires > Date.now()) {
      req.user = { id: row.id, name: row.name, email: row.email };
    }
  }
  next();
});

const attempts = {};
function tooMany(key) {
  const now = Date.now();
  attempts[key] = (attempts[key] || []).filter(t => now - t < 15 * 60000);
  return attempts[key].length >= 8;
}

app.post("/api/register", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 100);
  const email = String(req.body.email || "").trim().toLowerCase().slice(0, 200);
  const password = String(req.body.password || "");

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 8 || password.length > 200) {
    return res.status(400).json({ error: "تأكد من الاسم والبريد، وكلمة السر 8 أحرف على الأقل" });
  }
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
    return res.status(409).json({ error: "هذا البريد مسجّل من قبل" });
  }

  const info = db.prepare(
    "INSERT INTO users (name,email,password,created) VALUES (?,?,?,?)"
  ).run(name, email, hashPassword(password), new Date().toISOString());

  startSession(req, res, Number(info.lastInsertRowid));
  res.json({ ok: true, name });
});

app.post("/api/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const key = req.ip + email;

  if (tooMany(key)) {
    return res.status(429).json({ error: "محاولات كثيرة، حاول بعد 15 دقيقة" });
  }

  const u = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!u || !checkPassword(password, u.password)) {
    (attempts[key] = attempts[key] || []).push(Date.now());
    return res.status(401).json({ error: "البريد أو كلمة السر غير صحيحة" });
  }

  startSession(req, res, u.id);
  res.json({ ok: true, name: u.name });
});

app.post("/api/logout", (req, res) => {
  const token = getCookie(req, "sid");
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(sha(token));
  res.setHeader("Set-Cookie", "sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => res.json({ user: req.user }));

/* ========== كلمة سر الإدارة ========== */
const ADMIN_USER = "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "0000";   // ← ضع كلمة سرك هنا

function requireAdmin(req, res, next) {
  const [type, b64] = (req.headers.authorization || "").split(" ");
  if (type === "Basic" && b64) {
    const [user, ...rest] = Buffer.from(b64, "base64").toString().split(":");
    if (user === ADMIN_USER && rest.join(":") === ADMIN_PASS) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="Admin"');
  res.status(401).send("غير مصرح");
}

app.use("/admin.html", requireAdmin);
app.use("/admin.js", requireAdmin);

app.use((req, res, next) => {
  const blocked = /^\/(orders\.json|products\.json|ratings\.json|store\.db[^/]*|server\.js|package(-lock)?\.json)$/i;
  if (blocked.test(req.path) || req.path.startsWith("/node_modules")) {
    return res.status(404).end();
  }
  next();
});

/* ========== المنتجات ========== */
app.get("/products.js", (req, res) => {
  res.type("application/javascript");
  res.send(`const IMG_FOLDER = "image";\nconst products = ${JSON.stringify(readProducts())};`);
});

app.use(express.static(__dirname));

app.get("/api/products", (req, res) => res.json(readProducts()));

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "image"),
    filename: (req, file, cb) =>
      cb(null, Date.now() + path.extname(file.originalname).toLowerCase())
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    cb(null, /\.(jpe?g|png|webp)$/i.test(file.originalname))
});

app.post("/api/products", requireAdmin, upload.single("image"), (req, res) => {
  const name = (req.body.name || "").trim();
  const category = (req.body.category || "").trim();
  const price = Number(req.body.price);

  if (!name || !category || !(price > 0)) {
    return res.status(400).json({ error: "بيانات ناقصة" });
  }

  const info = db.prepare(
    "INSERT INTO products (name,category,price,image,description) VALUES (?,?,?,?,?)"
  ).run(name, category, price,
        req.file ? req.file.filename : "placeholder.jpeg",
        req.body.description || "");

  res.json({ ok: true, id: Number(info.lastInsertRowid) });
});

app.delete("/api/products/:id", requireAdmin, (req, res) => {
  const info = db.prepare("DELETE FROM products WHERE id = ?").run(Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: "المنتج غير موجود" });
  res.json({ ok: true });
});

app.put("/api/products/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const p = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!p) return res.status(404).json({ error: "المنتج غير موجود" });

  const name = (req.body.name || "").trim() || p.name;
  const price = Number(req.body.price) > 0 ? Number(req.body.price) : p.price;

  db.prepare("UPDATE products SET name = ?, price = ? WHERE id = ?").run(name, price, id);
  res.json({ ok: true });
});

/* ========== التقييمات ========== */
app.post("/api/products/:id/rate", (req, res) => {
  const id = Number(req.params.id);
  const stars = Number(req.body.stars);

  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: "تقييم غير صحيح" });
  }
  if (!db.prepare("SELECT id FROM products WHERE id = ?").get(id)) {
    return res.status(404).json({ error: "المنتج غير موجود" });
  }

  try {
    db.prepare("INSERT INTO ratings (productId,voter,stars) VALUES (?,?,?)")
      .run(id, req.ip, stars);
  } catch {
    return res.status(409).json({ error: "قيّمت هذا المنتج من قبل" });
  }

  const { avg, n } = db.prepare(
    "SELECT AVG(stars) AS avg, COUNT(*) AS n FROM ratings WHERE productId = ?"
  ).get(id);

  const rating = Number(avg.toFixed(1));
  db.prepare("UPDATE products SET rating = ?, ratingCount = ? WHERE id = ?")
    .run(rating, n, id);

  res.json({ ok: true, rating, count: n });
});

app.post("/api/coupon", (req, res) => {
  const c = findCoupon(req.body.code);
  if (!c) return res.status(404).json({ error: "الكود غير صحيح" });
  res.json({ ok: true, percent: c.percent });
});

/* ========== الطلبات ========== */
const STATUSES = ["جديد", "قيد التجهيز", "تم التسليم"];

app.post("/api/orders", (req, res) => {
  const { name, phone, address, items } = req.body;

  if (!name || !phone || !address || !items || typeof items !== "object") {
    return res.status(400).json({ error: "بيانات ناقصة" });
  }

  const catalog = readProducts();
  const clean = {};
  let total = 0;

  for (const id of Object.keys(items)) {
    const product = catalog.find(p => p.id === Number(id));
    const qty = Math.floor(Number(items[id]));
    if (!product || !(qty > 0) || qty > 99) continue;
    clean[product.id] = qty;
    total += product.price * qty;
  }

  if (total === 0) {
    return res.status(400).json({ error: "السلة فارغة" });
  }

  let discount = 0;
  let couponCode = null;
  const coupon = findCoupon(req.body.coupon);
  if (coupon) {
    discount = Math.round(total * coupon.percent) / 100;
    couponCode = coupon.code;
    total = total - discount;
  }

  const number = Date.now();
  db.prepare(
    "INSERT INTO orders (number,name,phone,address,items,total,status,date,coupon,discount,userId) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
  ).run(number,
      String(name).slice(0, 100),
      String(phone).slice(0, 30),
      String(address).slice(0, 300),
      JSON.stringify(clean), total, "جديد", new Date().toISOString(),
      couponCode, discount, req.user ? req.user.id : null);

  res.json({ ok: true, number, total, discount });
});

app.get("/api/orders", requireAdmin, (req, res) => res.json(readOrders()));

app.delete("/api/orders/:number", requireAdmin, (req, res) => {
  const info = db.prepare("DELETE FROM orders WHERE number = ?").run(Number(req.params.number));
  if (info.changes === 0) return res.status(404).json({ error: "الطلب غير موجود" });
  res.json({ ok: true });
});

app.delete("/api/orders", requireAdmin, (req, res) => {
  db.exec("DELETE FROM orders");
  res.json({ ok: true });
});

app.put("/api/orders/:number", requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: "حالة غير صحيحة" });
  }
  const info = db.prepare("UPDATE orders SET status = ? WHERE number = ?")
    .run(status, Number(req.params.number));
  if (info.changes === 0) return res.status(404).json({ error: "الطلب غير موجود" });
  res.json({ ok: true });
});

app.post("/api/track", (req, res) => {
  const num = Number(req.body.number);
  const phone = String(req.body.phone || "").replace(/\D/g, "");

  const o = db.prepare("SELECT * FROM orders WHERE number = ?").get(num);

  if (!o || phone.length < 8 || String(o.phone).replace(/\D/g, "") !== phone) {
    return res.status(404).json({ error: "لم يتم العثور على الطلب" });
  }

  res.json({ number: o.number, status: o.status, total: o.total, date: o.date });
});

app.get("/api/my-orders", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "سجّل الدخول أولاً" });

  const rows = db.prepare(
    "SELECT number,total,status,date,items,coupon,discount FROM orders WHERE userId = ? ORDER BY number DESC"
  ).all(req.user.id);

  res.json(rows.map(o => ({ ...o, items: JSON.parse(o.items) })));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("المتجر شغال على المنفذ " + PORT);
});