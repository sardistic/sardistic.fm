const express = require('express');
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const Vibrant = require('node-vibrant');
const cron = require('node-cron');
const fs = require('fs');
const { syncScrobbles } = require('./sync');
const { generatePayload } = require('./regenerate_payload');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Setup
// Database Setup - Persistent Volume Logic (Railway)
const isRailway = fs.existsSync('/data');
const dbPath = process.env.DB_PATH || (isRailway ? '/data/analytics.db' : path.resolve(__dirname, 'analytics.db'));
console.log(`Using Database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        payload TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        stack TEXT,
        context TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        total_duration INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS mouse_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x INTEGER,
        y INTEGER,
        page TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS page_timing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page TEXT,
        duration INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Ensure dominant_color column exists in scrobbles
    db.run("ALTER TABLE scrobbles ADD COLUMN dominant_color TEXT", (err) => {
        // Ignore error if column already exists
    });
}

// Routes
app.get('/', (req, res) => {
    res.send('Analytics Server is running.');
});

// Track Event
app.post('/api/track', (req, res) => {
    const { type, payload } = req.body;
    if (!type) {
        return res.status(400).json({ error: 'Event type is required' });
    }

    const payloadStr = JSON.stringify(payload || {});
    const sql = `INSERT INTO events (type, payload) VALUES (?, ?)`;

    db.run(sql, [type, payloadStr], function (err) {
        if (err) {
            console.error('Error inserting event:', err.message);
            return res.status(500).json({ error: 'Failed to log event' });
        }
        res.status(201).json({ id: this.lastID, status: 'recorded' });
    });
});

// Log Error
app.post('/api/error', (req, res) => {
    const { message, stack, context } = req.body;

    const contextStr = JSON.stringify(context || {});
    const sql = `INSERT INTO errors (message, stack, context) VALUES (?, ?, ?)`;

    db.run(sql, [message, stack, contextStr], function (err) {
        if (err) {
            console.error('Error inserting error log:', err.message);
            return res.status(500).json({ error: 'Failed to log error' });
        }
        res.status(201).json({ id: this.lastID, status: 'logged' });
    });
});

// GET Events
app.get('/api/events', (req, res) => {
    const limit = req.query.limit || 100;
    db.all(`SELECT * FROM events ORDER BY timestamp DESC LIMIT ?`, [limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// GET Errors
app.get('/api/errors', (req, res) => {
    const limit = req.query.limit || 100;
    db.all(`SELECT * FROM errors ORDER BY timestamp DESC LIMIT ?`, [limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// GET Stats
app.get('/api/stats', (req, res) => {
    db.get(`SELECT 
        (SELECT COUNT(*) FROM events) as totalEvents,
        (SELECT COUNT(*) FROM errors) as totalErrors
    `, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

// POST Mouse Movement
app.post('/api/mouse', (req, res) => {
    const { x, y, page } = req.body;
    db.run(`INSERT INTO mouse_movements (x, y, page) VALUES (?, ?, ?)`, [x, y, page], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

// POST Page Timing
app.post('/api/timing', (req, res) => {
    const { page, duration } = req.body;
    db.run(`INSERT INTO page_timing (page, duration) VALUES (?, ?)`, [page, duration], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

// POST Session
app.post('/api/session', (req, res) => {
    const { session_id, end_time, total_duration } = req.body;
    if (end_time) {
        db.run(`UPDATE sessions SET end_time = ?, total_duration = ? WHERE session_id = ?`,
            [end_time, total_duration, session_id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ updated: true });
            });
    } else {
        db.run(`INSERT OR IGNORE INTO sessions (session_id) VALUES (?)`, [session_id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID });
        });
    }
});

// GET Analytics Summary
app.get('/api/analytics/summary', (req, res) => {
    const queries = {
        totalEvents: `SELECT COUNT(*) as count FROM events`,
        totalErrors: `SELECT COUNT(*) as count FROM errors`,
        avgPageTime: `SELECT AVG(duration) as avg FROM page_timing`,
        totalSessions: `SELECT COUNT(*) as count FROM sessions`,
        eventsByType: `SELECT type, COUNT(*) as count FROM events GROUP BY type`,
        topPages: `SELECT page, COUNT(*) as visits, AVG(duration) as avg_time FROM page_timing GROUP BY page ORDER BY visits DESC LIMIT 5`
    };

    const results = {};
    let completed = 0;
    const total = Object.keys(queries).length;

    Object.entries(queries).forEach(([key, query]) => {
        db.all(query, (err, rows) => {
            if (!err) results[key] = rows.length === 1 && rows[0].count !== undefined ? rows[0].count : rows;
            completed++;
            if (completed === total) res.json(results);
        });
    });
});

// GET Heatmap Data
app.get('/api/analytics/heatmap', (req, res) => {
    const page = req.query.page || null;
    const query = page
        ? `SELECT x, y, COUNT(*) as intensity FROM mouse_movements WHERE page = ? GROUP BY x, y`
        : `SELECT x, y, COUNT(*) as intensity FROM mouse_movements GROUP BY x, y`;

    db.all(query, page ? [page] : [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// GET Timeline
app.get('/api/analytics/timeline', (req, res) => {
    const hours = req.query.hours || 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    db.all(`SELECT type, timestamp FROM events WHERE timestamp > ? ORDER BY timestamp ASC`, [cutoff], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// --- Last.fm API Integration ---
// TODO: Replace with user credentials or use environment variables
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_USER = process.env.LASTFM_USER || 'coldhunter';

const LASTFM_BASE_URL = 'http://ws.audioscrobbler.com/2.0/';

// Helper to fetch from Last.fm
async function fetchLastFm(method, params) {
    if (LASTFM_API_KEY === 'YOUR_API_KEY_HERE') {
        throw new Error('MISSING_API_KEY');
    }
    try {
        const response = await axios.get(LASTFM_BASE_URL, {
            params: {
                method,
                api_key: LASTFM_API_KEY,
                user: LASTFM_USER,
                format: 'json',
                ...params
            },
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        console.error(`Last.fm API Error (${method}):`, error.message);
        throw error;
    }
}

// GET Now Playing
app.get('/api/now-playing', async (req, res) => {
    try {
        const data = await fetchLastFm('user.getrecenttracks', { limit: 1, extended: 1 });
        const tracks = data.recenttracks.track;

        if (!tracks || tracks.length === 0) {
            return res.json({ nowPlaying: null });
        }

        const track = tracks[0];
        const isPlaying = track['@attr'] && track['@attr'].nowplaying === 'true';

        // Get high-res image if available (extralarge is usually 300x300)
        const image = track.image.find(img => img.size === 'extralarge') || track.image[track.image.length - 1];

        res.json({
            nowPlaying: {
                isPlaying,
                name: track.name,
                artist: track.artist.name,
                album: track.album['#text'],
                image: image ? image['#text'] : null,
                url: track.url,
                date: track.date ? track.date['#text'] : 'Now',
                timestamp: track.date ? track.date.uts : null
            }
        });
    } catch (error) {
        if (error.message === 'MISSING_API_KEY') {
            // Return mock data for demo purposes if key is missing
            return res.json({
                nowPlaying: {
                    isPlaying: true, // Pretend playing
                    name: "Demo Track (Set API Key)",
                    artist: "Demo Artist",
                    album: "Demo Album",
                    image: null,
                    url: "#",
                    date: "Now"
                },
                isMock: true
            });
        }
        res.status(500).json({ error: 'Failed to fetch Last.fm data' });
    }
});

// Global Cache for Artist Images (to fix missing images in Top Artists)
const artistImageCache = {};
const LASTFM_PLACEHOLDER_STAR = 'https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png';

// GET Recent Scrobble Stats
app.get('/api/recent/:period', async (req, res) => {
    const { period } = req.params; // today, week, month

    // Last.fm doesn't have a direct "today" endpoint, we have to filter getRecentTracks by timestamp
    // or use user.getTopTracks with period param (which supports 7day, 1month, etc.)

    const now = Math.floor(Date.now() / 1000);
    let fromTime = 0;

    // Pagination settings
    // Today: can usually fit in one page (200 tracks = ~12 hours of non-stop listening, or 24h normal)
    // Week: Needs roughly 800-1000 tracks max.
    // Month: Needs 3000+. We'll cap at 1000 to keep it fast but fill the chart better.
    let pagesToFetch = 1;

    if (period === 'today') {
        // "Today" now means "Last 24 Hours" for the graph
        fromTime = now - (24 * 60 * 60);
        pagesToFetch = 1;
    } else if (period === 'week') {
        // Last 7 days
        fromTime = now - (7 * 24 * 60 * 60);
        pagesToFetch = 5; // 5 * 200 = 1000 tracks
    } else if (period === 'month') {
        // Last 30 days
        fromTime = now - (30 * 24 * 60 * 60);
        pagesToFetch = 5; // 5 * 200 = 1000 tracks (sample)
    } else {
        return res.status(400).json({ error: 'Invalid period' });
    }

    try {
        let tracks = [];
        let total = 0;

        // Parallel Fetch helper
        const fetchPage = (page) => fetchLastFm('user.getrecenttracks', {
            limit: 200,
            page: page,
            from: fromTime
        });

        // Create array of promises [1...pagesToFetch]
        const promises = Array.from({ length: pagesToFetch }, (_, i) => fetchPage(i + 1));

        const results = await Promise.all(promises);

        results.forEach(data => {
            if (data.recenttracks && data.recenttracks.track) {
                // Determine total from the first page (or any)
                if (!total && data.recenttracks['@attr']) {
                    total = data.recenttracks['@attr'].total;
                }

                const pageTracks = Array.isArray(data.recenttracks.track)
                    ? data.recenttracks.track
                    : [data.recenttracks.track];

                tracks.push(...pageTracks);

                // POPULATE CACHE from Recent Tracks (usually has good images)
                pageTracks.forEach(t => {
                    if (t.artist && t.artist['#text'] && t.image) {
                        const img = t.image.find(i => i.size === 'extralarge') ||
                            t.image.find(i => i.size === 'large') ||
                            t.image[t.image.length - 1];

                        const url = img ? img['#text'] : null;
                        // Only cache if valid and NOT the star placeholder (some recent tracks might have it too)
                        if (url && url !== '' && !url.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
                            artistImageCache[t.artist['#text']] = url;
                        }
                    }
                });
            }
        });

        // 1. Calculate Sparkline (from aggregated tracks)
        const sparkline = [];
        if (period === 'today') {
            // Change "Today" to "Last 24 Hours" rolling window for better accuracy across timezones
            // 0 = 24 hours ago, 23 = Current hour
            const hours = new Array(24).fill(0);
            const nowMs = Date.now();
            tracks.forEach(t => {
                if (t.date) {
                    const trackTime = parseInt(t.date.uts) * 1000;
                    const diffHours = Math.floor((nowMs - trackTime) / (1000 * 60 * 60));
                    if (diffHours >= 0 && diffHours < 24) {
                        hours[23 - diffHours]++;
                    }
                }
            });
            sparkline.push(...hours);
        } else if (period === 'week') {
            // Change "Week" to "Last 7 Days" rolling window
            // 0 = 7 days ago, 6 = Today
            const days = new Array(7).fill(0).map(() => ({ day: 0, night: 0 }));
            const nowMs = Date.now();
            tracks.forEach(t => {
                if (t.date) {
                    const trackTime = parseInt(t.date.uts) * 1000;
                    const diffDays = Math.floor((nowMs - trackTime) / (1000 * 60 * 60 * 24));
                    if (diffDays >= 0 && diffDays < 7) {
                        const dateObj = new Date(trackTime);
                        const hour = dateObj.getHours();
                        const isDay = hour >= 6 && hour < 18; // 6am - 6pm
                        const bucket = 6 - diffDays;

                        if (isDay) days[bucket].day++;
                        else days[bucket].night++;
                    }
                }
            });
            sparkline.push(...days);
        } else if (period === 'month') {
            // 30 days sparkline
            const days = new Array(30).fill(0).map(() => ({ day: 0, night: 0 }));
            const nowMs = Date.now();
            tracks.forEach(t => {
                if (t.date) {
                    const trackTime = parseInt(t.date.uts) * 1000;
                    const diffDays = Math.floor((nowMs - trackTime) / (1000 * 60 * 60 * 24));
                    if (diffDays >= 0 && diffDays < 30) {
                        const dateObj = new Date(trackTime);
                        const hour = dateObj.getHours();
                        const isDay = hour >= 6 && hour < 18;
                        const bucket = 29 - diffDays;

                        if (isDay) days[bucket].day++;
                        else days[bucket].night++;
                    }
                }
            });
            sparkline.push(...days);
        }

        // 2. Fetch Accurate Top Artists (Server-side Aggregation)
        let topArtists = [];

        if (period === 'today') {
            // For "Today", we must aggregate manually from the recent tracks fetch
            const artistCounts = {};
            // We can use the global cache directly now

            tracks.forEach(t => {
                const artist = t.artist['#text'];
                artistCounts[artist] = (artistCounts[artist] || 0) + 1;
            });

            topArtists = Object.entries(artistCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, count]) => ({
                    name,
                    count,
                    image: artistImageCache[name] || null
                }));

        } else {
            // For Week/Month, use the dedicated API which is accurate over the full period
            const periodParam = period === 'week' ? '7day' : '1month';
            const topData = await fetchLastFm('user.gettopartists', { period: periodParam, limit: 3 });

            if (topData.topartists && topData.topartists.artist) {
                // Ensure array (single result edge case)
                const artists = Array.isArray(topData.topartists.artist)
                    ? topData.topartists.artist
                    : [topData.topartists.artist];

                topArtists = artists.map(a => {
                    let image = null;
                    if (a.image) {
                        const img = a.image.find(i => i.size === 'extralarge') ||
                            a.image.find(i => i.size === 'large') ||
                            a.image[a.image.length - 1];
                        if (img && img['#text']) image = img['#text'];
                    }

                    // CHECK CACHE if image is missing or is the placeholder star
                    if ((!image || image === '' || image.includes('2a96cbd8b46e442fc41c2b86b821562f')) && artistImageCache[a.name]) {
                        console.log(`[Cache Hit] Using cached image for ${a.name}`);
                        image = artistImageCache[a.name];
                    }

                    return {
                        name: a.name,
                        count: parseInt(a.playcount),
                        image: image
                    };
                });
            }
        }

        // 3. Fetch Top Tracks (Tasteful List)
        let topTracks = [];

        if (period === 'today') {
            // Calculate actual Top Tracks by counting occurrences
            const trackCounts = {};
            tracks.forEach(t => {
                const key = `${t.name}|||${t.artist['#text']}`;
                trackCounts[key] = (trackCounts[key] || 0) + 1;
            });

            topTracks = Object.entries(trackCounts)
                .map(([key, count]) => {
                    const [name, artist] = key.split('|||');
                    return { name, artist, count };
                })
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);
        } else {
            // For Week/Month, fetch actual top tracks
            const periodParam = period === 'week' ? '7day' : '1month';
            const topTracksData = await fetchLastFm('user.gettoptracks', { period: periodParam, limit: 3 });

            if (topTracksData.toptracks && topTracksData.toptracks.track) {
                const tList = Array.isArray(topTracksData.toptracks.track)
                    ? topTracksData.toptracks.track
                    : [topTracksData.toptracks.track];

                topTracks = tList.map(t => ({
                    name: t.name,
                    artist: (t.artist && t.artist.name) ? t.artist.name : t.artist
                }));
            }
        }

        // 4. Fetch Top Albums (Limit 1 for the cycling view)
        let topAlbums = [];

        if (period === 'today') {
            const albumCounts = {};
            const albumImages = {};

            tracks.forEach(t => {
                if (t.album && t.album['#text']) {
                    const name = t.album['#text'];
                    albumCounts[name] = (albumCounts[name] || 0) + 1;

                    // Cache image
                    if (!albumImages[name] && t.image) {
                        const img = t.image.find(i => i.size === 'extralarge') ||
                            t.image.find(i => i.size === 'large') ||
                            t.image[t.image.length - 1];
                        if (img && img['#text']) albumImages[name] = img['#text'];
                    }
                }
            });

            topAlbums = Object.entries(albumCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 1)
                .map(([name, count]) => ({
                    name,
                    count,
                    image: albumImages[name] || null
                }));
        } else {
            const periodParam = period === 'week' ? '7day' : '1month';
            const topAlbumsData = await fetchLastFm('user.gettopalbums', { period: periodParam, limit: 1 });

            if (topAlbumsData.topalbums && topAlbumsData.topalbums.album) {
                const aList = Array.isArray(topAlbumsData.topalbums.album)
                    ? topAlbumsData.topalbums.album
                    : [topAlbumsData.topalbums.album];

                topAlbums = aList.map(a => {
                    let image = null;
                    if (a.image) {
                        const img = a.image.find(i => i.size === 'extralarge') ||
                            a.image.find(i => i.size === 'large') ||
                            a.image[a.image.length - 1];
                        if (img && img['#text']) image = img['#text'];
                    }

                    return {
                        name: a.name,
                        artist: (a.artist && a.artist.name) ? a.artist.name : a.artist,
                        count: parseInt(a.playcount),
                        image
                    };
                });
            }
        }

        res.json({
            period,
            totalScrobbles: total, // Accurate total from API header
            fetchedCount: tracks.length,
            topArtists: topArtists,
            topTracks: topTracks,
            recentTracks: tracks.slice(0, 3).map(t => ({ name: t.name, artist: (t.artist && t.artist['#text']) ? t.artist['#text'] : t.artist })), // ADDED RAW RECENT TRACKS
            topAlbums: topAlbums,
            sparkline: sparkline
        });

    } catch (error) {
        console.error("Stats API Error:", error);
        console.error("Stack:", error.stack);

        if (error.message === 'MISSING_API_KEY') {
            // Mock data
            return res.json({
                period,
                totalScrobbles: period === 'today' ? 42 : (period === 'week' ? 350 : 1200),
                fetchedCount: 20,
                topArtists: [
                    {
                        name: "Mock Artist A",
                        count: 15,
                        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80" // Microphone/Singer
                    },
                    {
                        name: "Mock Artist B",
                        count: 10,
                        image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=300&q=80" // Guitarist
                    }
                ],
                sparkline: period === 'today'
                    ? [0, 0, 0, 2, 5, 10, 8, 4, 2, 0, 0, 0, 0, 0, 0, 0, 0, 5, 8, 12, 10, 4, 0, 0]
                    : [40, 52, 35, 60, 45, 80, 55],
                isMock: true
            });
        }
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

const { exec } = require('child_process');

// GET YouTube ID
app.get('/api/youtube/search', (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Query required' });

    // Sanitize query to prevent shell injection/syntax errors (remove quotes)
    const sanitizedQuery = query.replace(/["'$`]/g, '');

    // Use yt-dlp to find the video ID
    // Command: yt-dlp "ytsearch1:QUERY" --get-id --no-warnings --no-playlist
    const cmd = `yt-dlp "ytsearch1:${sanitizedQuery}" --print id --no-warnings --no-playlist --match-filter "!is_live"`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`yt-dlp error: ${error.message}`);
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({
                error: 'Search failed',
                details: error.message,
                stderr: stderr
            });
        }

        const videoId = stdout.trim();
        if (!videoId) {
            return res.json({ videoId: null });
        }

        res.json({ videoId });
    });
});

