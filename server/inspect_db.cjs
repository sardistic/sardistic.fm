const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'analytics.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log('Tables:', tables);

    // Check scrobbles columns
    db.all("PRAGMA table_info(scrobbles)", [], (err, cols) => {
        if (err) console.error(err);
        else console.log('Scrobbles Columns:', cols.map(c => c.name));
    });
});
