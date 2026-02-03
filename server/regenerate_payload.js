const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const isRailway = fs.existsSync('/data');
const DB_PATH = process.env.DB_PATH || (isRailway ? '/data/analytics.db' : path.resolve(__dirname, 'analytics.db'));
const PAYLOAD_PATH = isRailway ? '/data/dashboard_payload.json' : path.resolve(__dirname, '../src/data/dashboard_payload.json');
const DURATIONS_PATH = path.resolve(__dirname, 'track_durations.json'); // New source


async function generatePayload(dbInstance = null) {
    let localDb = false;
    const database = dbInstance || new sqlite3.Database(DB_PATH);
    if (!dbInstance) localDb = true;

    try {
        console.log('Reading all scrobbles from DB...');

        // Helper to query promise
        const queryAll = (sql) => new Promise((resolve, reject) => {
            database.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const scrobbles = await queryAll("SELECT * FROM scrobbles ORDER BY timestamp ASC");
        console.log(`Loaded ${scrobbles.length} scrobbles. Processing...`);

        // Load Duration Cache
        let durationCache = {};
        if (fs.existsSync(DURATIONS_PATH)) {
            try {
                durationCache = JSON.parse(fs.readFileSync(DURATIONS_PATH, 'utf8'));
            } catch (e) {
                console.error('Failed to load duration cache:', e);
            }
        }

        const meta = {
            total_scrobbles: scrobbles.length,
            unique_artists: 0, // calc later
            first_scrobble: scrobbles[0]?.timestamp,
            last_scrobble: scrobbles[scrobbles.length - 1]?.timestamp,
            update_time: new Date().toISOString()
        };

        const timeline = {}; // YYYY-MM-DD -> count
        const historyMap = {}; // YYYY-MM -> { count, minutes, albums: {}, tracks: {}, img: null }
        const yearsMap = {}; // YYYY -> { count, minutes, albums: {}, tracks: {}, artists: {}, months: [0]*12, days: [0]*7 }

        // Force initialize current year (2026) ensuring it appears even if empty
        const currentYear = new Date().getFullYear().toString();
        yearsMap[currentYear] = {
            count: 0,
            minutes: 0,
            albums: {},
            tracks: {},
            artists: {},
            months: Array(12).fill(0),
            days: Array(7).fill(0),
            hours: Array(24).fill(0)
        };

        const dailyStats = {}; // YYYY-MM-DD -> { tracks: {}, albums: {} }
        const artistStats = {}; // Name -> { count, minutes, years: {}, apples: {}, tod: [0,0,0,0], first: ts, albums: {} }

        const artistSet = new Set();

        const formatDate = (ts) => {
            const d = new Date(ts * 1000);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = d.getHours();
            return { yyyy, mm, dd, hh, keyDay: `${yyyy}-${mm}-${dd}`, keyMonth: `${yyyy}-${mm}` };
        };

        for (const s of scrobbles) {
            const { yyyy, mm, dd, hh, keyDay, keyMonth } = formatDate(s.timestamp);

            // Timeline
            timeline[keyDay] = (timeline[keyDay] || 0) + 1;

            // Monthly History (Aggregate first, transform later)
            if (!historyMap[keyMonth]) historyMap[keyMonth] = { count: 0, minutes: 0, albums: {}, tracks: {}, imgs: [] };
            historyMap[keyMonth].count++;
            // Albums in Month
            const albKey = `${s.album}|||${s.artist}`;
            if (!historyMap[keyMonth].albums[albKey]) historyMap[keyMonth].albums[albKey] = { count: 0, name: s.album, artist: s.artist, url: s.image_url };
            historyMap[keyMonth].albums[albKey].count++;
            if (s.image_url) historyMap[keyMonth].albums[albKey].url = s.image_url; // Update if found
            // Tracks in Month
            const trkKey = `${s.track}|||${s.artist}`;
            if (!historyMap[keyMonth].tracks[trkKey]) historyMap[keyMonth].tracks[trkKey] = { count: 0, name: s.track, artist: s.artist, url: s.image_url };
            historyMap[keyMonth].tracks[trkKey].count++;
            if (s.image_url) {
                historyMap[keyMonth].tracks[trkKey].url = s.image_url;
                historyMap[keyMonth].imgs.push(s.image_url);
            }

            // Annual Stats
            const yearKey = String(yyyy);
            if (!yearsMap[yearKey]) yearsMap[yearKey] = {
                count: 0,
                minutes: 0,
                albums: {},
                tracks: {},
                artists: {},
                months: Array(12).fill(0),
                days: Array(7).fill(0),
                hours: Array(24).fill(0)
            };
            yearsMap[yearKey].count++;

            // Month Counts (0-11)
            yearsMap[yearKey].months[parseInt(mm) - 1]++;

            // Day of Week Counts (0=Sun, 6=Sat) -> Convert to Mon=0, Sun=6? 
            // Check YearDetail logic: dayNames[i] maps to days[i]. dayNames = ["Mon", "Tue"...]
            // JS getDay(): 0=Sun, 1=Mon...
            // So we need to map JS 1->0, 2->1 ... 0->6.
            const jsDay = new Date(s.timestamp * 1000).getDay();
            const yearDetailDayIndex = jsDay === 0 ? 6 : jsDay - 1;
            yearsMap[yearKey].days[yearDetailDayIndex]++;

            // Hourly Counts
            yearsMap[yearKey].hours[parseInt(hh)]++;

            // Daily Stats
            if (!dailyStats[keyDay]) {
                dailyStats[keyDay] = { count: 0, minutes: 0, tracks: {}, albums: {} };
            }
            dailyStats[keyDay].count++;

            // Track per day (Use strict key to distinguish same track name by different artist)
            const dayTrkKey = `${s.track}:::${s.artist}`;
            if (!dailyStats[keyDay].tracks[dayTrkKey]) {
                dailyStats[keyDay].tracks[dayTrkKey] = { count: 0, name: s.track, artist: s.artist, album: s.album, img: s.image_url };
            }
            dailyStats[keyDay].tracks[dayTrkKey].count++;

            // Album per day
            if (s.album) {
                const dayAlbKey = `${s.album}:::${s.artist}`;
                if (!dailyStats[keyDay].albums[dayAlbKey]) {
                    dailyStats[keyDay].albums[dayAlbKey] = { count: 0, name: s.album, artist: s.artist, img: s.image_url };
                }
                dailyStats[keyDay].albums[dayAlbKey].count++;
            }



            // Top entities per Year
            if (!yearsMap[yearKey].albums[albKey]) yearsMap[yearKey].albums[albKey] = { count: 0, name: s.album, artist: s.artist, url: s.image_url };
            yearsMap[yearKey].albums[albKey].count++;
            if (!yearsMap[yearKey].tracks[trkKey]) yearsMap[yearKey].tracks[trkKey] = { count: 0, name: s.track, artist: s.artist, url: s.image_url };
            yearsMap[yearKey].tracks[trkKey].count++;
            if (!yearsMap[yearKey].artists[s.artist]) yearsMap[yearKey].artists[s.artist] = { count: 0, name: s.artist };
            yearsMap[yearKey].artists[s.artist].count++;

            // Calculate Duration (Shared)
            const durKey = `${s.track}|||${s.artist}`;
            const ms = durationCache[durKey] || 0;
            // Fallback to 3.5m (210000ms) if 0
            const realMinutes = (ms > 0 ? ms : 210000) / 1000 / 60;

            // Aggregate Minutes
            historyMap[keyMonth].minutes += realMinutes;
            yearsMap[yearKey].minutes += realMinutes;
            if (dailyStats[keyDay]) dailyStats[keyDay].minutes += realMinutes;

            // Artist Stats
            artistSet.add(s.artist);
            if (!artistStats[s.artist]) {
                artistStats[s.artist] = {
                    t: 0, // total
                    m: 0, // minutes
                    y: {}, // years { 2023: 10 }
                    tod: [0, 0, 0, 0], // Morning, Afternoon, Evening, Night
                    fs: s.timestamp, // first scrobble
                    albums: {}, // { "Album": { count, url, tracks: { "Trk": {count, verified} } } }
                    tags: [], // placeholder
                    img: [] // collect images
                };
            }
            const as = artistStats[s.artist];
            as.t++;
            as.m += realMinutes;
            as.y[yearKey] = (as.y[yearKey] || 0) + 1;

            // Time of Day
            // Time of Day
            // Morning 5-11, Afternoon 12-16, Evening 17-21, Night 22-4
            if (hh >= 5 && hh <= 11) as.tod[0]++;
            else if (hh >= 12 && hh <= 16) as.tod[1]++;
            else if (hh >= 17 && hh <= 21) as.tod[2]++;
            else as.tod[3]++;

            // Artist Albums & Tracks
            if (s.album) {
                if (!as.albums[s.album]) as.albums[s.album] = { count: 0, url: s.image_url, tracks: {} };
                as.albums[s.album].count++;
                if (s.image_url) as.albums[s.album].url = s.image_url;

                // Tracks within album
                if (!as.albums[s.album].tracks[s.track]) as.albums[s.album].tracks[s.track] = { count: 0, name: s.track, verified: true };
                as.albums[s.album].tracks[s.track].count++;
            }

            if (s.image_url && as.img.length < 5 && !as.img.includes(s.image_url)) {
                as.img.push(s.image_url);
            }
        }

        meta.unique_artists = artistSet.size;

        // Finalize History Array
        const history = Object.keys(historyMap).sort().map(date => {
            const d = historyMap[date];
            const getTop5 = (obj) => Object.values(obj).sort((a, b) => b.count - a.count).slice(0, 5);

            return {
                date,
                scrobbles: d.count,
                minutes: Math.round(d.minutes), // Use aggregated real minutes
                top_albums: getTop5(d.albums),
                top_tracks: getTop5(d.tracks),
                img: d.imgs.length > 0 ? d.imgs[0] : null
            };
        });

        // Finalize Years Object
        const years = {};
        Object.keys(yearsMap).forEach(y => {
            const d = yearsMap[y];
            const getTop = (obj, limit) => Object.values(obj).sort((a, b) => b.count - a.count).slice(0, limit);
            years[y] = {
                year: parseInt(y),
                total: d.count,
                minutes: Math.round(d.minutes), // Use aggregated real minutes
                minutes: Math.round(d.minutes), // Use aggregated real minutes
                months: d.months,
                days: d.days,
                hours: d.hours,
                top_albums: getTop(d.albums, 10),
                top_tracks: getTop(d.tracks, 10),
                top_artists: getTop(d.artists, 10)
            };
        });

        // Finalize Calendar (Daily Data)
        const calendar = {};
        Object.keys(dailyStats).forEach(day => {
            const dayData = dailyStats[day];
            let topTrack = null;
            let maxTC = -1;
            Object.values(dayData.tracks).forEach(t => {
                if (t.count > maxTC) {
                    maxTC = t.count;
                    topTrack = t;
                }
            });
            let topAlbum = null;
            let maxAC = -1;
            Object.values(dayData.albums).forEach(a => {
                if (a.count > maxAC) {
                    maxAC = a.count;
                    topAlbum = a;
                }
            });
            if (topTrack) {
                calendar[day] = {
                    date: day,
                    scrobbles: dayData.count,
                    minutes: Math.round(dayData.minutes), // Daily specific minutes
                    top_track: topTrack ? { name: topTrack.name, artist: topTrack.artist, count: topTrack.count, img: topTrack.img } : null,
                    top_album: topAlbum ? { name: topAlbum.name, artist: topAlbum.artist, count: topAlbum.count, img: topAlbum.img } : null
                };
            }
        });

        // Finalize Artists Object (Filter top 500 to save space)
        const artists = {};
        const topArtists = Object.entries(artistStats)
            .sort(([, a], [, b]) => b.t - a.t)
            .slice(0, 300); // Top 300 artists

        topArtists.forEach(([name, stat]) => {
            // Transform albums tracks object to array
            const transformedAlbums = {};
            Object.entries(stat.albums).forEach(([albName, albData]) => {
                transformedAlbums[albName] = {
                    ...albData,
                    tracks: Object.values(albData.tracks).sort((a, b) => b.count - a.count)
                };
            });

            artists[name] = {
                ...stat,
                albums: transformedAlbums,
                // Ensure img is valid
                img: stat.img.length > 0 ? stat.img : null
            };
        });

        const payload = {
            meta,
            timeline,
            calendar,
            history,
            years,
            artists
        };

        return payload;

    } catch (err) {
        console.error('Error generating payload:', err);
        throw err;
    } finally {
        if (localDb) database.close();
    }
}

// Allow running as standalone script
if (require.main === module) {
    (async () => {
        try {
            const payload = await generatePayload();
            fs.writeFileSync(PAYLOAD_PATH, JSON.stringify(payload));
            const sizeMB = (fs.statSync(PAYLOAD_PATH).size / 1024 / 1024).toFixed(2);
            console.log(`Payload written to ${PAYLOAD_PATH} (${sizeMB} MB)`);
        } catch (e) {
            console.error(e);
        }
    })();
}

module.exports = { generatePayload };
