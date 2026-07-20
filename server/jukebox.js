const DAY_SECONDS = 24 * 60 * 60;

const PRESET_IDS = new Set([
    'yearly-top',
    'all-time',
    'forgotten-favorites',
    'peak-obsessions',
    'long-haul',
    'rediscoveries',
    'deep-catalog',
    'time-capsule',
    'fresh-finds',
    'one-per-artist',
    'steady-rotation',
    'seasonal-returns',
    'album-sampler',
    'recent-rotation'
]);

const normalizeKey = (value) => String(value || '').trim().toLocaleLowerCase();

const getYear = (timestamp) => new Date(timestamp * 1000).getUTCFullYear();
const getMonth = (timestamp) => new Date(timestamp * 1000).getUTCMonth() + 1;
const getDayKey = (timestamp) => new Date(timestamp * 1000).toISOString().slice(0, 10);
const getMonthKey = (timestamp) => new Date(timestamp * 1000).toISOString().slice(0, 7);

const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(year, month - 1, 1)));
};

const formatAge = (days) => {
    if (days >= 730) return `${(days / 365).toFixed(1)} years`;
    if (days >= 60) return `${Math.round(days / 30)} months`;
    return `${Math.max(1, Math.round(days))} days`;
};

function buildCatalog(rows, nowTimestamp = Math.floor(Date.now() / 1000)) {
    const tracks = new Map();
    const artists = new Map();
    const albums = new Map();
    const recentCutoff = nowTimestamp - (180 * DAY_SECONDS);
    const currentYear = getYear(nowTimestamp);

    for (const row of rows) {
        const timestamp = Number(row.timestamp);
        if (!row.artist || !row.track || !Number.isFinite(timestamp)) continue;

        const trackKey = `${normalizeKey(row.artist)}\u0000${normalizeKey(row.track)}`;
        const artistKey = normalizeKey(row.artist);
        const albumName = row.album || '';
        const albumKey = albumName ? `${artistKey}\u0000${normalizeKey(albumName)}` : null;
        const year = getYear(timestamp);
        const month = getMonth(timestamp);
        const monthKey = getMonthKey(timestamp);

        if (!tracks.has(trackKey)) {
            tracks.set(trackKey, {
                key: trackKey,
                name: row.track,
                artist: row.artist,
                album: albumName,
                image: row.image_url || null,
                plays: 0,
                firstPlayed: timestamp,
                lastPlayed: timestamp,
                previousPlayed: null,
                maxGapDays: 0,
                recentPlays: 0,
                days: new Set(),
                years: new Map(),
                months: new Map(),
                calendarMonths: new Map(),
                albumCounts: new Map()
            });
        }

        const track = tracks.get(trackKey);
        track.plays += 1;
        track.firstPlayed = Math.min(track.firstPlayed, timestamp);
        track.lastPlayed = Math.max(track.lastPlayed, timestamp);
        track.days.add(getDayKey(timestamp));
        track.years.set(year, (track.years.get(year) || 0) + 1);
        track.months.set(monthKey, (track.months.get(monthKey) || 0) + 1);
        track.calendarMonths.set(month, (track.calendarMonths.get(month) || 0) + 1);
        if (timestamp >= recentCutoff) track.recentPlays += 1;

        if (track.previousPlayed !== null) {
            track.maxGapDays = Math.max(track.maxGapDays, (timestamp - track.previousPlayed) / DAY_SECONDS);
        }
        track.previousPlayed = timestamp;

        if (albumName) {
            track.albumCounts.set(albumName, (track.albumCounts.get(albumName) || 0) + 1);
        }
        if (row.image_url) track.image = row.image_url;

        if (!artists.has(artistKey)) {
            artists.set(artistKey, { name: row.artist, plays: 0, tracks: new Map() });
        }
        const artist = artists.get(artistKey);
        artist.plays += 1;
        artist.tracks.set(trackKey, (artist.tracks.get(trackKey) || 0) + 1);

        if (albumKey) {
            if (!albums.has(albumKey)) {
                albums.set(albumKey, { name: albumName, artist: row.artist, plays: 0, tracks: new Map() });
            }
            const album = albums.get(albumKey);
            album.plays += 1;
            album.tracks.set(trackKey, (album.tracks.get(trackKey) || 0) + 1);
        }
    }

    const finalizedTracks = Array.from(tracks.values()).map((track) => {
        const peakMonth = Array.from(track.months.entries())
            .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0] || ['', 0];
        const favoriteAlbum = Array.from(track.albumCounts.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || track.album;
        const yearValues = Array.from(track.years.keys()).sort((a, b) => a - b);

        return {
            ...track,
            album: favoriteAlbum,
            uniqueDays: track.days.size,
            activeYears: track.years.size,
            firstYear: yearValues[0],
            lastYear: yearValues[yearValues.length - 1],
            peakMonth: peakMonth[0],
            peakMonthPlays: peakMonth[1],
            artistPlays: artists.get(normalizeKey(track.artist))?.plays || track.plays,
            currentYearPlays: track.years.get(currentYear) || 0
        };
    });

    return {
        tracks: finalizedTracks,
        trackMap: new Map(finalizedTracks.map((track) => [track.key, track])),
        artists,
        albums,
        nowTimestamp
    };
}

