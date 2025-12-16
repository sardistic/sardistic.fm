const fs = require('fs');
const path = require('path');
const Vibrant = require('node-vibrant');
const axios = require('axios');

const PAYLOAD_PATH = path.join(__dirname, '../src/data/dashboard_payload.json');
const YEAR_OUTPUT_PATH = path.join(__dirname, '../src/data/year_meta.json');
const MONTH_OUTPUT_PATH = path.join(__dirname, '../src/data/month_meta.json');

const BLACKLIST = ['prison break', 'westworld'];

// Helper: Color Extraction
async function getDominantColor(imageUrl) {
    if (!imageUrl) return '#00ffcc';
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 3000
        });
        const buffer = Buffer.from(response.data);
        const palette = await Vibrant.from(buffer).getPalette();
        const swatch = palette.LightVibrant || palette.Vibrant || palette.Muted || palette.DarkVibrant;
        return swatch ? swatch.getHex() : '#00ffcc';
    } catch (error) {
        console.error(`Error extracting color from ${imageUrl}:`, error.message);
        return '#00ffcc';
    }
}

// Helper: Find valid album object avoiding blacklist
function getBestAlbumObj(entry) {
    if (!entry) return null;

    // 1. Try Top Albums array
    if (entry.top_albums && Array.isArray(entry.top_albums)) {
        const validAlbum = entry.top_albums.find(album => {
            if (!album.name) return false;
            const name = (album.name || "").toLowerCase();
            return !BLACKLIST.some(term => name.includes(term));
        });
        if (validAlbum) {
            // Ensure we have url
            if (!validAlbum.url && validAlbum.image && Array.isArray(validAlbum.image)) {
                validAlbum.url = validAlbum.image[validAlbum.image.length - 1]['#text'];
            }
            return validAlbum;
        }
    }

    // 2. Fallback to entry.img (limited data, just url)
    if (entry.img) return { url: entry.img, name: '', artist: '' };



    return null;
}

async function generate() {
    console.log('Reading payload...');
    const rawArgs = fs.readFileSync(PAYLOAD_PATH);
    const data = JSON.parse(rawArgs);

    const yearData = {};
    const monthData = {};

    const historyByYear = {};

    // Process Months
    if (data.history) {
        console.log(`Found ${data.history.length} monthly entries.`);

        for (const entry of data.history) {
            const dateKey = entry.date;
            const year = dateKey.substring(0, 4);

            if (!historyByYear[year]) historyByYear[year] = [];
            historyByYear[year].push(entry);

            const bestAlbum = getBestAlbumObj(entry);
            const imageUrl = bestAlbum?.url || bestAlbum?.image?.[3]?.['#text']; // Last.fm image array fallback

            console.log(`Month ${dateKey}: ${imageUrl ? 'Art Found' : 'No Art'}`);

            let color = '#00ffcc';
            if (imageUrl) {
                color = await getDominantColor(imageUrl);
            }

            monthData[dateKey] = {
                imageUrl,
                dominantColor: color,
                album: bestAlbum?.name || '',
                artist: bestAlbum?.artist?.name || bestAlbum?.artist || ''
            };
        }
    }

    // Process Years
    console.log(`Processing Years...`);
    for (const [year, entries] of Object.entries(historyByYear)) {
        // Sort by scrobbles
        entries.sort((a, b) => (b.scrobbles || 0) - (a.scrobbles || 0));

        // Find best Entry that has valid art
        let bestAlbum = null;
        for (const entry of entries) {
            bestAlbum = getBestAlbumObj(entry);
            // Check if valid URL
            const url = bestAlbum?.url || bestAlbum?.image?.[3]?.['#text'];
            if (url) {
                bestAlbum.url = url; // normalize
                break;
            }
        }

        const imageUrl = bestAlbum?.url;
        console.log(`Year ${year}: ${imageUrl ? 'Art Found' : 'No Art'}`);

        let color = '#00ffcc';
        if (imageUrl) {
            color = await getDominantColor(imageUrl);
        }

        yearData[year] = {
            imageUrl,
            dominantColor: color,
            album: bestAlbum?.name || '',
            artist: bestAlbum?.artist?.name || bestAlbum?.artist || ''
        };
    }

    fs.writeFileSync(YEAR_OUTPUT_PATH, JSON.stringify(yearData, null, 2));
    fs.writeFileSync(MONTH_OUTPUT_PATH, JSON.stringify(monthData, null, 2));
    console.log(`Done! Saved metadata to ${YEAR_OUTPUT_PATH} and ${MONTH_OUTPUT_PATH}`);
}

generate();
