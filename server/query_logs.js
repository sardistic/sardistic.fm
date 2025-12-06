const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'analytics.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(err.message);
        return;
    }
});

const sql = `SELECT * FROM errors ORDER BY id DESC LIMIT 5`;

db.all(sql, [], (err, rows) => {
    if (err) {
        throw err;
    }
    console.log("--- RECENT ERRORS ---");
    rows.forEach((row) => {
        console.log(`[${row.timestamp}] ID: ${row.id}`);
        console.log(`Message: ${row.message}`);
        console.log(`Stack: ${row.stack}`);
        console.log("-----------------------");
    });
    db.close();
});
