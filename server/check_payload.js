const fs = require('fs');
const path = require('path');

const payloadPath = path.resolve(__dirname, '../src/data/dashboard_payload.json');
try {
    const stats = fs.statSync(payloadPath);
    console.log(`Payload size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    const raw = fs.readFileSync(payloadPath, 'utf8');
    const data = JSON.parse(raw);
    console.log('JSON Parse Success!');
    console.log('Meta:', data.meta);
} catch (e) {
    console.error('JSON Check Failed:', e.message);
}
