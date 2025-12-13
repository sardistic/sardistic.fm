-- Scrobbles table: Store individual scrobble records
CREATE TABLE IF NOT EXISTS scrobbles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist TEXT NOT NULL,
    track TEXT NOT NULL,
    album TEXT,
    timestamp INTEGER NOT NULL,
    date TEXT NOT NULL,
    image_url TEXT,
    UNIQUE(artist, track, timestamp)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_scrobbles_timestamp ON scrobbles(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scrobbles_artist ON scrobbles(artist);
CREATE INDEX IF NOT EXISTS idx_scrobbles_date ON scrobbles(date);

-- Sync state table: Track last sync timestamp
CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_timestamp INTEGER NOT NULL,
    last_sync_date TEXT NOT NULL,
    total_scrobbles INTEGER DEFAULT 0
);

-- Initialize sync state
INSERT OR IGNORE INTO sync_state (id, last_sync_timestamp, last_sync_date, total_scrobbles)
VALUES (1, 0, '1970-01-01', 0);
