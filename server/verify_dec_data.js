const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const fs = require('fs');
const isRailway = fs.existsSync('/data');
const dbPath = process.env.DB_PATH || (isRailway ? '/data/analytics.db' : path.resolve(__dirname, 'analytics.db'));
const db = new sqlite3.Database(dbPath);

console.log('Checking December 2025 scrobbles...');
// Check for any scrobbles after Dec 1st 2025
const decStart = new Date('2025-12-01T00:00:00Z').getTime() / 1000;

db.all("SELECT date, track, artist FROM scrobbles WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 5", [decStart], (err, rows) => {
    if (err) {
        console.error("Error:", err.message);
    } else {
        console.log(`Found ${rows.length} recent scrobbles.`);
        rows.forEach(r => console.log(`${r.date}: ${r.track} - ${r.artist}`));
    }
    db.close();
});
