import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, motionValue } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Volume2, Disc, Radio, X, MessageSquare, Clock, Calendar, Activity } from 'lucide-react';
import TiltCard from './TiltCard';

const REFRESH_INTERVAL_MS = 10000; // 10 seconds
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop"; // Abstract dark fluid art

export default function NowPlaying({ serverUrl = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'), nowPlaying, isListening, onToggleListen }) {
    const [stats, setStats] = useState({
        today: { count: 0, top: [], topTracks: [], recentTracks: [], topAlbums: [], sparkline: [] },
        week: { count: 0, top: [], topTracks: [], recentTracks: [], topAlbums: [], sparkline: [] },
        month: { count: 0, top: [], topTracks: [], recentTracks: [], topAlbums: [], sparkline: [] }
    });
    const [loading, setLoading] = useState(true);
    const [lastActiveTime, setLastActiveTime] = useState(Date.now());

    // Update last active time when we have a track
    useEffect(() => {
        if (nowPlaying) {
            setLastActiveTime(Date.now());
        }
    }, [nowPlaying]);

    // Calculate inactivity
    const timeSinceActive = Date.now() - lastActiveTime;
    const isInactive = timeSinceActive > 20 * 60 * 1000; // 20 mins

    // Determine Status Text
    const getStatusText = () => {
        if (nowPlaying) return nowPlaying.name;
        if (!isInactive) return "SYSTEM READY";
        return "OFFLINE";
    };

    const getArtistText = () => {
        if (nowPlaying) return nowPlaying.artist;
        if (!isInactive) return "Waiting for playback...";
        return "System Standby";
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
                    topTracks: data.topTracks || [],
                    recentTracks: data.recentTracks || [],
                    topAlbums: data.topAlbums || [],
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


    // Data
    // Filter out the default "Star" image from Last.fm to prevent bright white placeholders
    const DEFAULT_STAR = "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png"; // Ensure this matches earlier edit

    // Determine what to show override
    const lastTrack = stats.today.recentTracks?.[0];
    const displayItem = nowPlaying || lastTrack;

    // Helper logic for display
    const isActuallyPlaying = !!nowPlaying;
    const isRecent = !isActuallyPlaying && !!lastTrack;

    // Status Logic
    const getStatusLabel = () => {
        if (isActuallyPlaying) return "ON AIR";
        if (isRecent) return isInactive ? "OFFLINE" : "RECENT";
        return "READY";
    };

    const statusLabel = getStatusLabel();
    const statusColor = isActuallyPlaying ? "text-cyan-200" : (isInactive ? "text-red-400" : "text-gray-400");
    const indicatorColor = isActuallyPlaying ? "bg-cyan-400 animate-pulse" : (isInactive ? "bg-red-500" : "bg-gray-500");

    let finalImage = displayItem?.image || FALLBACK_IMAGE;
    if (finalImage === DEFAULT_STAR) finalImage = FALLBACK_IMAGE; // Double check fallback

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 relative"
        >
            {/* 1. Feature: Now Playing Card (3D Tilt) */}
            <TiltCard className="lg:col-span-1 min-h-[230px] relative z-10 group">
                {/* Dynamic Background Art */}
                <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl bg-black">
                    {/* Base dark layer */}
                    <div className="absolute inset-0 bg-gray-950/20 z-10 mix-blend-multiply" />

                    {/* Album Art - Static BG with Filter */}
                    <div
                        key={finalImage} // Force re-render on image change
                        className={`absolute inset-0 bg-cover bg-center z-0 transition-all duration-1000 ${isInactive && !nowPlaying ? 'grayscale brightness-50' : 'saturate-110 brightness-75'}`}
                        style={{
                            backgroundImage: `url(${finalImage})`,
                            filter: 'blur(3px)',
                            transform: 'scale(1.05)'
                        }}
                    />


                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30 z-10" />

                    {/* Prismatic/Holo Gradient Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-cyan-500/20 mix-blend-overlay z-20 pointer-events-none transition-opacity ${isInactive ? 'opacity-20' : 'opacity-100'}`} />

                    {/* Noise/Grain Texture */}
                    <div className="absolute inset-0 opacity-[0.05] z-20 pointer-events-none mix-blend-overlay"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
                    />
                </div>

                {/* SWARM WINDOW: MOVED OUTSIDE OVERFLOW-HIDDEN to allow rogue particles to escape */}
                <div className="absolute inset-0 z-10 rounded-3xl mix-blend-screen pointer-events-none">
                    <LocalizedSwarm />
                </div>

                <div className="relative z-30 p-8 h-full flex flex-col pointer-events-none">
                    {/* HEADER */}
                    <div className="flex flex-col items-start gap-1 mb-2 pointer-events-auto">
                        <div className="flex items-center gap-3">
                            {/* Start Listening Button (Enhanced Cyberpunk) */}
                            <motion.button
                                onClick={onToggleListen}
                                className="relative group outline-none"
                                aria-label={isListening ? "Stop Listening" : "Start Listening"}
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <motion.div
                                    className={`p-3 rounded-full transition-all duration-300 ${isListening ? 'bg-rose-500/30 text-rose-400' : 'bg-white/10 text-white hover:bg-white/20 hover:text-white'}`}
                                    animate={{
                                        boxShadow: isListening ? [
                                            '0 0 20px rgba(244,63,94,0.4)',
                                            '0 0 40px rgba(244,63,94,0.8)',
                                            '0 0 20px rgba(244,63,94,0.4)'
                                        ] : [
                                            '0 0 15px rgba(244,63,94,0.3)',
                                            '0 0 30px rgba(244,63,94,0.6)',
                                            '0 0 15px rgba(244,63,94,0.3)'
                                        ],
                                        scale: isListening ? [1, 1.05, 1] : [1, 1.02, 1]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <Play
                                        size={20}
                                        className={`transition-all ${isListening ? 'animate-pulse' : ''}`}
                                        fill={isListening ? "currentColor" : "none"}
                                        strokeWidth={2.5}
                                    />
                                    {/* Pulsing rings */}
                                    <motion.div
                                        className="absolute inset-0 rounded-full bg-rose-500/20"
                                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <motion.div
                                        className="absolute inset-0 rounded-full bg-rose-500/10"
                                        animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                    />
                                </motion.div>
                            </motion.button>

                            {/* Text Stack - CLICK TO LISTEN + ON AIR */}
                            <div className="flex flex-col gap-0.5">
                                {/* Cyberpunk Text Label */}
                                <motion.div
                                    className="text-[9px] font-mono font-bold tracking-widest uppercase text-rose-400 whitespace-nowrap"
                                    animate={{
                                        textShadow: [
                                            '0 0 5px rgba(244,63,94,0.5), 0 0 10px rgba(244,63,94,0.3)',
                                            '0 0 10px rgba(244,63,94,0.8), 0 0 20px rgba(244,63,94,0.5)',
                                            '0 0 5px rgba(244,63,94,0.5), 0 0 10px rgba(244,63,94,0.3)'
                                        ],
                                        opacity: [0.7, 1, 0.7]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    ← CLICK TO LISTEN
                                </motion.div>

                                {/* ON AIR Status - Below Text */}
                                <motion.div
                                    className="flex items-center gap-2"
                                    animate={isActuallyPlaying ? {
                                        opacity: [0.9, 1, 0.9]
                                    } : {}}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                    <motion.div
                                        className={`w-2 h-2 rounded-full ${indicatorColor}`}
                                        animate={isActuallyPlaying ? {
                                            boxShadow: [
                                                '0 0 10px rgba(34, 197, 94, 0.8)',
                                                '0 0 25px rgba(34, 197, 94, 1)',
                                                '0 0 10px rgba(34, 197, 94, 0.8)'
                                            ]
                                        } : {}}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    />
                                    <motion.span
                                        className={`text-[10px] font-bold tracking-[0.2em] uppercase font-mono ${isActuallyPlaying ? 'text-green-400' : statusColor}`}
                                        animate={isActuallyPlaying ? {
                                            textShadow: [
                                                '0 0 8px rgba(34, 197, 94, 0.6)',
                                                '0 0 20px rgba(34, 197, 94, 1)',
                                                '0 0 8px rgba(34, 197, 94, 0.6)'
                                            ]
                                        } : {}}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        {statusLabel}
                                    </motion.span>
                                </motion.div>
                            </div>
                        </div>
                    </div>

                    {/* MAIN CONTENT */}
                    <div className="mt-2 pointer-events-auto">
                        <h2 className="text-4xl font-black text-white leading-[0.9] drop-shadow-xl truncate tracking-tighter">
                            {displayItem?.name || "WAITING..."}
                        </h2>
                        <h3 className="text-xl text-cyan-200 font-medium truncate tracking-tight opacity-95 drop-shadow-md">
                            {displayItem?.artist || "---"}
                        </h3>
                        {displayItem?.album && (
                            <div className="text-xs text-white/70 font-mono uppercase tracking-widest border-l-2 border-white/40 pl-2 mt-2">
                                {displayItem.album}
                            </div>
                        )}

                        {/* Recent Tracks List for Now Playing Card */}
                        {stats.today.recentTracks && stats.today.recentTracks.length > 0 && (
                            <div className="pt-6 mt-4 border-t border-white/10">
                                <div className="text-[9px] text-cyan-200/70 uppercase font-black tracking-widest mb-2 font-mono">Recently Played</div>
                                <div className="space-y-1.5">
                                    {stats.today.recentTracks.slice(0, 3).map((t, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[10px] text-white/60">
                                            <div className="w-1 h-1 rounded-full bg-cyan-400/50" />
                                            <span className="text-white/90 font-bold truncate max-w-[120px]">{t.name}</span>
                                            <span className="text-white/40 truncate">- {t.artist}</span>
                                        </div>
                                    ))}
                                </div>
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
                    topTracks={stats.today.topTracks}
                    topAlbums={stats.today.topAlbums}
                    sparkline={stats.today.sparkline}
                    color="#facc15"
                    icon={<Clock size={16} />}
                />

                <StatCard3D
                    label="7 Days"
                    count={stats.week.count}
                    top={stats.week.top}
                    topTracks={stats.week.topTracks}
                    topAlbums={stats.week.topAlbums}
                    sparkline={stats.week.sparkline}
                    color="#a78bfa"
                    icon={<Calendar size={16} />}
                />
                <StatCard3D
                    label="30 Days"
                    count={stats.month.count}
                    top={stats.month.top}
                    topTracks={stats.month.topTracks}
                    topAlbums={stats.month.topAlbums}
                    sparkline={stats.month.sparkline}
                    color="#00ffcc"
                    icon={<Activity size={16} />}
                />
            </div>
            {/* NO GLOBAL DIV - Particles are inside components now */}
        </motion.div>
    );
}

function StatCard3D({ label, count, top, topTracks, topAlbums, sparkline, color, icon }) {
    // Interactive State
    const [isHovered, setIsHovered] = useState(false);

    // Motion Values for Mouse Interaction
    const mouseX = useMotionValue(0); // 0 to 1 normalization of card width

    // "Peek" Physics: Spring-based response to mouse moving right
    // We want the peek to start engaging around 60% of width
    const peekInput = useTransform(mouseX, [0, 0.6, 1], [0, 0, 1]);
    const peekProgress = useSpring(peekInput, { stiffness: 200, damping: 20 });

    // Transformations based on peek
    // 0 = Artist View, 1 = Album View
    const artistOpacity = useTransform(peekProgress, [0, 0.5], [1, 0]);
    const artistY = useTransform(peekProgress, [0, 0.5], [0, -20]);
    const scale = useTransform(peekProgress, [0, 0.5, 1], [1, 0.98, 1]); // Subtle dip during transition

    const albumOpacity = useTransform(peekProgress, [0.3, 1], [0, 1]);
    const albumY = useTransform(peekProgress, [0.3, 1], [20, 0]);
    const albumScale = useTransform(peekProgress, [0.3, 1], [0.9, 1]);

    // Handle Mouse Move
    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const xPct = (e.clientX - rect.left) / rect.width;
        mouseX.set(xPct);
    };

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => {
        setIsHovered(false);
        mouseX.set(0); // Reset spring on leave
    };

    // Data
    // Filter out the default "Star" image from Last.fm to prevent bright white placeholders
    const DEFAULT_STAR = "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png";

    let topArtistImage = top && top.length > 0 ? top[0].image : null;
    let topAlbumImage = topAlbums && topAlbums.length > 0 ? topAlbums[0].image : null;

    if (topArtistImage === DEFAULT_STAR) topArtistImage = null;
    if (topAlbumImage === DEFAULT_STAR) topAlbumImage = null;

    // Tooltip Helper
    const getTooltipLabel = (index, totalBars) => {
        const isToday = label.toLowerCase().includes('24h') || label.toLowerCase().includes('today');
        const isWeek = label.toLowerCase().includes('week') || label.toLowerCase().includes('7 days');
        const isMonth = label.toLowerCase().includes('30 days') || label.toLowerCase().includes('month');

        if (isToday) {
            const hoursAgo = (totalBars - 1) - index;
            if (hoursAgo === 0) return "Just now";
            return `-${hoursAgo}h`;
        }
        if (isWeek || isMonth) {
            const daysAgo = (totalBars - 1) - index;
            if (daysAgo === 0) return "Today";
            return `-${daysAgo}d`;
        }
        return `${index}`;
    };

    return (
        <motion.div
            className="flex flex-col w-full h-full bg-black/40 group relative rounded-xl border border-white/5 backdrop-blur-md" // Removed overflow-hidden here
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ scale }}
        >
            {/* BACKGROUNDS CONTAINER - Clipped */}
            <div className="absolute inset-0 overflow-hidden rounded-xl">
                {/* BACKGROUND LAYER 1: Artist (Base) */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-40 transition-transform duration-700 group-hover:scale-110"
                    style={{
                        backgroundImage: topArtistImage ? `url(${topArtistImage})` : 'none',
                        filter: 'blur(3px) grayscale(40%)'
                    }}
                />

                {/* BACKGROUND LAYER 2: Album (Peek) */}
                <motion.div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: (topAlbumImage || topArtistImage) ? `url(${topAlbumImage || topArtistImage})` : 'none',
                        filter: 'blur(2px) grayscale(20%)',
                        opacity: useTransform(peekProgress, [0, 1], [0, 0.6]), // Fade in
                        zIndex: 1
                    }}
                />

                {/* Gradient & Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30 z-10" />
                <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-3xl pointer-events-none z-10"
                    style={{ backgroundColor: color }} />
            </div>

            {/* SWARM WINDOW - Moved out of clipped area to allow escapes */}
            <div className="absolute inset-0 z-10 mix-blend-screen pointer-events-none">
                <LocalizedSwarm />
            </div>

            {/* CONTENT */}
            <div className="relative z-20 p-5 flex flex-col h-full justify-between">

                {/* HEADER */}
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest font-mono group-hover:text-white transition-colors drop-shadow-md">
                        {icon} {label}
                    </div>
                    <div
                        className="text-3xl font-black tabular-nums tracking-tighter transition-all duration-300 group-hover:scale-105 origin-right drop-shadow-lg"
                        style={{ color: color }}
                    >
                        {count}
                    </div>
                </div>

                {/* MAIN BODY AREA (Swappable) */}
                <div className="relative flex-grow flex flex-col justify-center min-h-[100px]">

                    {/* VIEW 1: ARTIST + TRACKS LIST */}
                    <motion.div
                        className="absolute inset-0 flex flex-col justify-center"
                        style={{ opacity: artistOpacity, y: artistY }}
                    >
                        <div className="mb-2">
                            <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1 font-mono">Top Artist</div>
                            <div className="text-xl font-bold text-white truncate drop-shadow-md leading-tight">
                                {top && top.length > 0 ? top[0].name : "---"}
                            </div>
                        </div>

                        {/* HOVER REVEAL: Top Tracks List */}
                        {/* Only show if NOT peeking album (handled by opacity parent) */}
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: isHovered ? 'auto' : 0, opacity: isHovered ? 1 : 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-3 border-t border-white/10 mt-2">
                                <div className="text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1.5 font-mono">Top Tracks</div>
                                <div className="space-y-1">
                                    {topTracks && topTracks.slice(0, 3).map((t, i) => (
                                        <div key={i} className="text-[10px] text-white/90 font-medium truncate flex items-center gap-2">
                                            <span style={{ color: color }} className="opacity-60 font-mono text-[9px]">0{i + 1}</span>
                                            {t.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* VIEW 2: TOP ALBUM (Peek Reveal) */}
                    <motion.div
                        className="absolute inset-0 flex flex-col justify-center"
                        style={{ opacity: albumOpacity, y: albumY, scale: albumScale }}
                    >
                        <div className="flex flex-col gap-3">
                            <div className="text-[9px] text-right text-gray-300 uppercase font-black tracking-widest font-mono border-b border-white/20 pb-1 mb-1">
                                Most Played Album
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Album Art Card */}
                                <div className="w-16 h-16 rounded-md bg-white/10 shadow-lg overflow-hidden shrink-0 border border-white/20">
                                    {topAlbumImage && <img src={topAlbumImage} alt="" className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-lg font-bold text-white leading-tight truncate">
                                        {topAlbums && topAlbums.length > 0 ? topAlbums[0].name : "---"}
                                    </div>
                                    <div className="text-xs text-white/60 truncate font-medium mt-0.5">
                                        {topAlbums && topAlbums.length > 0 ? topAlbums[0].artist : ""}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <Disc size={10} className="text-gray-400" />
                                        <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">
                                            {topAlbums && topAlbums.length > 0 ? `${topAlbums[0].count} Plays` : ""}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                </div>

                {/* SPARKLINE (Increased height to fill space) */}
                <motion.div
                    className="h-16 flex items-end gap-0.5 mt-auto opacity-60"
                    style={{ opacity: useTransform(peekProgress, [0, 1], [0.6, 0.2]) }}
                >
                    {sparkline.length > 0 ? (
                        sparkline.map((val, i) => {
                            // Normalize Value
                            let total = 0;
                            let day = 0;
                            let night = 0;

                            if (typeof val === 'object') {
                                day = val.day;
                                night = val.night;
                                total = day + night;
                            } else {
                                total = val;
                            }

                            const max = sparkline.reduce((acc, v) => Math.max(acc, typeof v === 'object' ? (v.day + v.night) : v), 1);
                            const totalHeightPct = (total / max) * 100;

                            // 24H Logic: Color by Hour
                            const is24h = label.toLowerCase().includes('24h');
                            let barColor = color;

                            if (is24h) {
                                const currentHour = new Date().getHours();
                                const barHour = (currentHour - ((sparkline.length - 1) - i) + 24) % 24;
                                const isDay = barHour >= 6 && barHour < 18;
                                barColor = isDay ? '#facc15' : '#a78bfa'; // Yellow / Purple
                            }

                            return (
                                <div key={i} className="flex-1 h-full flex items-end relative group/bar px-[1px]">
                                    {/* Stacked or Colored Bar */}
                                    <div className="w-full relative transition-all duration-300 rounded-[1px] overflow-hidden"
                                        style={{ height: `${Math.max(totalHeightPct, 5)}%`, backgroundColor: is24h ? barColor : (typeof val === 'object' ? 'transparent' : color) }}>

                                        {/* If Object (7d/30d), render stack. Flex-col (Top down) so Day first? No flex-col-reverse: Bottom up. 
                                            User asked for 2 tone. I'll put Night on Bottom (purple), Day on Top (Yellow).
                                         */}
                                        {typeof val === 'object' && (
                                            <div className="w-full h-full flex flex-col-reverse">
                                                {/* Night (Purple) Bottom */}
                                                <div style={{ height: `${(night / total) * 100}%` }} className="bg-[#a78bfa] w-full transition-all" />
                                                {/* Day (Yellow) Top */}
                                                <div style={{ height: `${(day / total) * 100}%` }} className="bg-[#facc15] w-full transition-all" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover/bar:block bg-black text-white text-[9px] font-mono px-1 rounded z-50 whitespace-nowrap border border-white/20 pointer-events-none">
                                        {typeof val === 'object'
                                            ? `D:${day} N:${night}`
                                            : (is24h ? `${val} (${barColor === '#facc15' ? 'Day' : 'Night'})` : val)}
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className="w-full text-center text-[10px] text-gray-500 font-mono">NO DATA</div>
                    )}
                </motion.div>
            </div>

            {/* Peek Indicator / Hint */}
            <motion.div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center opacity-0"
                style={{ opacity: useTransform(mouseX, [0, 0.5, 0.8], [0, 0.2, 0]) }} // Hint before full reveal
            >
                {/* Arrow or visual cue could go here */}
            </motion.div>
        </motion.div>
    );
}

// --- SHARED PARTICLE COMPONENTS ---

// --- SHARED PARTICLE COMPONENTS ---

// --- LOCALIZED SWARM COMPONENT (V7) ---

function LocalizedSwarm() {
    const containerRef = useRef(null);
    const particleSystem = useRef(null);
    const mouseRef = useRef({ x: -1000, y: -1000, active: false });

    // Config
    const COUNT = 60;

    // Use layout effect to init system once we have dimensions, but standard effect is safer for SSR
    useEffect(() => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const W = rect.width;
        const H = rect.height;

        // Init Particles
        particleSystem.current = Array.from({ length: COUNT }).map(() => ({
            x: Math.random() * W,
            y: Math.random() * H,
            valX: motionValue(0), // Framer value for render
            valY: motionValue(0),
            valShadow: motionValue(`0 0 0px transparent`), // V13: Dynamic Shadow
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 3 + 1,
            color: ['#67e8f9', '#d8b4fe', '#ffffff', '#22d3ee'][Math.floor(Math.random() * 4)],
            friction: 0.94 + Math.random() * 0.04,
            speed: 0.05 + Math.random() * 0.05, // Aggressive follow
            responsiveness: 0.5 + Math.random() * 1.5, // V12: Speed Gradient (0.5x to 2.0x reaction speed)
            isRogue: Math.random() < 0.10 // V14: 10% Rogue Particles
        }));

        // Set initial values
        particleSystem.current.forEach(p => {
            p.valX.set(p.x);
            p.valY.set(p.y);
            // Boost rogues
            if (p.isRogue) {
                p.speed *= 1.5;
                p.size *= 1.2;
                p.friction = 0.96; // Less friction for better chasing
                // User didn't ask for color change, but subtle hint is nice. I'll keep default colors for now to match style.
            }
        });

        // Mouse Handlers attached to parent (window really, but logic checks bounds)
        // V8: TRACK MOUSE GLOBALLY (Outside boxes too)
        const handleMouseMove = (e) => {
            if (!containerRef.current) return;
            const r = containerRef.current.getBoundingClientRect();

            // Allow tracking anywhere on screen relative to this box
            mouseRef.current = {
                x: e.clientX - r.left, // Local X (can be negative or > width for rogues)
                y: e.clientY - r.top,  // Local Y
                active: true // Always active if mouse is moving
            };
        };

        window.addEventListener('mousemove', handleMouseMove);

        // PHYSICS LOOP
        let frameId;
        const update = () => {
            if (!containerRef.current) return;
            const r = containerRef.current.getBoundingClientRect();
            const W = r.width;
            const H = r.height;

            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;
            const isActive = mouseRef.current.active;

            particleSystem.current.forEach(p => {
                // PHYSICS: AMBIENT NOISE
                p.vx += (Math.random() - 0.5) * 0.1;
                p.vy += (Math.random() - 0.5) * 0.1;

                if (isActive) {
                    const dx = mx - p.x;
                    const dy = my - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // ANTI-CLAMPING FLOW (Regulars Only)
                    // If particle reaches the mouse ("consumed"), respawn it at the edge.
                    // This prevents static clustering and keeps the swarm moving.
                    if (!p.isRogue && dist < 20 && dist > 0) {
                        const edge = Math.floor(Math.random() * 4);
                        if (edge === 0) { p.x = Math.random() * W; p.y = -10; } // Top
                        if (edge === 1) { p.x = W + 10; p.y = Math.random() * H; } // Right
                        if (edge === 2) { p.x = Math.random() * W; p.y = H + 10; } // Bottom
                        if (edge === 3) { p.x = -10; p.y = Math.random() * H; } // Left
                        p.vx = 0; p.vy = 0;
                    } else {
                        // Attraction Physics (Both)
                        // Rogues can see mouse from infinitely far, Regulars mostly inside.
                        if (p.isRogue || dist > 1) {
                            // Normalized Pull
                            const dirX = dx / dist;
                            const dirY = dy / dist;

                            // VARIABLE FORCE:
                            // Far away (Neutral) -> Weak pull, lets them spread out via noise.
                            // Close (Hover) -> Strong pull, tightens the swarm.
                            const isFar = dist > 400;
                            const force = isFar ? 0.25 : 1.5; // V13: Stronger Far Attraction

                            // V12: Responsiveness Gradient
                            // Some particles are significantly faster to react than others
                            const finalForce = force * p.responsiveness;

                            p.vx += dirX * finalForce * p.speed;
                            p.vy += dirY * finalForce * p.speed;

                            // Add extra "spread" noise if far
                            if (isFar) {
                                p.vx += (Math.random() - 0.5) * 1.0; // V13: Increased wiggle
                                p.vy += (Math.random() - 0.5) * 1.0;
                            }
                        }
                    }
                }

                p.vx *= p.friction;
                p.vy *= p.friction;

                p.x += p.vx;
                p.y += p.vy;

                // BOUNDARIES V14
                if (!p.isRogue) {
                    // Regulars: BOUNCE (Physical Interaction)
                    if (p.x < 0) { p.x = 0; p.vx *= -1; }
                    if (p.x > W) { p.x = W; p.vx *= -1; }
                    if (p.y < 0) { p.y = 0; p.vy *= -1; }
                    if (p.y > H) { p.y = H; p.vy *= -1; }
                } else {
                    // Rogues: No Limits (Just escape!)
                    // Optional: Reset if WAY too far (prevent infinite float drift)
                    if (Math.abs(p.x) > 5000 || Math.abs(p.y) > 5000) {
                        p.x = W / 2;
                        p.y = H / 2;
                        p.vx = 0; p.vy = 0;
                    }
                }

                // Render
                p.valX.set(p.x);
                p.valY.set(p.y);

                // V13: Trailing Glow Effect
                // Offset shadow opposite to velocity to create a "motion trail"
                const trailX = -p.vx * 2;
                const trailY = -p.vy * 2;
                p.valShadow.set(`${trailX}px ${trailY}px ${p.size * 3}px ${p.color}`);
            });

            frameId = requestAnimationFrame(update);
        };

        frameId = requestAnimationFrame(update);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(frameId);
        };
    }, []);

    const particles = particleSystem.current || [];

    return (
        <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none">
            {particles.map((p, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        x: p.valX,
                        y: p.valY,
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        boxShadow: p.valShadow // V13: Dynamic Trail
                    }}
                    animate={{ opacity: [0.2, 0.6, 0.2] }}
                    transition={{ duration: 1.5 + Math.random(), repeat: Infinity }}
                />
            ))}
        </div>
    );
}

