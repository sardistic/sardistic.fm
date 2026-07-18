// Shared scrobble blocklist.
//
// Applied in TWO places, which must stay in sync:
//   1. DB ingestion (sync.js) — blocked scrobbles are never stored.
//   2. The live Last.fm read path (server.js) — now-playing, the recent feed,
//      and the top artists/tracks/albums lists are fetched straight from
//      Last.fm and must be filtered too, or blocked acts still surface on the
//      site even though the database is clean.
//
// Patterns are tested (case-insensitive) against "artist track album".
// The apostrophe is optional and may be straight (') or curly (’); the gap
// before "myspace" tolerates spaces, dots, dashes or underscores.
const BLOCKLIST = [/emma['’]?s[\s._-]*myspace/i];

// Normalize either shape we deal with into { artist, track, album } strings:
//   - normalized  : { artist:'x', track:'y', album:'z' }
//   - raw Last.fm : { artist:{name|'#text'}, name:'y', album:{'#text'} }
function fieldsOf(t) {
    if (!t) return { artist: '', track: '', album: '' };
    const artist = typeof t.artist === 'string'
        ? t.artist
        : (t.artist && (t.artist.name || t.artist['#text'])) || '';
    const track = t.track || t.name || '';
    const album = typeof t.album === 'string'
        ? t.album
        : (t.album && t.album['#text']) || '';
    return { artist, track, album };
}

// True if a track object (either shape) matches the blocklist.
function isBlocked(t) {
    const { artist, track, album } = fieldsOf(t);
    return BLOCKLIST.some(re => re.test(`${artist} ${track} ${album}`));
}

// Name-only check, for top-artist / top-track / top-album lists where the
// blocked entity is identified by a bare artist name string.
function isBlockedName(name) {
    return BLOCKLIST.some(re => re.test(String(name || '')));
}

module.exports = { BLOCKLIST, isBlocked, isBlockedName, fieldsOf };
