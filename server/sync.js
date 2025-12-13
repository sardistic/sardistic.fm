const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { getAllTracksSince } = require('./lastfm');

const dbPath = path.resolve(__dirname, 'analytics.db');
const db = new sqlite3.Database(dbPath);

/**
 * Sync scrobbles from Last.fm to database
 * @param {number} since - Unix timestamp to sync from (optional)
 */
async function syncScrobbles(since = null) {
    try {
        // Get last sync timestamp from database if not provided
        if (!since) {
            const row = await new Promise((resolve, reject) => {
                db.get('SELECT last_sync_timestamp FROM sync_state WHERE id = 1', (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            since = row ? row.last_sync_timestamp : 0;
        }

        console.log(`Starting sync from timestamp: ${since} (${new Date(since * 1000).toISOString()})`);

        // Fetch all tracks from Last.fm
        const tracks = await getAllTracksSince(since);

        if (tracks.length === 0) {
            console.log('No new scrobbles to sync');
            return { synced: 0, total: 0 };
        }

        console.log(`Fetched ${tracks.length} tracks from Last.fm, inserting into database...`);

        // Insert tracks into database
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO scrobbles (artist, track, album, timestamp, date, image_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        let inserted = 0;
        let skipped = 0;

        for (const track of tracks) {
            await new Promise((resolve, reject) => {
                stmt.run(
                    track.artist,
                    track.track,
                    track.album,
                    track.timestamp,
                    track.date,
                    track.image,
                    function (err) {
                        if (err) {
                            if (!err.message.includes('UNIQUE constraint')) {
                                console.error('Error inserting track:', err.message);
                            }
                            skipped++;
                        } else if (this.changes > 0) {
                            inserted++;
                        } else {
                            skipped++;
                        }
                        resolve();
                    }
                );
            });
        }

        stmt.finalize();

        // Update sync state
        const latestTimestamp = Math.max(...tracks.map(t => t.timestamp));
        const latestDate = new Date(latestTimestamp * 1000).toISOString();

        await new Promise((resolve, reject) => {
            db.run(`
                UPDATE sync_state 
                SET last_sync_timestamp = ?, 
                    last_sync_date = ?,
                    total_scrobbles = (SELECT COUNT(*) FROM scrobbles)
                WHERE id = 1
            `, [latestTimestamp, latestDate], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log(`✓ Sync complete! Inserted: ${inserted}, Skipped: ${skipped}`);

        return { synced: inserted, total: tracks.length, skipped };
    } catch (error) {
        console.error('Sync error:', error);
        throw error;
    }
}

module.exports = { syncScrobbles };
