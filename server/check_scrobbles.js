const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'analytics.db');
const db = new sqlite3.Database(dbPath);

console.log('Querying one row...');
db.get("SELECT * FROM scrobbles LIMIT 1", (err, row) => {
    if (err) {
        console.error("Error:", err.message);
    } else {
        console.log('Sample Row:', row);
        console.log('Date type:', typeof row.date);
        console.log('Timestamp type:', typeof row.timestamp);
    }
    db.close();
});
