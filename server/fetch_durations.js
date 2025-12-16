const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const envPath = path.resolve(__dirname, '../.env');
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/"/g, ''); // Simple cleanup
            process.env[key] = val;
        }
    });
} catch (e) {
    console.error('Failed to read .env manually:', e);
}

const DB_PATH = path.resolve(__dirname, 'analytics.db');
const DURATIONS_PATH = path.resolve(__dirname, 'track_durations.json');
const LASTFM_API_KEY = 'f47585fe3a58dbdbbfd3ca36d4ccc5cd';
const LASTFM_USER = process.env.LASTFM_USER || 'coldhunter';

console.log('Using Hardcoded API Key');

const db = new sqlite3.Database(DB_PATH);

// Load existing durations to avoid re-fetching
let durationCache = {};
if (fs.existsSync(DURATIONS_PATH)) {
    try {
        durationCache = JSON.parse(fs.readFileSync(DURATIONS_PATH, 'utf8'));
        console.log(`Loaded ${Object.keys(durationCache).length} existing durations.`);
    } catch (e) {
        console.error('Error reading existing durations:', e);
    }
}

function getTopTracks() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT track, artist, COUNT(*) as count 
            FROM scrobbles 
            GROUP BY track, artist 
            ORDER BY count DESC
        `;
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchDuration(artist, track) {
    const url = 'http://ws.audioscrobbler.com/2.0/';
    try {
        const response = await axios.get(url, {
            params: {
                method: 'track.getinfo',
                api_key: LASTFM_API_KEY,
                artist: artist,
                track: track,
                autocorrect: 1,
                username: LASTFM_USER,
                format: 'json'
            },
            timeout: 5000
        });

        if (response.data.track && response.data.track.duration) {
            return parseInt(response.data.track.duration);
        }
        return 0;
    } catch (e) {
        // console.error(`Failed to fetch ${track}: ${e.message}`);
        return null; // Error
    }
}

async function run() {
    try {
        console.log('Fetching top tracks from DB...');
        const tracks = await getTopTracks();
        console.log(`Found ${tracks.length} unique tracks.`);

        // User requested ALL tracks.
        const targetTracks = tracks;
        let changed = false;
        let fetchedCount = 0;

        for (const t of targetTracks) {
            const key = `${t.track}|||${t.artist}`;

            // Skip if we already have a valid duration (> 0)
            if (durationCache[key]) {
                continue;
            }

            const duration = await fetchDuration(t.artist, t.track);

            if (duration !== null) {
                durationCache[key] = duration;
                changed = true;
                process.stdout.write(`\r[${++fetchedCount}] Fetched: ${t.track} (${duration}ms)           `);

                // Save periodically
                if (fetchedCount % 50 === 0) {
                    fs.writeFileSync(DURATIONS_PATH, JSON.stringify(durationCache, null, 2));
                }
            } else {
                process.stdout.write(`\r[${++fetchedCount}] Failed: ${t.track}           `);
            }

            // Rate limit: 4 requests per second max (Last.fm allows 5/s)
            await sleep(250);
        }

        if (changed) {
            fs.writeFileSync(DURATIONS_PATH, JSON.stringify(durationCache, null, 2));
            console.log(`\nSaved ${Object.keys(durationCache).length} durations to ${DURATIONS_PATH}`);
        } else {
            console.log('\nNo new durations fetched.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        db.close();
    }
}

run();
