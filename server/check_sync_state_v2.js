const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'analytics.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

db.get("SELECT * FROM sync_state", (err, row) => {
    if (err) console.error("Error reading sync_state:", err.message);
    else console.log('Sync State:', row);
});

setTimeout(() => db.close(), 1000);
