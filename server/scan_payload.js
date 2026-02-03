const fs = require('fs');
const path = require('path');

const payloadPath = path.resolve(__dirname, '../src/data/dashboard_payload.json');

try {
    const data = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    let found = 0;

    function scan(obj) {
        if (!obj) return;
        if (typeof obj === 'string') {
            if (obj.includes('archive.org')) {
                if (found < 5) console.log('Found URL:', obj);
                found++;
            }
        } else if (typeof obj === 'object') {
            Object.values(obj).forEach(scan);
        }
    }

    console.log('Scanning payload for "archive.org"...');
    scan(data);
    console.log(`Total "archive.org" occurrences: ${found}`);

} catch (e) {
    console.error(e);
}
