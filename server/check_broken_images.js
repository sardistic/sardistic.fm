const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'analytics.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

db.serialize(() => {
    db.get("SELECT COUNT(*) as count FROM scrobbles WHERE image_url LIKE '%archive.org%'", (err, row) => {
        if (err) console.error(err);
        else console.log(`Found ${row.count} scrobbles with 'archive.org' images.`);
    });

    db.all("SELECT image_url FROM scrobbles WHERE image_url LIKE '%archive.org%' LIMIT 5", (err, rows) => {
        if (err) console.error(err);
        else {
            console.log('Sample URLs:');
            rows.forEach(r => console.log(r.image_url));
        }
    });
});

setTimeout(() => db.close(), 2000);
