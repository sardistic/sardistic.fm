import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc, Music, BarChart3, Clock, Calendar, Activity } from 'lucide-react';
import MagneticText from './MagneticText';

const REFRESH_INTERVAL_MS = 10000; // 10 seconds

export default function NowPlaying({ serverUrl = 'http://localhost:3001' }) {
    const [nowPlaying, setNowPlaying] = useState(null);
    const [stats, setStats] = useState({
        today: { count: 0, top: [], sparkline: [] },
        week: { count: 0, top: [], sparkline: [] },
        month: { count: 0, top: [], sparkline: [] }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch Now Playing
    const fetchNowPlaying = async () => {
        try {
            const res = await fetch(`${serverUrl}/api/now-playing`);
            const data = await res.json();
            if (data.nowPlaying) {
                setNowPlaying(data.nowPlaying);
                if (data.isMock) {
                    // console.warn("Using Mock Last.fm Data (API Key missing)");
                }
            }
        } catch (err) {
            console.error("Failed to fetch now playing:", err);
            setError(err.message);
        }
    };

    // Fetch Stats (Today, Week, Month)
    const fetchStats = async () => {
        try {
            const periods = ['today', 'week', 'month'];
            const results = {};

            await Promise.all(periods.map(async (p) => {
                const res = await fetch(`${serverUrl}/api/recent/${p}`);
                const data = await res.json();
                results[p] = {
                    count: parseInt(data.totalScrobbles || 0),
                    top: data.topArtists || [],
                    sparkline: data.sparkline || []
                };
            }));

            setStats(results);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch stats:", err);
        }
    };

    useEffect(() => {
        // Initial Fetch
        fetchNowPlaying();
        fetchStats();

        // Poll for Now Playing
        const interval = setInterval(fetchNowPlaying, REFRESH_INTERVAL_MS);

        // Refresh stats less frequently (every minute)
        const statsInterval = setInterval(fetchStats, 60000);

        return () => {
            clearInterval(interval);
            clearInterval(statsInterval);
        };
    }, []);

    if (loading && !nowPlaying) {
        return (
            <div className="w-full h-48 glass-panel animate-pulse flex items-center justify-center text-gray-500">
                Loading live data...
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
            {/* 1. Feature: Now Playing Card */}
            <div className="lg:col-span-1 glass-panel p-0 overflow-hidden relative group">
                {/* Background Image Blur */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl transition-all duration-700"
                    style={{ backgroundImage: nowPlaying?.image ? `url(${nowPlaying.image})` : 'none' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/80" />

                <div className="relative z-10 p-6 h-full flex flex-col justify-between min-h-[220px]">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neon-cyan/80">
                            {nowPlaying?.isPlaying ? (
                                <>
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-cyan"></span>
                                    </span>
                                    On Air Now
                                </>
                            ) : (
                                <span className="flex items-center gap-2 text-gray-400">
                                    <Clock size={12} /> Last Played
                                </span>
                            )}
                        </div>
                        <Disc className={`text-white/20 ${nowPlaying?.isPlaying ? 'animate-spin-slow' : ''}`} size={20} />
                    </div>

                    <div className="flex gap-4 items-center mt-4">
                        {/* Album Art */}
                        <div className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden shadow-2xl ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-500">
                            {nowPlaying?.image ? (
                                <img src={nowPlaying.image} alt="Album Art" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                    <Music size={32} className="text-gray-600" />
                                </div>
                            )}
                        </div>

                        {/* Text Info */}
                        <div className="flex flex-col overflow-hidden">
                            <h3 className="text-xl font-bold text-white truncate leading-tight mb-1">
                                {nowPlaying?.name || "Nothing Playing"}
                            </h3>
                            <p className="text-sm text-gray-300 truncate font-medium">
                                {nowPlaying?.artist || "..."}
                            </p>
                            <p className="text-xs text-gray-500 truncate mt-1">
                                {nowPlaying?.album}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Feature: Recent Stats Grid */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatBit
                    label="Today"
                    count={stats.today.count}
                    top={stats.today.top}
                    sparkline={stats.today.sparkline}
                    color="#facc15" // Yellow
                    icon={<Clock size={14} />}
                />
                <StatBit
                    label="This Week"
                    count={stats.week.count}
                    top={stats.week.top}
                    sparkline={stats.week.sparkline}
                    color="#a78bfa" // Purple
                    icon={<Calendar size={14} />}
                />
                <StatBit
                    label="This Month"
                    count={stats.month.count}
                    top={stats.month.top}
                    sparkline={stats.month.sparkline}
                    color="#00ffcc" // Cyan
                    icon={<Activity size={14} />}
                />
            </div>
        </motion.div>
    );
}

// Sub-component for formatted small cards
function StatBit({ label, count, top, sparkline, color, icon }) {
    return (
        <div className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-colors">
            {/* Header */}
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {icon} {label}
                </div>
                <div
                    className="text-2xl font-black tabular-nums tracking-tighter drop-shadow-sm transition-all duration-300 group-hover:scale-110 origin-right"
                    style={{ color: color }}
                >
                    {count}
                </div>
            </div>

            {/* Top Artist */}
            <div className="relative z-10 mb-3">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-0.5 opacity-60">Top Artist</div>
                <div className="text-sm font-bold text-white truncate">
                    {top && top.length > 0 ? top[0].name : "—"}
                </div>
                <div className="text-[10px] text-gray-400">
                    {top && top.length > 0 ? `${top[0].count} plays` : ""}
                </div>
            </div>

            {/* Mini Sparkline Visualization */}
            <div className="h-8 flex items-end gap-[2px] opacity-50 group-hover:opacity-100 transition-opacity">
                {sparkline.length > 0 ? (
                    sparkline.map((val, i) => {
                        const max = Math.max(...sparkline, 1);
                        const heightPct = (val / max) * 100;
                        return (
                            <div
                                key={i}
                                className="flex-1 rounded-t-sm transition-all duration-500"
                                style={{
                                    height: `${Math.max(heightPct, 5)}%`,
                                    backgroundColor: color
                                }}
                            />
                        )
                    })
                ) : (
                    <div className="w-full text-center text-[10px] text-gray-600">No data</div>
                )}
            </div>

            {/* Glow Effect */}
            <div
                className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
                style={{ backgroundColor: color }}
            />
        </div>
    );
}
