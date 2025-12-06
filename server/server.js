const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Setup
const dbPath = path.resolve(__dirname, 'analytics.db');
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
    console.log(`Server running on http://localhost:${PORT}`);
});