const trackResult = (track, count, detail, score = count) => ({
    name: track.name,
    artist: track.artist,
    album: track.album || null,
    image: track.image || null,
    count,
    totalPlays: track.plays,
    uniqueDays: track.uniqueDays,
    firstPlayed: track.firstPlayed,
    lastPlayed: track.lastPlayed,
    detail,
    score
});

const sortResults = (items) => items.sort((a, b) =>
    b.score - a.score ||
    b.totalPlays - a.totalPlays ||
    a.artist.localeCompare(b.artist) ||
    a.name.localeCompare(b.name)
);

function generateJukebox(catalog, options = {}) {
    const type = PRESET_IDS.has(options.type) ? options.type : 'yearly-top';
    const limit = Math.min(200, Math.max(10, Number.parseInt(options.limit, 10) || 100));
    const availableYears = Array.from(new Set(catalog.tracks.flatMap((track) => Array.from(track.years.keys()))))
        .sort((a, b) => b - a);
    const requestedYear = Number.parseInt(options.year, 10);
    const year = availableYears.includes(requestedYear) ? requestedYear : availableYears[0];
    const requestedMonth = Number.parseInt(options.month, 10);
    const month = requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : getMonth(catalog.nowTimestamp);
    const now = catalog.nowTimestamp;
    let results = [];

    if (type === 'yearly-top') {
        results = catalog.tracks
            .filter((track) => track.years.has(year))
            .map((track) => {
                const count = track.years.get(year);
                return trackResult(track, count, `${count} plays in ${year}`, count);
            });
    }

    if (type === 'all-time') {
        results = catalog.tracks.map((track) =>
            trackResult(track, track.plays, `${track.plays} lifetime plays across ${track.activeYears} year${track.activeYears === 1 ? '' : 's'}`, track.plays)
        );
    }

    if (type === 'forgotten-favorites') {
        results = catalog.tracks
            .map((track) => ({ track, ageDays: (now - track.lastPlayed) / DAY_SECONDS }))
            .filter(({ track, ageDays }) => track.plays >= 5 && ageDays >= 365)
            .map(({ track, ageDays }) => trackResult(
                track,
                track.plays,
                `${track.plays} plays · last heard ${formatAge(ageDays)} ago`,
                track.plays * Math.log2(2 + (ageDays / 365))
            ));
    }

    if (type === 'peak-obsessions') {
        results = catalog.tracks
            .filter((track) => track.peakMonthPlays >= 3)
            .map((track) => trackResult(
                track,
                track.peakMonthPlays,
                `${track.peakMonthPlays} plays in ${formatMonth(track.peakMonth)} · ${track.plays} total`,
                (track.peakMonthPlays * 2) + ((track.peakMonthPlays / track.plays) * 10)
            ));
    }

    if (type === 'long-haul') {
        results = catalog.tracks
            .filter((track) => track.activeYears >= 3)
            .map((track) => trackResult(
                track,
                track.plays,
                `${track.activeYears} active years · ${track.firstYear}–${track.lastYear}`,
                (track.activeYears * 100) + track.uniqueDays + Math.log2(track.plays + 1)
            ));
    }

    if (type === 'rediscoveries') {
        results = catalog.tracks
            .filter((track) => track.recentPlays > 0 && track.plays - track.recentPlays >= 3 && track.maxGapDays >= 365)
            .map((track) => trackResult(
                track,
                track.recentPlays,
                `${track.recentPlays} recent plays after a ${formatAge(track.maxGapDays)} gap`,
                track.maxGapDays + (track.recentPlays * 30)
            ));
    }

    if (type === 'deep-catalog') {
        results = catalog.tracks
            .filter((track) => track.artistPlays >= 100 && track.plays >= 2 && track.plays <= 12 && track.uniqueDays >= 2)
            .map((track) => trackResult(
                track,
                track.plays,
                `${track.plays} plays inside ${track.artistPlays} plays of ${track.artist}`,
                (track.plays * 10) + Math.log2(track.artistPlays + 1)
            ));
    }

    if (type === 'time-capsule') {
        results = catalog.tracks
            .filter((track) => (track.years.get(year) || 0) >= 2)
            .map((track) => ({ track, yearPlays: track.years.get(year), share: track.years.get(year) / track.plays }))
            .filter(({ share }) => share >= 0.6)
            .map(({ track, yearPlays, share }) => trackResult(
                track,
                yearPlays,
                `${Math.round(share * 100)}% of its plays happened in ${year}`,
                yearPlays * (1 + share)
            ));
    }

    if (type === 'fresh-finds') {
        results = catalog.tracks
            .filter((track) => track.firstYear === year)
            .map((track) => trackResult(
                track,
                track.plays,
                `First heard in ${year} · ${track.plays} plays since`,
                track.plays + (track.activeYears * 2)
            ));
    }

    if (type === 'one-per-artist') {
        const bestByArtist = new Map();
        for (const track of catalog.tracks) {
            const key = normalizeKey(track.artist);
            const current = bestByArtist.get(key);
            if (!current || track.plays > current.plays) bestByArtist.set(key, track);
        }
        results = Array.from(bestByArtist.values()).map((track) => trackResult(
            track,
            track.plays,
            `${track.artist}'s most-played track`,
            track.plays
        ));
    }

    if (type === 'steady-rotation') {
        results = catalog.tracks
            .filter((track) => track.uniqueDays >= 5)
            .map((track) => trackResult(
                track,
                track.uniqueDays,
                `Heard on ${track.uniqueDays} different days across ${track.activeYears} year${track.activeYears === 1 ? '' : 's'}`,
                (track.uniqueDays * 3) + (track.activeYears * 10)
            ));
    }

    if (type === 'seasonal-returns') {
        results = catalog.tracks
            .map((track) => {
                const monthPlays = track.calendarMonths.get(month) || 0;
                const yearsInMonth = Array.from(track.months.entries())
                    .filter(([key]) => Number(key.slice(5, 7)) === month)
                    .length;
                return { track, monthPlays, yearsInMonth };
            })
            .filter(({ monthPlays, yearsInMonth }) => monthPlays >= 3 && yearsInMonth >= 2)
            .map(({ track, monthPlays, yearsInMonth }) => trackResult(
                track,
                monthPlays,
                `${monthPlays} plays in this month across ${yearsInMonth} years`,
                monthPlays + (yearsInMonth * 5)
            ));
    }

    if (type === 'album-sampler') {
        results = Array.from(catalog.albums.values()).map((album) => {
            const [trackKey, trackPlays] = Array.from(album.tracks.entries()).sort((a, b) => b[1] - a[1])[0];
            const track = catalog.trackMap.get(trackKey);
            return trackResult(
                track,
                album.plays,
                `Lead track from ${album.name} · ${album.plays} album plays`,
                album.plays + (trackPlays / 100)
            );
        });
    }

    if (type === 'recent-rotation') {
        results = catalog.tracks
            .filter((track) => track.recentPlays > 0)
            .map((track) => trackResult(
                track,
                track.recentPlays,
                `${track.recentPlays} plays in the last 180 days`,
                track.recentPlays
            ));
    }

    return {
        type,
        year,
        month,
        limit,
        availableYears,
        totalCandidates: results.length,
        tracks: sortResults(results).slice(0, limit).map((item) => {
            const track = { ...item };
            delete track.score;
            return track;
        })
    };
}

module.exports = {
    PRESET_IDS,
    buildCatalog,
    generateJukebox
};
