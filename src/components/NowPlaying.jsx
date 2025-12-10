import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Disc, Clock, Calendar, Activity, Radio, X } from 'lucide-react';

const REFRESH_INTERVAL_MS = 10000; // 10 seconds
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop"; // Abstract dark fluid art

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
                INITIALIZING...
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
            {/* 1. Feature: Now Playing Card (3D Tilt) */}
            <TiltCard className="lg:col-span-1 min-h-[260px] relative z-10 group">
                {/* Dynamic Background Art */}
                <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl bg-black">
                    {/* Base dark layer */}
                    <div className="absolute inset-0 bg-gray-950/20 z-10 mix-blend-multiply" />

                    {/* Album Art - REDUCED BLUR */}
                    <motion.div
                        className="absolute inset-0 bg-cover bg-center z-0 opacity-100"
                        style={{
                            backgroundImage: `url(${nowPlaying?.image || FALLBACK_IMAGE})`,
                            filter: 'blur(3px) saturate(110%) brightness(0.6)',
                            scale: 1.05
                        }}
                        animate={{
                            scale: [1.05, 1.1, 1.05],
                            rotate: [0, 1, 0]
                        }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    />

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30 z-10" />

                    {/* Prismatic/Holo Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-cyan-500/20 mix-blend-overlay z-20 pointer-events-none" />

                    {/* Noise/Grain Texture */}
                    <div className="absolute inset-0 opacity-[0.05] z-20 pointer-events-none mix-blend-overlay"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
                    />

                    {/* Floating Dust Particles - INCREASED COUNT */}
                    <div className="absolute inset-0 z-20 pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                            <motion.div
                                key={i}
                                className={`absolute rounded-full opacity-60 ${i % 3 === 0 ? 'bg-cyan-300' : (i % 3 === 1 ? 'bg-purple-300' : 'bg-white')}`}
                                style={{
                                    width: Math.random() * 3 + 1 + 'px',
                                    height: Math.random() * 3 + 1 + 'px',
                                    top: Math.random() * 100 + '%',
                                    left: Math.random() * 100 + '%',
                                }}
                                animate={{
                                    y: [Math.random() * -30, Math.random() * 30],
                                    x: [Math.random() * -20, Math.random() * 20],
                                    opacity: [0, 0.7, 0]
                                }}
                                transition={{
                                    duration: Math.random() * 5 + 5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: Math.random() * 5
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div className="relative z-30 p-8 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] font-mono text-cyan-200 drop-shadow-md">
                            {nowPlaying?.isPlaying ? (
                                <>
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                                    </span>
                                    ON AIR
                                </>
                            ) : (
                                <span className="flex items-center gap-2 text-white/70">
                                    <Disc size={12} />
                                    {nowPlaying?.timestamp ? (
                                        Math.floor((Date.now() - (nowPlaying.timestamp * 1000)) / 60000) < 1
                                            ? 'JUST NOW'
                                            : `${Math.floor((Date.now() - (nowPlaying.timestamp * 1000)) / 60000)}M AGO`
                                    ) : 'IDLE'}
                                </span>
                            )}
                        </div>

                        {/* Listen Toggle */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleListen(); }}
                            className={`p-2.5 rounded-full transition-all duration-300 backdrop-blur-md border border-white/20 hover:scale-110 active:scale-95 ${isListening ? 'bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.5)]' : 'bg-black/40 text-white/80 hover:bg-white/20 hover:text-white'}`}
                        >
                            {isListening ? <X size={18} /> : <Radio size={18} />}
                        </button>
                    </div>

                    <div className="mt-8 space-y-2">
                        <h2 className="text-4xl font-black text-white leading-[0.9] drop-shadow-xl truncate tracking-tighter">
                            {nowPlaying?.name || "OFFLINE"}
                        </h2>
                        <h3 className="text-xl text-cyan-200 font-medium truncate tracking-tight opacity-95 drop-shadow-md">
                            {nowPlaying?.artist || "System Standby"}
                        </h3>
                        {nowPlaying?.album && (
                            <div className="text-xs text-white/70 font-mono uppercase tracking-widest border-l-2 border-white/40 pl-2 mt-2">
                                {nowPlaying.album}
                            </div>
                        )}
                    </div>
                </div>
            </TiltCard>

            {/* 2. Stats Cards (Also 3D) */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard3D
                    label="24h"
                    count={stats.today.count}
                    top={stats.today.top}
                    sparkline={stats.today.sparkline}
                    color="#facc15"
                    icon={<Clock size={16} />}
                />
                <StatCard3D
                    label="7 Days"
                    count={stats.week.count}
                    top={stats.week.top}
                    sparkline={stats.week.sparkline}
                    color="#a78bfa"
                    icon={<Calendar size={16} />}
                />
                <StatCard3D
                    label="30 Days"
                    count={stats.month.count}
                    top={stats.month.top}
                    sparkline={stats.month.sparkline}
                    color="#00ffcc"
                    icon={<Activity size={16} />}
                />
            </div>
        </motion.div>
    );
}

/* --- 3D Components --- */

function TiltCard({ children, className }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const rotateX = useTransform(y, [-100, 100], [5, -5]); // Inverted for natural feel
    const rotateY = useTransform(x, [-100, 100], [-5, 5]);

    function handleMouseMove(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const xPct = (mouseX / width - 0.5) * 200; // -100 to 100
        const yPct = (mouseY / height - 0.5) * 200;
        x.set(xPct);
        y.set(yPct);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    return (
        <motion.div
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
                perspective: 1000
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`rounded-3xl border border-white/10 bg-gray-900/60 backdrop-blur-2xl transition-shadow duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden ${className}`}
        >
            {/* Gloss Reflection */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none z-50"
                style={{
                    x: useTransform(x, [-100, 100], [-20, 20]),
                    y: useTransform(y, [-100, 100], [-20, 20]),
                }}
            />
            {children}
        </motion.div>
    );
}

function StatCard3D({ label, count, top, sparkline, color, icon }) {
    // Get Top Artist Image
    const topArtistImage = top && top.length > 0 ? top[0].image : null;

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
        <TiltCard className="p-0 flex flex-col justify-between h-full bg-black/40 group relative overflow-hidden">
            {/* BACKGROUND IMAGE (Top Artist) */}
            {topArtistImage ? (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-40 transition-all duration-700 group-hover:opacity-50 group-hover:scale-105"
                    style={{ backgroundImage: `url(${topArtistImage})`, filter: 'blur(3px) grayscale(50%)' }}
                />
            ) : (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-20"
                    style={{ backgroundImage: `url(${FALLBACK_IMAGE})`, filter: 'blur(10px) grayscale(100%)' }}
                />
            )}

            {/* Dark Gradient Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 z-0" />

            {/* Neon Glow underlay */}
            <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-3xl pointer-events-none z-0"
                style={{ backgroundColor: color }} />

            <div className="relative z-10 p-5 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-4" style={{ transform: "translateZ(20px)" }}>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest font-mono group-hover:text-white transition-colors drop-shadow-md">
                        {icon} {label}
                    </div>
                    <div
                        className="text-3xl font-black tabular-nums tracking-tighter transition-all duration-300 group-hover:scale-110 origin-right drop-shadow-lg"
                        style={{ color: color }}
                    >
                        {count}
                    </div>
                </div>

                <div className="relative z-10" style={{ transform: "translateZ(10px)" }}>
                    <div className="mb-4">
                        <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1 font-mono">Top Artist</div>
                        <div className="text-sm font-bold text-white truncate group-hover:translate-x-1 transition-transform drop-shadow-md">
                            {top && top.length > 0 ? top[0].name : "---"}
                        </div>
                    </div>

                    <div className="h-12 flex items-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {sparkline.length > 0 ? (
                            sparkline.map((val, i) => {
                                const max = Math.max(...sparkline, 1);
                                const heightPct = (val / max) * 100;
                                const timeLabel = getTooltipLabel(i, sparkline.length);
                                return (
                                    <div key={i} className="flex-1 h-full flex items-end group/bar relative">
                                        <div
                                            className="w-full rounded-sm transition-all duration-300 relative"
                                            style={{
                                                height: `${Math.max(heightPct, 8)}%`,
                                                backgroundColor: color,
                                                boxShadow: `0 0 5px ${color}20`
                                            }}
                                        />
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max pointer-events-none opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 z-50">
                                            <div className="bg-black/90 border border-white/20 px-2 py-1 shadow-xl text-center">
                                                <div className="text-xs font-black text-white leading-none font-mono">
                                                    {val}
                                                </div>
                                                <div className="text-[8px] text-gray-400 font-mono uppercase mt-0.5">
                                                    {timeLabel}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="w-full text-center text-[10px] text-gray-500 font-mono">NO DATA</div>
                        )}
                    </div>
                </div>
            </div>
        </TiltCard>
    );
}
