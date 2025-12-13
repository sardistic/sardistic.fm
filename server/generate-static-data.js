const fs = require('fs');
const path = require('path');
const Vibrant = require('node-vibrant');
const axios = require('axios');

const PAYLOAD_PATH = path.join(__dirname, '../src/data/dashboard_payload.json');
const OUTPUT_PATH = path.join(__dirname, '../src/data/year_meta.json');

// Helper: Color Extraction
async function getDominantColor(imageUrl) {
    if (!imageUrl) return '#00ffcc';
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const palette = await Vibrant.from(buffer).getPalette();
        const swatch = palette.Vibrant || palette.LightVibrant || palette.DarkVibrant || palette.Muted;
        return swatch ? swatch.getHex() : '#00ffcc';
    } catch (error) {
        console.error(`Error extracting color from ${imageUrl}:`, error.message);
        return '#00ffcc';
    }
}

async function generate() {
    console.log('Reading payload...');
    const rawArgs = fs.readFileSync(PAYLOAD_PATH);
    const data = JSON.parse(rawArgs);

    const yearData = {};

    // Group history by year
    const historyByYear = {};
    if (data.history) {
        data.history.forEach(entry => {
            const year = entry.date.substring(0, 4);
            if (!historyByYear[year]) historyByYear[year] = [];
            historyByYear[year].push(entry);
        });
    }

    console.log(`Found ${Object.keys(historyByYear).length} years to process.`);

    for (const [year, entries] of Object.entries(historyByYear)) {
        // Find best image (month with most scrobbles or just first valid one)
        // Sort entries by scrobbles descending
        entries.sort((a, b) => (b.scrobbles || 0) - (a.scrobbles || 0));

        const bestEntry = entries.find(e => e.top_albums && e.top_albums[0] && e.top_albums[0].url) || entries[0];
        const imageUrl = bestEntry?.top_albums?.[0]?.url || bestEntry?.img || null;

        console.log(`Processing ${year}... Image: ${imageUrl ? 'Found' : 'Missing'}`);

        let color = '#00ffcc';
        if (imageUrl) {
            color = await getDominantColor(imageUrl);
        }

        yearData[year] = {
            imageUrl,
            dominantColor: color
        };
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(yearData, null, 2));
    console.log(`Done! Saved metadata to ${OUTPUT_PATH}`);
}

generate();
