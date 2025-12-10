import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Disc, Clock, Calendar, Activity, Radio, X } from 'lucide-react';

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
        return () => clearInterval(statsInterval);
    }, []);

    if (loading && !nowPlaying && !stats.today.count) {
        return (
            <div className="w-full h-48 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md animate-pulse flex items-center justify-center text-gray-500 font-mono">
                INITIALIZING_SYSTEM...
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
            <div className="lg:col-span-1 relative group rounded-3xl overflow-hidden min-h-[220px]">
                {/* 
                   Cutting Edge Backdrops:
                   Deep blur + Saturation boost for that "Vivid Glass" look.
                */}
                <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-3xl backdrop-saturate-200" />

                {/* Animated Gradient Mesh Background */}
                <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-700">
                    <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_50%_50%,_rgba(76,29,149,0.5),transparent_60%)] animate-[spin_12s_linear_infinite]" />
                    <div className="absolute top-[20%] left-[20%] w-[80%] h-[80%] bg-[radial-gradient(circle_at_50%_50%,_rgba(236,72,153,0.3),transparent_50%)] animate-[pulse_4s_ease-in-out_infinite]" />
                </div>

                {/* Image Background (if available) - Increased visibility as requested */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-60 blur-md transition-all duration-700 group-hover:blur-sm group-hover:scale-110 group-hover:opacity-70"
                    style={{ backgroundImage: nowPlaying?.image ? `url(${nowPlaying.image})` : 'none' }}
                />

                {/* Glass Border */}
                <div className="absolute inset-0 rounded-3xl border border-white/10 z-20 pointer-events-none group-hover:border-white/20 transition-colors" />

                <div className="relative z-30 p-6 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest font-mono text-neon-cyan/80">
                            {nowPlaying?.isPlaying ? (
                                <>
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-cyan"></span>
                                    </span>
                                    LIVE_SIGNAL
                                </>
                            ) : (
                                <span className="flex items-center gap-2 text-gray-400">
                                    <Disc size={12} />
                                    {nowPlaying?.timestamp ? (
                                        Math.floor((Date.now() - (nowPlaying.timestamp * 1000)) / 60000) < 1
                                            ? 'JUST_NOW'
                                            : `T-${Math.floor((Date.now() - (nowPlaying.timestamp * 1000)) / 60000)}m`
                                    ) : 'OFFLINE'}
                                </span>
                            )}
                        </div>
                        {/* Listen In Toggle */}
                        <button
                            onClick={onToggleListen}
                            className={`p-2 rounded-full transition-all duration-300 backdrop-blur-md border border-white/10 ${isListening ? 'bg-neon-pink/20 text-neon-pink shadow-[0_0_20px_rgba(236,72,153,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                            title={isListening ? "Stop Listening" : "Start Radio"}
                        >
                            {isListening ? <X size={16} /> : <Radio size={16} />}
                        </button>
                    </div>

                    <div className="mt-6">
                        <h2 className="text-3xl font-black text-white leading-tight mb-2 drop-shadow-lg truncate tracking-tight">
                            {nowPlaying?.name || "No Signal"}
                        </h2>
                        <h3 className="text-lg text-white/70 font-medium truncate font-mono tracking-tight">
                            {nowPlaying?.artist || "Standby..."}
                        </h3>
                        <div className="text-xs text-white/40 mt-1 font-mono uppercase tracking-widest">
                            {nowPlaying?.album || "---"}
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

// Advanced Glass Stat Card
function StatBit({ label, count, top, sparkline, color, icon }) {
    const getTooltipLabel = (index, totalBars) => {
        const isToday = label.toLowerCase().includes('24h') || label.toLowerCase().includes('today');
        const isWeek = label.toLowerCase().includes('week') || label.toLowerCase().includes('7 days');
        const isMonth = label.toLowerCase().includes('30 days') || label.toLowerCase().includes('month');

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
        <div className="relative group rounded-3xl overflow-hidden p-5 flex flex-col justify-between h-full bg-black/20 backdrop-blur-xl backdrop-saturate-150 border border-white/5 hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_30px_rgba(0,0,0,0.3)]">

            {/* Ambient Light/Glow Background */}
            <div className="absolute -top-[50%] -right-[50%] w-[100%] h-[100%] rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-700 blur-[80px]"
                style={{ backgroundColor: color }} />

            {/* Header */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2 text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] font-mono group-hover:text-white transition-colors">
                    {icon} {label}
                </div>
                <div
                    className="text-3xl font-black tabular-nums tracking-tighter transition-all duration-300 group-hover:scale-110 origin-right drop-shadow-xl"
                    style={{ color: color }}
                >
                    {count}
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Top Artist */}
                <div className="mb-4">
                    <div className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1 font-mono">Top Artist</div>
                    <div className="text-sm font-bold text-white truncate group-hover:translate-x-1 transition-transform">
                        {top && top.length > 0 ? top[0].name : "---"}
                    </div>
                </div>

                {/* Modern Bar Chart */}
                <div className="h-12 flex items-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                    {sparkline.length > 0 ? (
                        sparkline.map((val, i) => {
                            const max = Math.max(...sparkline, 1);
                            const heightPct = (val / max) * 100;
                            const timeLabel = getTooltipLabel(i, sparkline.length);

                            return (
                                <div key={i} className="flex-1 h-full flex items-end group/bar relative">
                                    <div
                                        className="w-full rounded-full transition-all duration-500 ease-out relative"
                                        style={{
                                            height: `${Math.max(heightPct, 8)}%`,
                                            backgroundColor: color,
                                            boxShadow: `0 0 10px ${color}20`
                                        }}
                                    >
                                        <div className="absolute inset-x-0 top-0 h-1 bg-white/40 rounded-full" />
                                    </div>

                                    {/* Glass Tooltip */}
                                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-max pointer-events-none opacity-0 group-hover/bar:opacity-100 transition-all duration-300 transform translate-y-2 group-hover/bar:translate-y-0 z-50">
                                        <div className="bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-2xl text-center">
                                            <div className="text-lg font-black leading-none mb-1" style={{ color: color }}>
                                                {val}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider whitespace-nowrap">
                                                {timeLabel}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className="w-full text-center text-[10px] text-white/20 font-mono">WAITING FOR DATA</div>
                    )}
                </div>
            </div>
        </div>
    );
}
