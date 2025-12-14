const axios = require('axios');

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_USER = process.env.LASTFM_USER || 'coldhunter';
const LASTFM_BASE_URL = 'http://ws.audioscrobbler.com/2.0/';

/**
 * Fetch recent tracks from Last.fm API
 * @param {number} from - Unix timestamp to fetch tracks from
 * @param {number} limit - Number of tracks to fetch per page (max 200)
 * @returns {Promise<Array>} Array of track objects
 */
async function getRecentTracks(from = null, limit = 200) {
    const params = {
        method: 'user.getrecenttracks',
        user: LASTFM_USER,
        api_key: LASTFM_API_KEY,
        format: 'json',
        limit: limit,
        extended: 1
    };

    if (from) {
        params.from = from;
    }

    try {
        const response = await axios.get(LASTFM_BASE_URL, { params, timeout: 10000 });

        if (!response.data || !response.data.recenttracks) {
            throw new Error('Invalid response from Last.fm API');
        }

        const tracks = response.data.recenttracks.track;
        if (!Array.isArray(tracks)) {
            return tracks ? [tracks] : [];
        }

        return tracks.map(track => ({
            artist: track.artist.name || track.artist['#text'],
            track: track.name,
            album: track.album['#text'] || null,
            timestamp: track.date ? parseInt(track.date.uts) : null,
            date: track.date ? track.date['#text'] : null,
            image: track.image?.find(img => img.size === 'extralarge')?.['#text'] || null,
            nowPlaying: track['@attr']?.nowplaying === 'true'
        })).filter(t => t.timestamp); // Filter out currently playing tracks
    } catch (error) {
        console.error('Error fetching from Last.fm:', error.message);
        throw error;
    }
}

/**
 * Fetch all tracks since a given timestamp
 * @param {number} since - Unix timestamp
 * @returns {Promise<Array>} All tracks since timestamp
 */
async function getAllTracksSince(since) {
    const allTracks = [];
    let page = 1;
    let totalPages = 1;

    do {
        const params = {
            method: 'user.getrecenttracks',
            user: LASTFM_USER,
            api_key: LASTFM_API_KEY,
            format: 'json',
            limit: 200,
            extended: 1,
            from: since,
            page: page
        };

        try {
            const response = await axios.get(LASTFM_BASE_URL, { params, timeout: 10000 });
            const recenttracks = response.data.recenttracks;

            totalPages = parseInt(recenttracks['@attr'].totalPages);

            const tracks = Array.isArray(recenttracks.track) ? recenttracks.track : [recenttracks.track];
            const validTracks = tracks
                .filter(t => t.date) // Exclude now playing
                .map(track => ({
                    artist: track.artist.name || track.artist['#text'],
                    track: track.name,
                    album: track.album['#text'] || null,
                    timestamp: parseInt(track.date.uts),
                    date: track.date['#text'],
                    image: track.image?.find(img => img.size === 'extralarge')?.['#text'] || null
                }));

            allTracks.push(...validTracks);

            console.log(`Fetched page ${page}/${totalPages} (${validTracks.length} tracks)`);
            page++;

            // Rate limiting: wait 200ms between requests
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.error(`Error fetching page ${page}:`, error.message);
            break;
        }
    } while (page <= totalPages);

    return allTracks;
}

module.exports = {
    getRecentTracks,
    getAllTracksSince
};
