const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

// Database path
// Database path
const isRailway = fs.existsSync('/data');
const dbPath = process.env.DB_PATH || (isRailway ? '/data/analytics.db' : path.resolve(__dirname, 'analytics.db'));
const db = new sqlite3.Database(dbPath);

// Path to CSV file (two levels up from server directory)
const csvPath = path.resolve(__dirname, '../../recenttracks-coldhunter-1764728415.csv');

console.log('Starting migration...');
console.log('Database:', dbPath);
console.log('CSV File:', csvPath);

// Run schema
const schema = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf8');

db.serialize(() => {
    // Execute schema
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error creating schema:', err);
            process.exit(1);
        }
        console.log('✓ Schema created');
    });

    // Prepare insert statement
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO scrobbles (artist, track, album, timestamp, date, image_url)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    let skipped = 0;
    let latestTimestamp = 0;

    // Read and import CSV
    fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
            const timestamp = parseInt(row.uts);
            if (!timestamp || isNaN(timestamp)) {
                skipped++;
                return;
            }

            stmt.run(
                row.artist || 'Unknown Artist',
                row.track || 'Unknown Track',
                row.album || null,
                timestamp,
                row.utc_time,
                null, // No image URL in CSV
                function (err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint')) {
                            skipped++;
                        } else {
                            console.error('Error inserting scrobble:', err.message);
                        }
                    } else if (this.changes > 0) {
                        inserted++;
                        if (timestamp > latestTimestamp) {
                            latestTimestamp = timestamp;
                        }

                        // Progress indicator
                        if (inserted % 10000 === 0) {
                            console.log(`  Imported ${inserted} scrobbles...`);
                        }
                    } else {
                        skipped++;
                    }
                }
            );
        })
        .on('end', () => {
            stmt.finalize((err) => {
                if (err) {
                    console.error('Error finalizing statement:', err);
                    process.exit(1);
                }

                const latestDate = new Date(latestTimestamp * 1000).toISOString();

                // Update sync state
                db.run(`
                    UPDATE sync_state 
                    SET last_sync_timestamp = ?, 
                        last_sync_date = ?,
                        total_scrobbles = (SELECT COUNT(*) FROM scrobbles)
                    WHERE id = 1
                `, [latestTimestamp, latestDate], (err) => {
                    if (err) {
                        console.error('Error updating sync state:', err);
                    }

                    // Get final count
                    db.get('SELECT COUNT(*) as count FROM scrobbles', (err, row) => {
                        if (err) {
                            console.error('Error counting scrobbles:', err);
                        } else {
                            console.log(`\n✓ Migration complete!`);
                            console.log(`  - Total scrobbles in DB: ${row.count}`);
                            console.log(`  - Newly inserted: ${inserted}`);
                            console.log(`  - Skipped (duplicates/invalid): ${skipped}`);
                            console.log(`  - Last sync timestamp: ${latestTimestamp} (${latestDate})`);
                        }

                        db.close();
                        process.exit(0);
                    });
                });
            });
        })
        .on('error', (err) => {
            console.error('Error reading CSV:', err);
            process.exit(1);
        });
});
