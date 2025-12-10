import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc, Music, BarChart3, Clock, Calendar, Activity, Radio, X } from 'lucide-react';
import MagneticText from './MagneticText';

const REFRESH_INTERVAL_MS = 10000; // 10 seconds

export default function NowPlaying({ serverUrl = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'), nowPlaying, isListening, onToggleListen }) {
    const [stats, setStats] = useState({
        today: { count: 0, top: [], sparkline: [] },
        week: { count: 0, top: [], sparkline: [] },
        month: { count: 0, top: [], sparkline: [] }
    });
    const [loading, setLoading] = useState(true);

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
        fetchStats();

        // Refresh stats less frequently (every minute)
        const statsInterval = setInterval(fetchStats, 60000);

        return () => {
            clearInterval(statsInterval);
        };
    }, []);

    if (loading && !nowPlaying && !stats.today.count) {
        // Only show loading if we really have nothing
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
                                    <Disc size={12} />
                                    {nowPlaying?.timestamp ? (
                                        Math.floor((Date.now() - (nowPlaying.timestamp * 1000)) / 60000) < 1
                                            ? 'Just now'
                                            : `${Math.floor((Date.now() - (nowPlaying.timestamp * 1000)) / 60000)}m ago`
                                    ) : 'Last Check in'}
                                </span>
                            )}
                        </div>
                        {/* Listen In Toggle */}
                        <button
                            onClick={onToggleListen}
                            className={`p-2 rounded-full transition-all duration-300 ${isListening ? 'bg-neon-pink text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                            title={isListening ? "Stop Listening" : "Start Radio"}
                        >
                            {isListening ? <X size={16} /> : <Radio size={16} />}
                        </button>
                    </div>

                    <div className="mt-4">
                        <h2 className="text-3xl font-black text-white leading-tight mb-1 drop-shadow-md truncate">
                            {nowPlaying?.name || "Offline"}
                        </h2>
                        <h3 className="text-xl text-gray-300 font-medium truncate">
                            {nowPlaying?.artist || "Unknown Artist"}
                        </h3>
                        <div className="text-sm text-gray-500 mt-1 font-mono">
                            {nowPlaying?.album || "Unknown Album"}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Stats Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatBit
                    label="Last 24h"
                    count={stats.today.count}
                    top={stats.today.top}
                    sparkline={stats.today.sparkline}
                    color="#facc15" // Yellow
                    icon={<Clock size={14} />}
                />
                <StatBit
                    label="Last 7 Days"
                    count={stats.week.count}
                    top={stats.week.top}
                    sparkline={stats.week.sparkline}
                    color="#a78bfa" // Purple
                    icon={<Calendar size={14} />}
                />
                <StatBit
                    label="Last 30 Days"
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
    // Helper to generate tooltip label based on index and period type
    const getTooltipLabel = (index, totalBars) => {
        const isToday = label.toLowerCase().includes('24h') || label.toLowerCase().includes('today');
        const isWeek = label.toLowerCase().includes('week') || label.toLowerCase().includes('7 days');
        const isMonth = label.toLowerCase().includes('month') || label.toLowerCase().includes('30 days');

        if (isToday) {
            const hoursAgo = (totalBars - 1) - index;
            if (hoursAgo === 0) return "Just now";
            const d = new Date();
            d.setHours(d.getHours() - hoursAgo);
            return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
        }

        if (isWeek || isMonth) {
            const daysAgo = (totalBars - 1) - index;
            if (daysAgo === 0) return "Today";
            if (daysAgo === 1) return "Yesterday";
            const d = new Date();
            d.setDate(d.getDate() - daysAgo);
            return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        }

        return `Bucket ${index + 1}`;
    };

    return (
        <div className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group hover:bg-black transition-colors duration-300 border border-white/5 hover:border-white/20">
            {/* Retro Scanline Background (Visible on Hover) */}
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 z-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]"></div>

            {/* Header */}
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-widest font-mono group-hover:text-white transition-colors">
                    {icon} {label}
                </div>
                <div
                    className="text-2xl font-black tabular-nums tracking-tighter transition-all duration-300 group-hover:scale-105 origin-right"
                    style={{
                        color: color,
                        textShadow: `0 0 10px ${color}40`
                    }}
                >
                    {count}
                </div>
            </div>

            {/* Top Artist */}
            <div className="relative z-10 mb-3">
                <div className="text-[10px] text-gray-600 uppercase font-bold mb-0.5 opacity-60 font-mono tracking-wider">Top Artist</div>
                <div className="text-sm font-bold text-white truncate group-hover:tracking-wide transition-all">
                    {top && top.length > 0 ? top[0].name : "—"}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                    {top && top.length > 0 ? `${top[0].count} plays` : ""}
                </div>
            </div>

            {/* Mini Sparkline Visualization */}
            <div className="h-10 flex items-end gap-[2px] opacity-60 group-hover:opacity-100 transition-opacity relative z-10">
                {sparkline.length > 0 ? (
                    sparkline.map((val, i) => {
                        const max = Math.max(...sparkline, 1);
                        const heightPct = (val / max) * 100;
                        const timeLabel = getTooltipLabel(i, sparkline.length);

                        return (
                            <div
                                key={i}
                                className="flex-1 rounded-sm transition-all duration-300 relative group/bar hover:opacity-100 opacity-80"
                                style={{
                                    height: `${Math.max(heightPct, 10)}%`,
                                    backgroundColor: color,
                                    boxShadow: `0 0 4px ${color}40`
                                }}
                            >
                                {/* Retro Pixel Tooltip */}
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max pointer-events-none opacity-0 group-hover/bar:opacity-100 transition-opacity duration-0 z-30">
                                    <div className="bg-black border border-white/20 px-2 py-1 shadow-[4px_4px_0px_rgba(255,255,255,0.1)] text-center min-w-[60px]"
                                        style={{ borderColor: color }}>
                                        <div className="text-sm font-black leading-none font-mono" style={{ color: color }}>
                                            {val}
                                        </div>
                                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mt-1 whitespace-nowrap font-mono">
                                            {timeLabel}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="w-full text-center text-[10px] text-gray-600 font-mono">NO DATA</div>
                )}
            </div>
        </div>
    );
}
