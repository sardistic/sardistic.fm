const fs = require('fs');
const path = require('path');

const PAYLOAD_PATH = path.resolve(__dirname, '../src/data/dashboard_payload.json');

try {
    if (!fs.existsSync(PAYLOAD_PATH)) {
        console.error('Payload file not found:', PAYLOAD_PATH);
        process.exit(1);
    }

    const payload = JSON.parse(fs.readFileSync(PAYLOAD_PATH, 'utf8'));
    console.log('Payload loaded. Meta:', payload.meta);

    // Check 2026 History entries
    const history2026 = (payload.history || []).filter(h => h.date.startsWith('2026-'));

    console.log(`Found ${history2026.length} monthly entries for 2026.`);

    history2026.forEach(month => {
        console.log(`\nChecking Month: ${month.date}`);
        console.log(`  Scrobbles: ${month.scrobbles}`);

        const topAlbum = month.top_albums?.[0];
        if (topAlbum) {
            console.log(`  Top Album: ${topAlbum.name}`);
            console.log(`  Expected Image: ${topAlbum.url || topAlbum.image || topAlbum.img || 'MISSING'}`);
        } else {
            console.log('  Top Album: NONE');
        }

        const topTrack = month.top_tracks?.[0];
        if (topTrack) {
            console.log(`  Top Track: ${topTrack.name}`);
            console.log(`  Expected Image: ${topTrack.img || topTrack.image || 'MISSING'}`);
        }
    });

} catch (error) {
    console.error('Error reading payload:', error);
}
