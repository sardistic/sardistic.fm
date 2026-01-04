const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { syncScrobbles } = require('./sync');

(async () => {
    try {
        console.log('Running manual sync...');
        const result = await syncScrobbles();
        console.log('Sync result:', result);
    } catch (error) {
        console.error('Manual sync failed:', error);
    }
})();
