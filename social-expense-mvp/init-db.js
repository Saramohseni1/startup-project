// init-db.js
const sqlite3 = require("sqlite3").verbose();

console.log("🚀 شروع ایجاد جداول دیتابیس...");

const db = new sqlite3.Database("data.db");

db.serialize(() => {
  // حذف جداول قبلی (اختیاری برای تست)
  db.run("DROP TABLE IF EXISTS expenses");
  db.run("DROP TABLE IF EXISTS members");
  db.run("DROP TABLE IF EXISTS groups");
  db.run("DROP TABLE IF EXISTS users");

  // جدول کاربران
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

  // جدول گروه‌ها
  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT
    )
  `);

  // جدول اعضای گروه
  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      name TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id)
    )
  `);

  // جدول هزینه‌ها
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      member_id INTEGER,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT DEFAULT (date('now')),
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    )
  `);

  // داده نمونه
  db.run(`INSERT INTO users (username, password) VALUES ('admin', '1234')`);
  db.run(`INSERT INTO groups (name, description) VALUES ('گروه دوستان', 'خرج‌های مشترک آخر هفته')`);
  db.run(`INSERT INTO members (group_id, name) VALUES (1, 'علی'), (1, 'مریم'), (1, 'سارا')`);
  db.run(`
    INSERT INTO expenses (group_id, member_id, amount, description)
    VALUES (1, 1, 120000, 'ناهار مشترک'),
          (1, 2, 85000, 'قهوه'),
          (1, 3, 150000, 'بنزین سفر')
  `);

  console.log("✅ init-db: جداول ساخته و داده نمونه درج شد (در صورت نبود).");
});

db.close();
