const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { getAllTracksSince } = require('./lastfm');

const dbPath = path.resolve(__dirname, 'analytics.db');
const db = new sqlite3.Database(dbPath);

async function check() {
    db.get("SELECT * FROM sync_state", async (err, row) => {
        if (err) {
            console.error("Error reading sync_state:", err.message);
            return;
        }
        console.log('Current Sync State:', row);

        if (row) {
            const since = row.last_sync_timestamp;
            console.log(`Checking Last.fm for tracks since: ${since} (${new Date(since * 1000).toISOString()})`);

            try {
                // Fetch just one page to see if anything comes back
                const tracks = await getAllTracksSince(since);
                console.log(`Last.fm returned ${tracks.length} tracks.`);
                if (tracks.length > 0) {
                    console.log('First track:', tracks[0]);
                    console.log('Last track:', tracks[tracks.length - 1]);
                }
            } catch (e) {
                console.error("Error fetching from Last.fm in debug script:", e);
            }
        }
        db.close();
    });
}

check();
