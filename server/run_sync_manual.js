require('dotenv').config();
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
