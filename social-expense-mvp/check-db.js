// check-db.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("data.db");

db.serialize(() => {
  db.each("SELECT id, username, created_at FROM users", (err, row) => {
    if (err) console.error(err);
    else console.log("USER:", row);
  });

  db.each("SELECT * FROM groups", (err, row) => {
    if (err) console.error(err);
    else console.log("GROUP:", row);
  });

  db.each("SELECT * FROM expenses", (err, row) => {
    if (err) console.error(err);
    else console.log("EXPENSE:", row);
  });
});

db.close();