// --- Last.fm Sync Endpoints ---
// Removed requires that are now at the top


// Manual sync endpoint
app.post('/api/sync/manual', async (req, res) => {
    try {
        console.log('Manual sync triggered');
        const result = await syncScrobbles();

        // Always regenerate payload on manual sync to ensure freshness
        console.log('Regenerating payload...');
        const payload = await generatePayload(db);
        cachedPayload = payload;

        // Persist to disk
        fs.writeFileSync(PAYLOAD_PATH, JSON.stringify(payload));
        console.log('Dashboard payload updated and cached.');

        res.json({
            success: true,
            message: `Synced ${result.synced} new scrobbles`,
            ...result
        });
    } catch (error) {
        console.error('Sync failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Sync status endpoint
app.get('/api/sync/status', (req, res) => {
    db.get('SELECT * FROM sync_state WHERE id = 1', (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(row || { last_sync_timestamp: 0, total_scrobbles: 0 });
    });
});

// In-memory cache for dashboard payload
let cachedPayload = null;
const PAYLOAD_PATH = isRailway ? '/data/dashboard_payload.json' : path.resolve(__dirname, '../src/data/dashboard_payload.json');

// Initialize cache from disk on start
try {
    if (fs.existsSync(PAYLOAD_PATH)) {
        console.log(`Loading initial payload from disk cache (${PAYLOAD_PATH})...`);
        cachedPayload = JSON.parse(fs.readFileSync(PAYLOAD_PATH, 'utf8'));
    }
} catch (e) {
    console.error('Failed to load initial payload cache:', e.message);
}

// GET Full Dashboard Data (Dynamic)
app.get('/api/dashboard/data', async (req, res) => {
    try {
        // Serve from memory cache if available
        if (cachedPayload) {
            return res.json(cachedPayload);
        }

        // Fallback: Generate fresh if no cache
        console.log('Cache miss. Generating payload...');
        const payload = await generatePayload(db);
        cachedPayload = payload; // Update cache
        res.json(payload);
    } catch (error) {
        console.error('Failed to generate dashboard payload:', error);
        res.status(500).json({ error: 'Failed to generate data' });
    }
});

// Get scrobbles endpoint
app.get('/api/scrobbles', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    db.all(
        'SELECT * FROM scrobbles ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [limit, offset],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ scrobbles: rows, limit, offset });
        }
    );
});

// Get most played track per year (for year card album art)
// Get most played track per year (for year card album art)
app.get('/api/years/top-tracks', (req, res) => {
    // First, get all tracks with their play counts per year
    const query = `
        WITH YearlyTrackCounts AS (
            SELECT 
                strftime('%Y', datetime(timestamp, 'unixepoch')) as year,
                track,
                artist,
                album,
                image_url,
                dominant_color,
                COUNT(*) as play_count
            FROM scrobbles
            WHERE timestamp IS NOT NULL
            GROUP BY year, track, artist
        ),
        MaxCountsPerYear AS (
            SELECT 
                year,
                MAX(play_count) as max_count
            FROM YearlyTrackCounts
            GROUP BY year
        )
        SELECT 
            ytc.year,
            ytc.track,
            ytc.artist,
            ytc.album,
            ytc.image_url,
            ytc.dominant_color,
            ytc.play_count
        FROM YearlyTrackCounts ytc
        INNER JOIN MaxCountsPerYear mcy 
            ON ytc.year = mcy.year AND ytc.play_count = mcy.max_count
        ORDER BY ytc.year DESC
    `;

    db.all(query, async (err, rows) => {
        if (err) {
            console.error('Error fetching top tracks by year:', err.message);
            return res.status(500).json({ error: err.message });
        }

        const topTracksByYear = {};

        // Process each row to ensure we have album art
        const promises = rows.map(async (row) => {
            // Check if we've already processed this year (in case of ties)
            if (topTracksByYear[row.year]) return;

            let imageUrl = row.image_url;
            let dominantColor = row.dominant_color;

            // If image is missing, fetch from Last.fm
            if (!imageUrl) {
                try {
                    // console.log(`Fetching art for ${row.track} by ${row.artist}...`);
                    const trackInfo = await fetchLastFm('track.getinfo', {
                        artist: row.artist,
                        track: row.track,
                        autocorrect: 1
                    });

                    if (trackInfo.track && trackInfo.track.album && trackInfo.track.album.image) {
                        const img = trackInfo.track.album.image.find(i => i.size === 'extralarge') ||
                            trackInfo.track.album.image.find(i => i.size === 'large') ||
                            trackInfo.track.album.image[trackInfo.track.album.image.length - 1];

                        if (img && img['#text']) {
                            imageUrl = img['#text'];

                            // Update database so we don't fetch again
                            const updateSql = `UPDATE scrobbles SET image_url = ? WHERE track = ? AND artist = ?`;
                            db.run(updateSql, [imageUrl, row.track, row.artist], (updateErr) => {
                                if (updateErr) console.error('Failed to update DB with new image:', updateErr.message);
                            });
                        }
                    }
                } catch (fetchErr) {
                    // console.error(`Failed to fetch Last.fm art for ${row.track}:`, fetchErr.message);
                    // Fail silently and return null image
                }
            }

            // 2. If we have an image but NO color, extract it
            if (imageUrl && !dominantColor) {
                try {
                    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(response.data);
                    const palette = await Vibrant.from(buffer).getPalette();

                    const swatch = palette.Vibrant || palette.LightVibrant || palette.DarkVibrant || palette.Muted;
                    if (swatch) {
                        dominantColor = swatch.hex;
                        const updateColorSql = `UPDATE scrobbles SET dominant_color = ? WHERE image_url = ?`;
                        db.run(updateColorSql, [dominantColor, imageUrl]);
                    }
                } catch (colorErr) {
                    dominantColor = '#00ffcc';
                }
            }

            topTracksByYear[row.year] = {
                track: row.track,
                artist: row.artist,
                album: row.album,
                imageUrl: imageUrl || null,
                playCount: row.play_count,
                dominantColor: dominantColor || '#00ffcc'
            };
        });

        await Promise.all(promises);

        res.json(topTracksByYear);
    });
});


// GET Lyrics
// GET Lyrics
app.get('/api/lyrics', async (req, res) => {
    const { artist, track } = req.query;
    if (!artist || !track) {
        return res.status(400).json({ error: 'Artist and track are required' });
    }

    // Helper to clean artist name (e.g., "The Chainsmokers, Beau Nox" -> "The Chainsmokers")
    const cleanArtist = (name) => {
        return name.split(/,|&|\sft\.|\sfeat\./i)[0].trim();
    };

    const fetchLrclib = async (a, t) => {
        try {
            const response = await axios.get('https://lrclib.net/api/get', {
                params: {
                    artist_name: a,
                    track_name: t
                },
                timeout: 5000
            });
            // Prefer synced, then plain
            if (response.data) {
                return response.data.syncedLyrics || response.data.plainLyrics;
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    const fetchOvh = async (a, t) => {
        try {
            const response = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(a)}/${encodeURIComponent(t)}`, {
                timeout: 5000
            });
            return response.data.lyrics;
        } catch (e) {
            return null;
        }
    };

    try {
        console.log(`Fetching lyrics for ${artist} - ${track}`);

        let lyrics = null;

        // 1. Try Lrclib (Best quality)
        lyrics = await fetchLrclib(artist, track);
        if (!lyrics) {
            const cleaned = cleanArtist(artist);
            if (cleaned !== artist) {
                console.log(`Lrclib retry with: ${cleaned}`);
                lyrics = await fetchLrclib(cleaned, track);
            }
        }

        // 2. Fallback to Lyrics.ovh
        if (!lyrics) {
            console.log('Falling back to Lyrics.ovh...');
            lyrics = await fetchOvh(artist, track);
            if (!lyrics) {
                const cleaned = cleanArtist(artist);
                if (cleaned !== artist) {
                    console.log(`Lyrics.ovh retry with: ${cleaned}`);
                    lyrics = await fetchOvh(cleaned, track);
                }
            }
        }

        if (lyrics) {
            res.json({ lyrics });
        } else {
            // Return null instead of 404 to avoid console errors
            res.json({ lyrics: null, message: 'Lyrics not found' });
        }
    } catch (error) {
        console.error('Error fetching lyrics:', error.message);
        res.json({ lyrics: null, error: 'Failed to fetch lyrics' });
    }
});

// Schedule Auto-Sync (Every 10 minutes)
cron.schedule('*/10 * * * *', async () => {
    console.log('[Cron] Starting scheduled sync...');
    try {
        const result = await syncScrobbles();
        if (result.synced > 0) {
            console.log(`[Cron] Synced ${result.synced} new scrobbles. Regenerating payload...`);
            // Regenerate the dashboard payload
            const payload = await generatePayload(db);

            // Update cache
            cachedPayload = payload;

            // Persist to disk
            fs.writeFileSync(PAYLOAD_PATH, JSON.stringify(payload));
            console.log('[Cron] Dashboard payload updated and cached.');
        } else {
            console.log('[Cron] No new scrobbles found.');
        }
    } catch (error) {
        console.error('[Cron] Sync failed:', error.message);
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
