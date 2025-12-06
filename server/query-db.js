const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'analytics.db');
const db = new sqlite3.Database(dbPath);

console.log('=== ANALYTICS DATABASE REPORT ===\n');

// Get total counts
db.get(`SELECT 
    (SELECT COUNT(*) FROM events) as totalEvents,
    (SELECT COUNT(*) FROM errors) as totalErrors
`, (err, stats) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log(`Total Events: ${stats.totalEvents}`);
    console.log(`Total Errors: ${stats.totalErrors}\n`);
});

// Get recent events
db.all(`SELECT * FROM events ORDER BY timestamp DESC LIMIT 10`, (err, events) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('=== RECENT EVENTS ===');
    events.forEach((event, i) => {
        console.log(`\n[${i + 1}] ${event.type} (ID: ${event.id})`);
        console.log(`    Time: ${event.timestamp}`);
        console.log(`    Payload: ${event.payload}`);
    });
});

// Get recent errors
db.all(`SELECT * FROM errors ORDER BY timestamp DESC LIMIT 5`, (err, errors) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('\n\n=== RECENT ERRORS ===');
    if (errors.length === 0) {
        console.log('No errors logged (that\'s good!)');
    } else {
        errors.forEach((error, i) => {
            console.log(`\n[${i + 1}] ${error.message} (ID: ${error.id})`);
            console.log(`    Time: ${error.timestamp}`);
            console.log(`    Stack: ${error.stack?.substring(0, 100)}...`);
        });
    }

    db.close();
});
