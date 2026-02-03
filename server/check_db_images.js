const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.resolve(__dirname, 'analytics.db');
const db = new sqlite3.Database(DB_PATH);

db.all("SELECT timestamp, artist, album, track, image_url FROM scrobbles WHERE timestamp > 1767225600 LIMIT 20", [], (err, rows) => { // 2026-01-01 roughly
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Found ${rows.length} sample scrobbles for 2026.`);
    rows.forEach(r => {
        const date = new Date(r.timestamp * 1000).toISOString();
        console.log(`[${date}] ${r.artist} - ${r.track} (Album: ${r.album})`);
        console.log(`   Image URL: ${r.image_url || 'NULL/EMPTY'}`);
    });
});
