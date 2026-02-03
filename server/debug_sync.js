const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });


const { getAllTracksSince } = require('./lastfm');

console.log('API Key Status:', process.env.LASTFM_API_KEY ? 'Present' : 'Missing');
console.log('User:', process.env.LASTFM_USER);

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
            // const since = row.last_sync_timestamp;
            const since = 1735689600; // Jan 1 2026
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
                console.error("Error fetching from Last.fm in debug script:");
                if (e.response) {
                    console.error("Status:", e.response.status);
                    console.error("Data:", JSON.stringify(e.response.data, null, 2));
                } else {
                    console.error(e.message);
                }
            }
        }
        db.close();
    });
}

check();
