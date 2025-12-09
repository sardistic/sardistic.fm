import { useCallback } from 'react';

const ANALYTICS_ENDPOINT = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001') + '/api/track';

export const useAnalytics = () => {
    const trackEvent = useCallback(async (type, payload = {}) => {
        try {
            await fetch(ANALYTICS_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type, payload }),
            });
        } catch (error) {
            console.error('Failed to send analytics event:', error);
            // Silently fail so we don't break the app
        }
    }, []);

    return { trackEvent };
};
