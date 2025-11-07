// server.js (اصلاح‌شده)
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// مسیر فایل دیتابیس
const dbPath = path.join(__dirname, "data.db");

// اگر دیتابیس وجود نداشته باشه، پیغام بدیم و سرور رو اجرا نکنیم
if (!fs.existsSync(dbPath)) {
  console.error("❌ دیتابیس وجود ندارد. لطفاً ابتدا init-db.js را اجرا کن:\n   node init-db.js");
  process.exit(1);
}

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// اتصال به دیتابیس
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ خطا در اتصال به دیتابیس:", err.message);
  else console.log("✅ اتصال موفق به دیتابیس!");
});

/*
  ------------------------
  Routes / APIs
  ------------------------
  ترتیب: auth -> expense -> groups/members -> settlement -> utilities
*/

// ------------- Auth -------------
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send("نام کاربری و رمز الزامی است.");

  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], (err) => {
    if (err) {
      console.error("register error:", err.message);
      return res.status(400).send("نام کاربری تکراری یا خطا در ثبت.");
    }
    res.redirect("/");
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send("نام کاربری و رمز الزامی است.");

  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
    if (err) {
      console.error("login error:", err.message);
      return res.status(500).send("خطا در ورود.");
    }
    if (!user) return res.status(401).send("نام کاربری یا رمز اشتباه است.");
    // برای MVP ساده: ریدایرکت به داشبورد
    res.redirect("/dashboard.html");
  });
});

app.get("/logout", (req, res) => {
  res.redirect("/");
});

// ------------- Expenses -------------
app.post("/add-expense", (req, res) => {
  const { category, amount, note } = req.body;
  if (!category || !amount) return res.status(400).send("دسته‌بندی و مبلغ الزامی است.");

  // مقدار member_id و group_id به صورت نمونه 1 قرار داده شده؛ در فاز بعدی باید از session/کاربر واقعی استفاده شود
  db.run(
    "INSERT INTO expenses (group_id, member_id, amount, description, date) VALUES (1, 1, ?, ?, date('now'))",
    [amount, note || category],
    function (err) {
      if (err) {
        console.error("❌ خطا در افزودن هزینه:", err.message);
        return res.status(500).send("خطا در ذخیره هزینه.");
      }
      return res.status(200).send("✅ هزینه با موفقیت ذخیره شد.");
    }
  );
});

// سازگاری: endpoint قدیمی (تا کدهای فعلی شکسته نشه)
app.get("/get-expenses", (req, res) => {
  db.all("SELECT * FROM expenses ORDER BY date DESC", (err, rows) => {
    if (err) {
      console.error("❌ خطا در دریافت داده‌ها:", err.message);
      return res.status(500).send("خطا در دریافت اطلاعات.");
    }
    res.json(rows);
  });
});

// جدید: API استاندارد برای داشبورد
app.get("/api/expenses", (req, res) => {
  const sql = `
    SELECT e.id, e.amount, e.description, e.date, g.name AS group_name, e.member_id
    FROM expenses e
    LEFT JOIN groups g ON e.group_id = g.id
    ORDER BY e.date DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("❌ خطا در دریافت داده‌ها:", err.message);
      return res.status(500).json({ error: "خطا در دریافت اطلاعات" });
    }
    res.json(rows);
  });
});

// ------------- Groups & Members -------------
app.get("/api/groups", (req, res) => {
  db.all("SELECT * FROM groups ORDER BY id", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/groups", (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "نام گروه لازم است." });
  db.run("INSERT INTO groups (name, description) VALUES (?, ?)", [name, description || ""], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, description });
  });
});

app.get("/api/groups/:id/members", (req, res) => {
  const groupId = req.params.id;
  db.all("SELECT * FROM members WHERE group_id = ? ORDER BY id", [groupId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/members", (req, res) => {
  const { group_id, name } = req.body;
  if (!group_id || !name) return res.status(400).json({ error: "گروه و نام عضو لازم است." });
  db.run("INSERT INTO members (group_id, name) VALUES (?, ?)", [group_id, name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, group_id, name });
  });
});

// ------------- Settlement APIs -------------
// API عمومی تسویه برای داشبورد (با جزییات اسم اعضا و پرداخت‌ها)
app.get("/api/groups/:id/settlement", (req, res) => {
  const groupId = req.params.id;

  const query = `
    SELECT m.id AS member_id, m.name,
           COALESCE(SUM(e.amount), 0) AS total
    FROM members m
    LEFT JOIN expenses e ON m.id = e.member_id AND e.group_id = ?
    WHERE m.group_id = ?
    GROUP BY m.id
  `;

  db.all(query, [groupId, groupId], (err, rows) => {
    if (err) {
      console.error("❌ خطا در دریافت داده‌های تسویه:", err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!rows || rows.length === 0) {
      return res.json({ message: "هیچ عضو یا هزینه‌ای برای این گروه وجود ندارد." });
    }

    const totalAll = rows.reduce((s, r) => s + Number(r.total), 0);
    const share = totalAll / rows.length;

    const members = rows.map((r) => ({
      member_id: r.member_id,
      name: r.name,
      paid: Number(r.total),
      balance: Math.round(Number(r.total) - share),
    }));

    res.json({
      total: Math.round(totalAll),
      share: Math.round(share),
      members,
    });
  });
});

// سازگاری: endpoint ساده‌تر (برای کدهای قدیمی که /settlement/:id صدا می‌زدند)
app.get("/settlement/:groupId", (req, res) => {
  const groupId = req.params.groupId;
  db.all("SELECT member_id, SUM(amount) as total FROM expenses WHERE group_id = ? GROUP BY member_id", [groupId], (err, rows) => {
    if (err) {
      console.error("❌ خطا در محاسبه تسویه:", err.message);
      return res.status(500).send("خطا در محاسبه تسویه.");
    }
    if (!rows || rows.length === 0) return res.json({ message: "هیچ هزینه‌ای برای این گروه ثبت نشده." });

    const totalSum = rows.reduce((sum, r) => sum + r.total, 0);
    const average = totalSum / rows.length;
    const result = rows.map((r) => ({
      member_id: r.member_id,
      paid: r.total,
      balance: Math.round(r.total - average),
    }));
    res.json({ average: Math.round(average), members: result });
  });
});

// ------------- Start server -------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
