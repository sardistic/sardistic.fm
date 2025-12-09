const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Setup
const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'analytics.db');
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
        db.run(`INSERT INTO sessions (session_id) VALUES (?)`, [session_id], function (err) {
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

// Start Server
app.listen(PORT, () => {
    console.log(`PORT Env: ${process.env.PORT}`);
    console.log(`Server running on http://localhost:${PORT}`);
});

// --- Last.fm Integration ---
const axios = require('axios');

// TODO: Replace with user credentials or use environment variables
const LASTFM_API_KEY = process.env.LASTFM_API_KEY || 'dbcaf1bb203839cba225f01cfc0df0f9';
const LASTFM_USER = process.env.LASTFM_USER || 'coldhunter'; // Defaulting to username found in paths if specific one not provided, or can simply use placeholder

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

// GET Recent Scrobble Stats
app.get('/api/recent/:period', async (req, res) => {
    const { period } = req.params; // today, week, month

    // Last.fm doesn't have a direct "today" endpoint, we have to filter getRecentTracks by timestamp
    // or use user.getTopTracks with period param (which supports 7day, 1month, etc.)

    // Mapping our periods to Last.fm periods or logic
    let apiMethod = 'user.getrecenttracks';
    let apiParams = { limit: 200 }; // Fetch a bunch to aggregate

    const now = Math.floor(Date.now() / 1000);
    let fromTime = 0;

    if (period === 'today') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        fromTime = Math.floor(startOfDay.getTime() / 1000);
        apiParams.from = fromTime;
    } else if (period === 'week') {
        // Last 7 days
        fromTime = now - (7 * 24 * 60 * 60);
        apiParams.from = fromTime;
    } else if (period === 'month') {
        // Last 30 days
        fromTime = now - (30 * 24 * 60 * 60);
        apiParams.from = fromTime;
    } else {
        return res.status(400).json({ error: 'Invalid period' });
    }

    try {
        const data = await fetchLastFm('user.getrecenttracks', apiParams);
        const tracks = data.recenttracks.track;

        // Basic Aggregation
        // Note: For 'month', fetching all tracks might require pagination. 
        // For now, we take the page 1 limit (200 is decent for daily/weekly snippet).
        // If count > 200, we might just report "> 200".
        // Or we use user.getWeeklyTrackChart for weeks.

        const total = data.recenttracks['@attr'].total;

        // Calculate Top Artist from this batch
        const artistCounts = {};
        tracks.forEach(t => {
            const artist = t.artist['#text'];
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
        });

        const sortedArtists = Object.entries(artistCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));

        // Generate a mini-sparkline (e.g. per hour for today, per day for week)
        const sparkline = [];
        if (period === 'today') {
            // Group by hour
            const hours = new Array(24).fill(0);
            tracks.forEach(t => {
                if (t.date) {
                    const d = new Date(parseInt(t.date.uts) * 1000);
                    hours[d.getHours()]++;
                }
            });
            // Current hour might be incomplete, but that's fine
            sparkline.push(...hours);
        } else if (period === 'week') {
            // Group by day (last 7 days)
            const days = new Array(7).fill(0);
            tracks.forEach(t => {
                if (t.date) {
                    const d = new Date(parseInt(t.date.uts) * 1000);
                    const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays < 7) {
                        days[6 - diffDays]++; // 6 is today, 0 is 7 days ago
                    }
                }
            });
            sparkline.push(...days);
        }

        res.json({
            period,
            totalScrobbles: total, // Accurate total from API header
            fetchedCount: tracks.length,
            topArtists: sortedArtists,
            sparkline
        });

    } catch (error) {
        if (error.message === 'MISSING_API_KEY') {
            // Mock data
            return res.json({
                period,
                totalScrobbles: period === 'today' ? 42 : (period === 'week' ? 350 : 1200),
                fetchedCount: 20,
                topArtists: [
                    { name: "Mock Artist A", count: 15 },
                    { name: "Mock Artist B", count: 10 }
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

    // Use yt-dlp to find the video ID
    // Command: yt-dlp "ytsearch1:QUERY" --get-id --no-warnings --no-playlist
    const cmd = `yt-dlp "ytsearch1:${query}" --print id --no-warnings --no-playlist --match-filter "!is_live"`;

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


