import React, { useState, useMemo } from 'react';
import { ArrowRight, BarChart3, Calendar, Disc, Moon, Sun, ChevronLeft, ChevronRight, User as UserIcon, BookOpen, Music, Layers } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';

import MagneticText from './MagneticText';
import NowPlaying from './NowPlaying';

function Overview({ data, onYearClick, onArtistClick, onLibraryClick, metric, setMetric }) {
    const [hoveredYear, setHoveredYear] = useState(null);
    const [hoveredMonth, setHoveredMonth] = useState(null); // Format: "YYYY-MM"
    const { meta, timeline, years } = data;

    // Helper: Format Duration (Minutes -> Readable) - Moved up for Tooltip access
    const formatDuration = (mins) => {
        if (!mins) return '0m';
        const y = Math.floor(mins / 525600);
        let rem = mins % 525600;
        const mo = Math.floor(rem / 43800);
        rem %= 43800;
        const w = Math.floor(rem / 10080);
        rem %= 10080;
        const d = Math.floor(rem / 1440);
        rem %= 1440;
        const h = Math.floor(rem / 60);

        const parts = [];
        if (y > 0) parts.push(`${y}y`);
        if (mo > 0) parts.push(`${mo}mo`);
        if (w > 0) parts.push(`${w}w`);
        if (d > 0) parts.push(`${d}d`);
        if (h > 0 && parts.length < 2) parts.push(`${h}h`);

        return parts.slice(0, 3).join(' ') || `${mins}m`;
    };

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Use Pixels for gradient position (more stable than %)
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    const Toggle = () => (
        <div className="flex items-center bg-[#121212] rounded-full p-1 border border-white/10 shadow-lg">
            <button
                onClick={() => setMetric('minutes')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${metric === 'minutes' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Time
            </button>
            <button
                onClick={() => setMetric('scrobbles')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${metric === 'scrobbles' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Plays
            </button>
        </div>
    );

    // Calculate Global Max for Normalization
    const allYears = Object.values(years);
    const maxYearPlays = Math.max(...allYears.map(y => y.total || 0), 1);



    // Prepare Timeline Data (Monthly)
    const monthlyTimeline = useMemo(() => {
        if (!data.history) return [];

        return data.history.map((d) => {
            const scrobbles = Number(d.scrobbles) || 0;
            const minutes = Number(d.minutes) || 0;
            const val = metric === 'minutes' ? (minutes || Math.round(scrobbles * 3.5)) : scrobbles;

            let label = d.date;
            try {
                label = new Date(d.date + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            } catch (e) { /* ignore */ }

            return {
                date: d.date, // YYYY-MM
                label: label,
                year: d.date.split('-')[0],
                value: val,
                // Normalized curve 0.6 power for visibility
                normalized_plays: Math.pow(val, 0.6),
                top_albums: d.top_albums || [],
                img: d.img || null
            };
        });
    }, [data, metric]);

    // 2. Yearly Data for the Grid



    // 2. Yearly Data for the Grid
    const timelineData = useMemo(() => {
        return Object.entries(years).map(([year, info]) => {
            // Calculate Day/Night Vibe
            const hours = info.hours || Array(24).fill(0);
            const nightPlays = (hours.slice(0, 6).reduce((a, b) => a + b, 0) || 0) + (hours.slice(18, 24).reduce((a, b) => a + b, 0) || 0);
            const dayPlays = (info.total || 0) - nightPlays;
            const isNight = nightPlays > dayPlays;

            const months = info.months || Array(12).fill(0);
            const maxMonth = Math.max(...months, 1);

            // Calculate yearly minutes from history
            const yearMinutes = data.history
                ? data.history
                    .filter(h => h.date.startsWith(year))
                    .reduce((acc, curr) => acc + (curr.minutes || 0), 0)
                : 0;

            const displayValue = metric === 'minutes' ? yearMinutes : info.total;
            const avgDailyVal = Math.round(displayValue / (year === new Date().getFullYear().toString() ? (new Date() - new Date(year, 0, 0)) / (1000 * 60 * 60 * 24) : 365));

            // Approx Day/Night Minutes based on Play Ratio
            const totalP = Math.max(info.total || 1, 1);
            const dayRatio = dayPlays / totalP;
            const dayMinutes = Math.round(yearMinutes * dayRatio);
            const nightMinutes = yearMinutes - dayMinutes;

            return {
                year,
                plays: info.total,
                minutes: yearMinutes,
                displayValue, // Dynamic value to show
                avgDaily: avgDailyVal,
                vibe: isNight ? 'night' : 'day',
                dayPlays,
                nightPlays,
                dayMinutes,
                nightMinutes,
                months: months, // Vital for the mini-waveform
                maxMonth,
                glowIntensity: (info.total / maxYearPlays) // 0 to 1
            };
        }).sort((a, b) => b.year - a.year); // Newest first
    }, [years, maxYearPlays, data.history, metric]);

    // Calculate top artists all time (basic sorting from available data)
    const topArtistsGlobally = Object.entries(data.artists)
        .sort((a, b) => b[1].t - a[1].t)
        .sort((a, b) => b[1].t - a[1].t)
        .slice(0, 1000);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-8">
            {/* 1. Real-time Now Playing & Recent Activity */}
            <NowPlaying serverUrl="http://localhost:3001" />

            {/* Hero Stats */}
            <div className="space-y-4">
                <div className="flex justify-end">
                    <Toggle />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard
                        label={metric === 'minutes' ? "Total Time" : "Total Scrobbles"}
                        value={metric === 'minutes'
                            ? formatDuration(Math.round(monthlyTimeline.reduce((a, b) => a + b.value, 0)))
                            : meta.total_scrobbles.toLocaleString()}
                        icon={<Disc className="text-neon-pink" />}
                        color="border-neon-pink/50 shadow-[0_0_20px_rgba(255,0,85,0.1)]"
                        glowColor="#ff0055"
                    />
                    <div onClick={onLibraryClick} className="cursor-pointer group">
                        <StatCard
                            label="Artists"
                            value={meta.unique_artists.toLocaleString()}
                            icon={<UserIcon className="text-neon-cyan group-hover:text-white transition-colors" />}
                            color="border-neon-cyan/50 shadow-[0_0_20px_rgba(0,255,204,0.1)] group-hover:bg-neon-cyan/10 transition-colors"
                            glowColor="#00ffcc"
                        />
                    </div>
                    <StatCard
                        label="Active Years"
                        value={Object.keys(years).length}
                        icon={<Calendar className="text-neon-yellow" />}
                        color="border-neon-yellow/50 shadow-[0_0_20px_rgba(255,255,0,0.1)]"
                        glowColor="#ffff00"
                    />

                    <StatCard
                        label="Avg. Daily"
                        value={Math.round((metric === 'minutes'
                            ? monthlyTimeline.reduce((a, b) => a + b.value, 0)
                            : meta.total_scrobbles) / (data.history ? data.history.length * 30 : 1)).toLocaleString()}
                        icon={<BarChart3 className="text-neon-purple" />}
                        color="border-neon-purple/50 shadow-[0_0_20px_rgba(189,0,255,0.1)]"
                        glowColor="#bd00ff"
                        className="whitespace-nowrap"
                    />
                </div>
            </div>

            {/* Main Timeline */}
            <motion.div
                onMouseMove={handleMouseMove}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass-panel no-highlight p-6 h-[400px] flex flex-col relative overflow-hidden group"
                style={{ '--spotlight-color': '#00ffcc' }}
            >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10">
                    <span className="w-1 h-6 bg-neon-cyan rounded-full shadow-[0_0_10px_#00ffcc]"></span>
                    Listening History
                </h2>
                <div className="flex-1 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={monthlyTimeline}
                            onMouseMove={(data) => {
                                if (data) {
                                    const label = data.activeLabel;
                                    const payload = data.activePayload?.[0]?.payload;
                                    let derivedYear = null;
                                    if (label && typeof label === 'string' && label.length >= 4) {
                                        derivedYear = label.substring(0, 4);
                                    } else if (payload) {
                                        derivedYear = payload.year || (payload.date ? payload.date.substring(0, 4) : null);
                                    }
                                    if (derivedYear) {
                                        setHoveredYear(derivedYear);
                                    }
                                    // Set hovered month for mini-graph highlighting
                                    if (payload && payload.date) {
                                        setHoveredMonth(payload.date); // YYYY-MM format
                                    }
                                }
                            }}
                            onMouseLeave={() => {
                                setHoveredYear(null);
                                setHoveredMonth(null);
                            }}
                            onClick={(data) => {
                                if (data && data.activePayload && data.activePayload[0]) {
                                    const point = data.activePayload[0].payload;
                                    const derivedYear = point.year || (point.date ? point.date.substring(0, 4) : null);
                                    if (derivedYear) {
                                        onYearClick(parseInt(derivedYear));
                                    }
                                }
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <defs>
                                <linearGradient id="colorPlays" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00ffcc" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#00ffcc" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                stroke="#444"
                                tick={{ fill: '#888', fontSize: 11 }}
                                tickFormatter={(str) => str.endsWith('-01') ? str.split('-')[0] : ''}
                                interval={0}
                                height={20}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        const art = (data.top_albums && data.top_albums[0]?.url)
                                            ? data.top_albums[0].url
                                            : (data.img || 'https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png');
                                        return (
                                            <div className="bg-[#0a0a0a]/95 p-3 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md pointer-events-none">
                                                <div className="w-48 h-48 mb-3 rounded-lg overflow-hidden shadow-lg relative bg-[#1a1a1a]">
                                                    <img src={art} alt="Art" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-white font-bold text-base mb-1">{data.label}</p>
                                                    <p className="text-neon-cyan text-sm font-mono font-bold">
                                                        {metric === 'minutes' ? formatDuration(data.value) : `${data.value} plays`}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#00ffcc"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorPlays)"
                                animationDuration={800}
                            />
                            {hoveredYear && (() => {
                                const yearMonths = monthlyTimeline.filter(d =>
                                    (d.year && String(d.year) === String(hoveredYear)) ||
                                    (d.date && d.date.startsWith(String(hoveredYear)))
                                );
                                if (yearMonths.length > 0) {
                                    return (
                                        <ReferenceArea
                                            x1={yearMonths[0].date}
                                            x2={yearMonths[yearMonths.length - 1].date}
                                            fill="#00ffcc"
                                            fillOpacity={0.15}
                                            stroke="#00ffcc"
                                            strokeOpacity={0.3}
                                            strokeWidth={1}
                                        />
                                    );
                                }
                                return null;
                            })()}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Years Grid */}
            <div>
                <h2 className="text-xl font-bold mb-4 text-neon-pink drop-shadow-sm">Deep Dive by Year</h2>
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                >
                    {timelineData.map(y => {
                        return (
                            <YearCard
                                key={y.year}
                                y={y}
                                hoveredYear={hoveredYear}
                                hoveredMonth={hoveredMonth}
                                setHoveredYear={setHoveredYear}
                                onYearClick={onYearClick}
                                handleMouseMove={handleMouseMove}
                                metric={metric}
                            />
                        );
                    })}
                </motion.div>
            </div>

            {/* Favorites Section (Artists, Albums, Tracks) */}
            <FavoritesSection
                data={data}
                onArtistClick={onArtistClick}
            />
        </div>
    );
}


function FavoritesSection({ data, onArtistClick }) {
    const [tab, setTab] = useState('artists'); // 'artists', 'albums', 'tracks'
    const [highlightBooks, setHighlightBooks] = useState(false);
    const [page, setPage] = useState(1);
    const PER_PAGE = 24;

    // Prepare Items based on Tab
    const items = useMemo(() => {
        if (tab === 'artists') {
            return Object.entries(data.artists)
                .map(([name, stats]) => ({
                    id: name,
                    name: name,
                    sub: 'Artist',
                    count: stats.t,
                    img: stats.img,
                    is_book: stats.is_book
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 500);
        } else if (tab === 'albums') {
            return (data.albums || []).map(a => ({
                id: `${a.name}-${a.artist}`,
                name: a.name,
                sub: a.artist,
                count: a.count,
                img: a.url,
                is_book: a.is_book
            }));
        } else {
            return (data.tracks || []).map(t => ({
                id: `${t.name}-${t.artist}`,
                name: t.name,
                sub: t.artist,
                count: t.count,
                img: t.img,
                is_book: t.is_book
            }));
        }
    }, [tab, data]);

    const totalPages = Math.ceil(items.length / PER_PAGE);
    const displayed = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    // Reset page on tab change
    React.useEffect(() => setPage(1), [tab]);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    return (
        <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="glass-panel p-6"
        >
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-neon-yellow drop-shadow-sm">All-Time Favorites</h2>

                    {/* Tabs */}
                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                        {['artists', 'albums', 'tracks'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${tab === t ? 'bg-white/10 text-neon-cyan shadow-sm' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Audiobook Toggle */}
                    <button
                        onClick={() => setHighlightBooks(!highlightBooks)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${highlightBooks
                            ? 'bg-neon-pink/10 border-neon-pink text-neon-pink shadow-[0_0_10px_rgba(244,114,182,0.3)]'
                            : 'bg-black/20 border-white/10 text-gray-500 hover:border-white/30'
                            }`}
                    >
                        <BookOpen size={14} />
                        <span className="text-xs font-bold">Highlight Books</span>
                    </button>

                    {/* Pagination */}
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30"
                        >
                            <ChevronLeft size={20} className="text-white" />
                        </button>
                        <span className="text-sm font-mono flex items-center text-gray-500 min-w-[60px] justify-center">
                            {page} / {totalPages}
                        </span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30"
                        >
                            <ChevronRight size={20} className="text-white" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {displayed.map((item, idx) => {
                    const isBook = item.is_book;
                    const shouldHighlight = highlightBooks && isBook;

                    return (
                        <motion.div
                            key={item.id + idx}
                            onMouseMove={handleMouseMove}
                            whileHover={{ scale: 1.05, y: -5 }}
                            onClick={() => tab === 'artists' && onArtistClick(item.name)}
                            className={`glass-panel relative overflow-hidden rounded-xl cursor-pointer group aspect-square transition-all duration-300 ${shouldHighlight ? 'ring-2 ring-neon-pink shadow-[0_0_20px_rgba(244,114,182,0.4)]' : ''
                                }`}
                            style={{ '--spotlight-color': isBook ? '#f472b6' : '#ffff00' }}
                        >
                            {/* Background Image */}
                            {item.img ? (
                                <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                    style={{ backgroundImage: `url(${item.img})` }}
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                                    <Disc size={40} className="text-white/10" />
                                </div>
                            )}

                            {/* Overlay */}
                            <div className={`absolute inset-0 transition-colors ${shouldHighlight ? 'bg-neon-pink/10 group-hover:bg-neon-pink/20' : 'bg-black/40 group-hover:bg-black/20'}`} />

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                <div className="flex justify-between items-start">
                                    <span className="text-2xl font-black text-white/10 group-hover:text-white/30 transition-colors">
                                        #{((page - 1) * PER_PAGE) + idx + 1}
                                    </span>
                                    {isBook && (
                                        <BookOpen size={16} className={`text-neon-pink drop-shadow-md ${shouldHighlight ? 'opacity-100' : 'opacity-50'}`} />
                                    )}
                                </div>

                                <div className={`font-bold text-white text-sm leading-tight mb-0.5 relative z-10 truncate ${shouldHighlight ? 'text-neon-pink' : 'group-hover:text-neon-yellow'} transition-colors`}>
                                    {item.name}
                                </div>
                                <div className="text-[10px] text-gray-300 relative z-10 truncate opacity-80">{item.sub}</div>
                                <div className="text-[10px] text-gray-400 relative z-10 mt-1">{item.count.toLocaleString()} plays</div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </motion.div>
    );
}


function StatCard({ label, value, icon, color, glowColor = 'rgba(255,255,255,0.5)', className }) {
    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    return (
        <motion.div
            onMouseMove={handleMouseMove}
            whileHover={{ y: -5 }}
            className={`glass-panel no-highlight p-4 flex items-center justify-between group relative overflow-hidden ${className || ''}`}
            style={{
                '--mouse-x': '50%',
                '--mouse-y': '50%',
                '--spotlight-color': glowColor
            }}
        >
            {/* Left Color Stripe */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5"
                style={{ backgroundColor: glowColor, boxShadow: `0 0 10px ${glowColor}` }}
            />

            <div className="pl-2"> {/* Offset for stripe */}
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</div>
                <div
                    className="text-2xl font-black transition-colors"
                    style={{ color: glowColor, textShadow: `0 0 20px ${glowColor}40` }}
                >
                    {value}
                </div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl shadow-inner group-hover:bg-white/10 transition-colors">
                {icon}
            </div>
        </motion.div>
    );
}

export default Overview;

function YearCard({ y, hoveredYear, hoveredMonth, setHoveredYear, onYearClick, metric }) {
    // Determine active state
    const isActive = String(hoveredYear) === String(y.year);

    // Lens Effect State
    const mouseX = useMotionValue(Infinity);
    const mouseY = useMotionValue(Infinity);

    function handleLocalMouseMove(e) {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
        setHoveredYear(String(y.year));
    }

    // Dynamic Metrics
    const isMins = metric === 'minutes';
    const mainValue = isMins ? (y.minutes || 0) : y.plays;
    const dayValue = isMins ? (y.dayMinutes || 0) : y.dayPlays;
    const nightValue = isMins ? (y.nightMinutes || 0) : y.nightPlays;

    // Format: "5d 10h" or "12,345"
    const format = (n) => {
        if (!isMins) return Math.round(n || 0).toLocaleString();

        const mins = Math.round(n || 0);
        if (mins < 60) return `${mins}m`;

        // Convert to Days/Hours/Mins
        const d = Math.floor(mins / 1440);
        const h = Math.floor((mins % 1440) / 60);
        const m = mins % 60;

        if (d > 0) return `${d}d ${h}h`; // "52d 10h"
        return `${h}h ${m}m`; // "5h 30m"
    };



    return (
        <motion.div
            layout
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onMouseMove={handleLocalMouseMove}
            onMouseEnter={() => setHoveredYear(String(y.year))}
            onMouseLeave={() => {
                setHoveredYear(null);
                mouseX.set(Infinity);
                mouseY.set(Infinity);
            }}
            variants={{
                active: { scale: 1.35, zIndex: 100, opacity: 1, borderColor: '#00ffcc', y: 0, backgroundColor: 'rgba(0, 255, 204, 0.15)' },
                inactive: { scale: 1, zIndex: 1, opacity: hoveredYear ? 0.3 : 1, borderColor: '#00000000', y: 0, backgroundColor: 'rgba(255, 255, 255, 0)' }
            }}
            animate={isActive ? "active" : "inactive"}
            onClick={() => onYearClick(y.year)}
            className={`glass-panel p-4 cursor-pointer relative overflow-hidden group transition-transform duration-300 ease-out`}
            style={{
                '--spotlight-color': '#00ffcc',
                transform: isActive ? 'scale(1.35)' : 'scale(1)',
                zIndex: isActive ? 50 : 1,
                boxShadow: isActive
                    ? `0 0 ${40 + (y.glowIntensity * 50)}px rgba(0, 255, 204, ${0.6 + (y.glowIntensity * 0.4)})`
                    : `0 0 ${5 + (y.glowIntensity * 10)}px rgba(0, 255, 204, ${0.05 + (y.glowIntensity * 0.05)})`
            }}
        >
            {/* Waveform Bottom Bar (Background) */}
            <div
                className="absolute left-0 right-0 bottom-0 transition-all duration-300 bg-black/60 overflow-hidden rounded-b-md z-0 border-t border-white/5"
                style={{ height: isActive ? '60%' : '4px' }}
            >
                <div className="flex items-end justify-between w-full h-full gap-[1px] px-1 opacity-50 pb-4">
                    {y.months.map((m, i) => {
                        const height = (m / (Math.max(...y.months) || 1)) * 80;

                        // Calculate day/night split based on year's overall ratio
                        const totalPlays = y.dayPlays + y.nightPlays;
                        const dayPercent = totalPlays > 0 ? (y.dayPlays / totalPlays) : 0.5;
                        const nightPercent = 1 - dayPercent;

                        // Check if this month is hovered (month index 0-11, format YYYY-MM)
                        const monthDate = `${y.year}-${String(i + 1).padStart(2, '0')}`;
                        const isMonthHovered = hoveredMonth === monthDate;

                        if (isMonthHovered) {
                            console.log(`Month ${monthDate} is hovered! hoveredMonth=${hoveredMonth}`);
                        }

                        return (
                            <div
                                key={i}
                                className={`flex-1 mx-[1px] min-w-[2px] flex flex-col justify-end transition-all duration-200 rounded-t-sm overflow-hidden`}
                                style={{
                                    height: `${height}%`,
                                    transform: isMonthHovered ? 'scaleX(1.5)' : 'scaleX(1)',
                                    zIndex: isMonthHovered ? 10 : 1,
                                    filter: isMonthHovered ? 'brightness(1.5) drop-shadow(0 0 4px #00ffcc)' : 'none'
                                }}
                            >
                                {/* Day portion (bottom) */}
                                <div
                                    className={`w-full transition-colors duration-300 ${isMonthHovered ? 'bg-neon-cyan' : (isActive ? 'bg-yellow-400' : 'bg-white')
                                        }`}
                                    style={{ height: `${dayPercent * 100}%` }}
                                />
                                {/* Night portion (top) */}
                                <div
                                    className={`w-full transition-colors duration-300 ${isMonthHovered ? 'bg-neon-cyan' : (isActive ? 'bg-purple-400' : 'bg-white')
                                        }`}
                                    style={{ height: `${nightPercent * 100}%` }}
                                />
                            </div>
                        );
                    })}
                </div>
                {/* Month Labels Overlay (Horizontal) */}
                {isActive && (
                    <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 py-0.5 pointer-events-none">
                        {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((letter, i) => (
                            <div key={i} className="text-[8px] font-bold text-white opacity-90">{letter}</div>
                        ))}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-neon-cyan/10 to-transparent pointer-events-none" />
            </div>

            <div className={`transition-all duration-300 relative z-20 px-4`}>
                {/* Year Title */}
                <div className="text-sm text-gray-400 mb-1 font-mono transition-colors group-hover:text-neon-cyan">
                    <MagneticText
                        content={String(y.year)}
                        className="text-sm font-mono group-hover:text-neon-cyan transition-colors"
                        color="#888"
                        isActive={isActive}
                        externalMouseX={mouseX}
                        externalMouseY={mouseY}
                    />
                </div>

                {/* Total Plays (Big Number) */}
                <div className="flex justify-between items-end">
                    <div>
                        <div className="text-2xl font-bold text-white transition-colors">
                            <MagneticText
                                content={format(mainValue)}
                                color={isActive ? '#00ffcc' : 'white'}
                                isActive={isActive}
                                externalMouseX={mouseX}
                                externalMouseY={mouseY}
                            />
                        </div>
                        {/* Daily Average */}
                        <div className="text-[10px] text-gray-500 font-mono mt-1">
                            <MagneticText
                                content={`${format(y.avgDaily)}/day`}
                                color="#6b7280"
                                isActive={isActive}
                                externalMouseX={mouseX}
                                externalMouseY={mouseY}
                            />
                        </div>
                    </div>

                    {/* Vibe Icons */}
                    <div className="text-right flex flex-col items-end gap-1">
                        <MagneticText
                            content={y.vibe === 'day' ? "☀" : "☾"}
                            color={y.vibe === 'day' ? "#facc15" : "#a78bfa"}
                            isActive={isActive}
                            externalMouseX={mouseX}
                            externalMouseY={mouseY}
                            className="text-lg"
                        />
                        <div className="flex flex-col text-[9px] font-mono text-right">
                            <MagneticText
                                content={`D: ${format(dayValue)}`}
                                color="#facc15"
                                isActive={isActive}
                                externalMouseX={mouseX}
                                externalMouseY={mouseY}
                            />
                            <MagneticText
                                content={`N: ${format(nightValue)}`}
                                color="#a78bfa"
                                isActive={isActive}
                                externalMouseX={mouseX}
                                externalMouseY={mouseY}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
