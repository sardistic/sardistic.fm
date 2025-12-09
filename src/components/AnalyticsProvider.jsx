import React, { useEffect, useRef, useState } from 'react';

const API_BASE = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001') + '/api';

// Generate a unique session ID
const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const AnalyticsProvider = ({ children, currentView }) => {
    const pageStartTime = useRef(Date.now());
    const sessionId = useRef(generateSessionId());
    const [sessionStarted, setSessionStarted] = useState(false);

    // Initialize session on mount
    useEffect(() => {
        trackSession(sessionId.current);
        setSessionStarted(true);

        // End session on unmount
        return () => {
            const duration = Math.floor((Date.now() - pageStartTime.current) / 1000);
            trackSession(sessionId.current, duration);
        };
    }, []);

    // Track page views and timing whenever the view changes
    useEffect(() => {
        if (currentView) {
            // Log page timing for previous page
            if (pageStartTime.current) {
                const duration = Math.floor((Date.now() - pageStartTime.current) / 1000);
                if (duration > 0) {
                    trackPageTiming(currentView, duration);
                }
            }

            // Track new page view
            trackEvent('page_view', {
                page: currentView,
                timestamp: new Date().toISOString(),
                url: window.location.href
            });

            // Reset timer for new page
            pageStartTime.current = Date.now();
        }
    }, [currentView]);

    // Track all clicks globally
    useEffect(() => {
        const handleClick = (e) => {
            const target = e.target;
            const tagName = target.tagName.toLowerCase();
            const text = target.textContent?.substring(0, 50) || '';
            const id = target.id || '';
            const className = target.className || '';

            trackEvent('click', {
                element: tagName,
                text: text,
                id: id,
                className: typeof className === 'string' ? className : '',
                timestamp: new Date().toISOString(),
                page: currentView
            });
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [currentView]);

    // Track mouse movements (sampled every 500ms)
    useEffect(() => {
        let lastSample = 0;
        const SAMPLE_RATE = 500; // ms

        const handleMouseMove = (e) => {
            const now = Date.now();
            if (now - lastSample > SAMPLE_RATE) {
                trackMouseMovement(e.clientX, e.clientY, currentView);
                lastSample = now;
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, [currentView]);

    // Track scroll depth
    useEffect(() => {
        let maxScroll = 0;

        const handleScroll = () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );

            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                trackEvent('scroll', {
                    depth: scrollPercent,
                    page: currentView,
                    timestamp: new Date().toISOString()
                });
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [currentView]);

    return <>{children}</>;
};

// Helper functions
const trackEvent = async (type, payload) => {
    console.log('📊 Analytics Event:', type, payload);
    try {
        const response = await fetch(`${API_BASE}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, payload })
        });

        if (!response.ok) {
            console.error('Analytics tracking failed with status:', response.status);
        }
    } catch (error) {
        console.error('❌ Analytics tracking error:', error);
    }
};

const trackMouseMovement = async (x, y, page) => {
    try {
        await fetch(`${API_BASE}/mouse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x, y, page })
        });
    } catch (error) {
        // Silently fail
    }
};

const trackPageTiming = async (page, duration) => {
    console.log(`⏱️ Page timing: ${page} - ${duration}s`);
    try {
        await fetch(`${API_BASE}/timing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page, duration })
        });
    } catch (error) {
        // Silently fail
    }
};

const trackSession = async (session_id, total_duration = null) => {
    try {
        const body = total_duration
            ? { session_id, end_time: new Date().toISOString(), total_duration }
            : { session_id };

        await fetch(`${API_BASE}/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (error) {
        // Silently fail
    }
};
