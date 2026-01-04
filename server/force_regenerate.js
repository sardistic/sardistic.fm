require('dotenv').config();
const { generatePayload } = require('./regenerate_payload');
const fs = require('fs');
const path = require('path');

(async () => {
    try {
        console.log('Regenerating dashboard payload...');
        const payload = await generatePayload();

        const PAYLOAD_PATH = path.resolve(__dirname, '../src/data/dashboard_payload.json');
        fs.writeFileSync(PAYLOAD_PATH, JSON.stringify(payload));

        console.log('Payload regenerated and saved to:', PAYLOAD_PATH);
    } catch (error) {
        console.error('Failed to regenerate payload:', error);
    }
})();
