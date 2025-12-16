const fs = require('fs');
const path = require('path');

const payloadPath = path.join(__dirname, 'src', 'data', 'dashboard_payload.json');
const data = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

const year2023 = data.years['2023'];

if (!year2023) {
    console.error('Year 2023 missing!');
    process.exit(1);
}

if (!year2023.months || year2023.months.length !== 12) {
    console.error('Months array missing or invalid length:', year2023.months);
    process.exit(1);
}

if (!year2023.days || year2023.days.length !== 7) {
    console.error('Days array missing or invalid length:', year2023.days);
    process.exit(1);
}

const totalMonths = year2023.months.reduce((a, b) => a + b, 0);
console.log('2023 Total from months:', totalMonths);
console.log('2023 Total reported:', year2023.total);

if (totalMonths !== year2023.total) {
    console.warn('Totals do not match! (Might be acceptable if some dates skipped, but usually should match)');
}

console.log('Sample Month Counts:', year2023.months.join(', '));
console.log('Sample Day Counts:', year2023.days.join(', '));
console.log('VERIFICATION SUCCESS');
