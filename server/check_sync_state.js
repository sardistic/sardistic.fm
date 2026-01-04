const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'analytics.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking sync state...');
db.get("SELECT * FROM sync_state", (err, row) => {
    if (err) console.error("Error reading sync_state:", err.message);
    else console.log('Sync State:', row);
});

db.get("SELECT * FROM scrobbles ORDER BY timestamp DESC LIMIT 1", (err, row) => {
    if (err) console.error("Error reading latest scrobble:", err.message);
    else {
        const date = new Date(row.timestamp * 1000);
        console.log('Latest Scrobble:', {
            track: row.track,
            artist: row.artist,
            timestamp: row.timestamp,
            date: date.toISOString()
        });
    }
});

setTimeout(() => db.close(), 1000);
