/*
 * Genre classification.
 *
 * The scrobble database has no genre column and the payload's `tags` field was
 * only ever a placeholder, so genre has to come from Last.fm's community tags
 * (artist.getTopTags). Those are weighted 0-100 by how many people applied
 * them, which is exactly what is needed to pick a dominant style.
 *
 * Raw tags are messy — "seen live", "american", "favourites", decade tags —
 * so they are filtered, then mapped onto a small canonical set. The set is
 * deliberately shaped to this library (post-hardcore, prog, electronic, indie,
 * hip-hop) rather than being a general music taxonomy: a bucket nobody listens
 * to is a wasted colour on the chart.
 *
 * Tags are cached to disk. They change rarely and there are hundreds of
 * artists, so a regeneration should not re-hit the API every time.
 */
const fs = require('fs');
const path = require('path');

const TAG_CACHE_PATH = fs.existsSync('/data')
    ? '/data/artist_tags.json'
    : path.resolve(__dirname, '../src/data/artist_tags.json');

// Ordered: the first bucket whose patterns match a tag claims it, so the more
// specific styles must come before the broad ones ("post-hardcore" before
// "hardcore", "indie pop" before "pop").
const GENRES = [
    // "industrial" is the single most-applied tag on the library's top artist and
    // matched nothing, so Nine Inch Nails was being filed under alternative on
    // its secondary tags. It earns its own bucket.
    ['Industrial', ['industrial', 'ebm', 'aggrotech']],
    ['Post-hardcore & Emo', ['post-hardcore', 'post hardcore', 'screamo', 'emocore', 'midwest emo', 'emo']],
    // metalcore/deathcore read as metal to most listeners, not as emo.
    ['Metal', ['black metal', 'death metal', 'thrash', 'doom metal', 'djent', 'metalcore', 'deathcore', 'nu metal', 'grindcore', 'metal']],
    ['Punk', ['punk', 'ska', 'oi!']],
    ['Hip-Hop', ['hip hop', 'hip-hop', 'rap', 'trap', 'grime', 'boom bap']],
    ['Electronic', ['trip-hop', 'trip hop', 'house', 'techno', 'edm', 'dubstep', 'electro', 'electronic', 'idm', 'synthwave', 'trance', 'drum and bass', 'drum n bass', 'dnb', 'future bass', 'complextro', 'downtempo', 'glitch', 'breakcore', 'vaporwave']],
    ['Post-rock & Ambient', ['post-rock', 'post rock', 'ambient', 'instrumental', 'shoegaze', 'drone', 'math rock']],
    ['R&B & Soul', ['r&b', 'rnb', 'soul', 'funk', 'neo-soul', 'motown']],
    ['Indie & Alternative', ['indie', 'alternative', 'grunge', 'progressive rock', 'psychedelic', 'art rock', 'britpop', 'rock']],
    ['Pop', ['k-pop', 'synthpop', 'dream pop', 'electropop', 'pop']],
    ['Folk & Acoustic', ['folk', 'acoustic', 'singer-songwriter', 'country', 'americana']]
];

// Tags that say nothing about style.
const NOISE = /^(seen live|favou?rites?|favou?rite songs?|american|british|usa|uk|canadian|australian|swedish|german|japanese|korean|male vocalists?|female vocalists?|beautiful|awesome|cool|epic|chill|love|memories|spotify|albums i own|under \d+ listeners|\d{2}s|\d{4}|00s|10s|20s|90s|80s|70s|60s)$/i;

function classify(tags) {
    if (!Array.isArray(tags) || tags.length === 0) return null;

    const scores = new Map();
    for (const tag of tags) {
        const name = String(tag.name || '').toLowerCase().trim();
        const weight = Number(tag.count) || 0;
        if (!name || weight <= 0 || NOISE.test(name)) continue;

        for (const [genre, patterns] of GENRES) {
            if (patterns.some((p) => name.includes(p))) {
                scores.set(genre, (scores.get(genre) || 0) + weight);
                break; // first (most specific) bucket wins this tag
            }
        }
    }

    if (scores.size === 0) return null;
    return [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function loadTagCache() {
    try {
        if (fs.existsSync(TAG_CACHE_PATH)) {
            return JSON.parse(fs.readFileSync(TAG_CACHE_PATH, 'utf8'));
        }
    } catch (e) {
        console.error('[genres] tag cache unreadable:', e.message);
    }
    return {};
}

function saveTagCache(cache) {
    try {
        fs.writeFileSync(TAG_CACHE_PATH, JSON.stringify(cache));
    } catch (e) {
        console.error('[genres] could not write tag cache:', e.message);
    }
}

async function fetchTags(artist, apiKey) {
    const url = 'https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags'
        + `&artist=${encodeURIComponent(artist)}&api_key=${apiKey}&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const tags = body?.toptags?.tag;
    if (!Array.isArray(tags)) return [];
    return tags.slice(0, 12).map((t) => ({ name: t.name, count: Number(t.count) || 0 }));
}

/**
 * Resolve artist -> canonical genre for the given names, filling any cache
 * misses from the API. Network failures degrade to "unclassified" rather than
 * failing the whole payload build.
 */
async function resolveGenres(artistNames, apiKey, { onProgress } = {}) {
    const cache = loadTagCache();
    const missing = artistNames.filter((n) => !(n in cache));
    let fetched = 0;

    for (const name of missing) {
        if (!apiKey) break;
        try {
            cache[name] = await fetchTags(name, apiKey);
        } catch (e) {
            cache[name] = [];               // remember the miss; do not retry every run
            console.error(`[genres] ${name}: ${e.message}`);
        }
        fetched++;
        if (onProgress && fetched % 25 === 0) onProgress(fetched, missing.length);
        await new Promise((r) => setTimeout(r, 250));   // ~4 req/s, well under the rate limit
    }

    if (fetched > 0) saveTagCache(cache);

    const byArtist = {};
    for (const name of artistNames) {
        byArtist[name] = classify(cache[name]) || null;
    }
    return byArtist;
}

module.exports = {
    GENRE_LIST: GENRES.map(([name]) => name),
    classify,
    resolveGenres,
    TAG_CACHE_PATH
};
