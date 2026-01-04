const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_USER = process.env.LASTFM_USER || 'coldhunter';
const LASTFM_BASE_URL = 'http://ws.audioscrobbler.com/2.0/';

async function test() {
    console.log(`Testing API for user: ${LASTFM_USER}`);
    console.log(`API Key present: ${!!LASTFM_API_KEY}`);

    try {
        const response = await axios.get(LASTFM_BASE_URL, {
            params: {
                method: 'user.getinfo',
                user: LASTFM_USER,
                api_key: LASTFM_API_KEY,
                format: 'json'
            }
        });
        console.log('Success!');
        console.log('User Info:', response.data.user.name, response.data.user.playcount);
    } catch (error) {
        console.error('API Test Failed:');
        if (error.response) {
            console.error(error.response.status, error.response.statusText);
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

test();
