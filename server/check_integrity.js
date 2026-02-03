const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'analytics.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('CRITICAL: Could not open database:', err.message);
        process.exit(1);
    }
});

db.get("PRAGMA integrity_check;", (err, row) => {
    if (err) {
        console.error('Integrity Check Failed:', err.message);
    } else {
        console.log('Integrity Check Result:', row);
    }
});

db.get("SELECT COUNT(*) as count FROM scrobbles", (err, row) => {
    if (err) {
        console.error('Count Query Failed:', err.message);
    } else {
        console.log('Scrobble Count:', row.count);
    }
    db.close();
});
