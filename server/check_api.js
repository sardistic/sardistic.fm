const axios = require('axios');
const LASTFM_API_KEY = 'YOUR_API_KEY_HERE'; // User's key is in env, will use process.env in real run
const LASTFM_USER = 'coldhunter';

async function check() {
    const url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=1&extended=1`;
    try {
        const res = await axios.get(url);
        console.log(JSON.stringify(res.data.recenttracks.track[0], null, 2));
    } catch (e) {
        console.error(e);
    }
}
check();
