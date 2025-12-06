import React, { useState } from 'react';
import { ArrowRight, BarChart3, Calendar, Disc, Moon, Sun, ChevronLeft, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

function Overview({ data, onYearClick, onArtistClick, onLibraryClick }) {
    const [hoveredYear, setHoveredYear] = useState(null);
    const { meta, timeline, years } = data;

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Use Pixels for gradient position (more stable than %)
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    // Calculate Global Max for Normalization
    const allYears = Object.values(years);
    const maxYearPlays = Math.max(...allYears.map(y => y.total || 0), 1);

    // Prepare timeline data
    const timelineData = Object.entries(years).map(([year, info]) => {
        // Calculate Day/Night Vibe
        const hours = info.hours || Array(24).fill(0);
        // Night: 6 PM (18:00) - 6 AM (06:00)
        const nightPlays = (hours.slice(0, 6).reduce((a, b) => a + b, 0) || 0) + (hours.slice(18, 24).reduce((a, b) => a + b, 0) || 0);

        // Day: 6 AM to 6 PM
        const dayPlays = (info.total || 0) - nightPlays;
        const isNight = nightPlays > dayPlays;

        const months = info.months || Array(12).fill(0);
        const maxMonth = Math.max(...months, 1);

        return {
            year,
            plays: info.total,
            avgDaily: Math.round(info.total / 365),
            vibe: isNight ? 'night' : 'day',
            dayPlays,
            nightPlays,
            months,
            maxMonth,
            glowIntensity: (info.total / maxYearPlays) // 0 to 1
        };
    }).sort((a, b) => a.year - b.year);

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
            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    label="Total Scrobbles"
                    value={meta.total_scrobbles.toLocaleString()}
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
                    label="Avg Daily Plays"
                    value={Math.round(meta.total_scrobbles / Object.keys(data.timeline).length || 1)}
                    icon={<BarChart3 className="text-neon-purple" />}
                    color="border-neon-purple/50 shadow-[0_0_20px_rgba(189,0,255,0.1)]"
                    glowColor="#bd00ff"
                />
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
                <div className="absolute inset-0 bg-gradient-to-b from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10">
                    <span className="w-1 h-6 bg-neon-cyan rounded-full shadow-[0_0_10px_#00ffcc]"></span>
                    Listening History
                </h2>
                <div className="flex-1 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={timelineData}
                            onMouseMove={(data) => {
                                if (data && data.activeLabel) {
                                    setHoveredYear(data.activeLabel);
                                }
                            }}
                            onMouseLeave={() => setHoveredYear(null)}
                            onClick={(data) => {
                                if (data && data.activeLabel) {
                                    onYearClick(data.activeLabel);
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
                            <XAxis dataKey="year" stroke="#444" tick={{ fill: '#888' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#121212', borderColor: '#333', boxShadow: '0 0 20px rgba(0,255,204,0.2)' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="plays"
                                stroke="#00ffcc"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorPlays)"
                            />
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
                    {timelineData.map(y => (
                        <motion.div
                            key={y.year}
                            variants={itemVariants}
                            // Mouse Move for Spotlight
                            onMouseMove={handleMouseMove}
                            onMouseEnter={() => setHoveredYear(String(y.year))}
                            onMouseLeave={() => setHoveredYear(null)}
                            animate={
                                String(hoveredYear) === String(y.year)
                                    ? { scale: 1.15, zIndex: 100, opacity: 1, borderColor: '#00ffcc' }
                                    : { scale: 1, zIndex: 1, opacity: hoveredYear ? 0.3 : 1, borderColor: 'transparent' } // Dim others
                            }
                            whileHover={{ scale: 1.15, zIndex: 100 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onYearClick(y.year)}
                            className="glass-panel p-4 cursor-pointer transition-all duration-300 relative overflow-hidden group"
                            style={{
                                '--spotlight-color': '#00ffcc',
                                boxShadow: String(hoveredYear) === String(y.year)
                                    ? `0 0 ${30 + (y.glowIntensity * 40)}px rgba(0, 255, 204, ${0.4 + (y.glowIntensity * 0.4)})` // INTENSE glow when active
                                    : `0 0 ${5 + (y.glowIntensity * 10)}px rgba(0, 255, 204, ${0.05 + (y.glowIntensity * 0.05)})` // Subtle default
                            }}
                        >
                            {/* Waveform Sidebar (Replaces Static div) */}
                            {/* Waveform Sidebar (Replaces Static div) */}
                            <div
                                className="absolute left-0 top-0 bottom-0 transition-all duration-300 bg-black/40 overflow-hidden rounded-l-md z-10 border-r border-white/5"
                                style={{ width: String(hoveredYear) === String(y.year) ? '4rem' : '0.5rem' }} // Force width based on State (Chart or Hover)
                            >
                                <svg
                                    className="w-full h-full"
                                    preserveAspectRatio="none"
                                    viewBox={`0 0 100 ${12 * 4}`} // 12 months * 4px block height
                                >
                                    {y.months.map((mPlays, i) => {
                                        const widthPercent = (mPlays / y.maxMonth) * 100;
                                        return (
                                            <rect
                                                key={i}
                                                x="0"
                                                y={i * 4}
                                                width={`${widthPercent}%`}
                                                height="4"
                                                fill="#00ffcc"
                                                className="opacity-70 transition-opacity"
                                            />
                                        );
                                    })}
                                </svg>

                                {/* Month Labels Overlay (HTML instead of SVG for crisp text) */}
                                {String(hoveredYear) === String(y.year) && (
                                    <div className="absolute inset-0 flex flex-col justify-between py-0.5 pointer-events-none">
                                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((letter, i) => (
                                            <div
                                                key={i}
                                                className="text-[8px] font-bold text-black pl-2 opacity-60 flex items-center h-full"
                                            >
                                                {letter}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Overlay gradient to make it look smooth */}
                                <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/20 to-transparent pointer-events-none" />
                            </div>

                            <div className="pl-4 group-hover:pl-16 transition-all duration-300 relative z-20"> {/* Adjusted padding for sidebar expansion */}
                                <div className="text-sm text-gray-400 mb-1 font-mono transition-colors group-hover:text-neon-cyan">{y.year}</div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div
                                            className="text-2xl font-bold text-white transition-colors"
                                            style={{ textShadow: `0 0 0 transparent` }}
                                        >
                                            <span
                                                className="group-hover:text-neon-cyan transition-colors duration-300"
                                                style={{ textShadow: `0 0 ${20 * (y.glowIntensity + 0.5)}px #00ffcc80` }}
                                            >
                                                {y.plays.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono mt-1">
                                            {y.avgDaily} / day
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-gray-600 group-hover:text-neon-cyan/50 transition-colors mb-1">
                                            {y.vibe === 'night' ? <Moon size={16} /> : <Sun size={16} />}
                                        </div>
                                        <div className="text-[10px] text-gray-700 font-mono">
                                            <span className="text-neon-yellow/70">D: {y.dayPlays.toLocaleString()}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-700 font-mono">
                                            <span className="text-neon-purple/70">N: {y.nightPlays.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute bottom-2 right-2 text-xs text-gray-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                Explore <ArrowRight size={12} className="text-neon-cyan" />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* Top Artists Preview */}
            <TopArtistsSection
                artists={topArtistsGlobally}
                onArtistClick={onArtistClick}
            />
        </div>
    );
}

function TopArtistsSection({ artists, onArtistClick }) {
    // Client-side pagination for "All-Time Favorites"
    const [page, setPage] = useState(1);
    const PER_PAGE = 24;
    const totalPages = Math.ceil(artists.length / PER_PAGE);

    const displayed = artists.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neon-yellow drop-shadow-sm">All-Time Favorites</h2>
                <div className="flex gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30"
                    >
                        <ChevronLeft size={20} className="text-white" />
                    </button>
                    <span className="text-sm font-mono flex items-center text-gray-500">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {displayed.map(([name, stats], idx) => (
                    <motion.div
                        key={name}
                        onMouseMove={handleMouseMove}
                        whileHover={{ scale: 1.05, y: -5 }}
                        onClick={() => onArtistClick(name)}
                        className="glass-panel relative overflow-hidden rounded-xl cursor-pointer group aspect-square"
                        style={{ '--spotlight-color': '#ffff00' }} // Neon Yellow for Matches Header
                    >
                        {/* Background Image */}
                        {stats.img ? (
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                style={{ backgroundImage: `url(${stats.img})` }}
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black" />
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                            <span className="absolute top-2 left-2 text-2xl font-black text-white/10 group-hover:text-white/30 transition-colors">
                                #{((page - 1) * PER_PAGE) + idx + 1}
                            </span>
                            <div className="font-bold text-white text-sm leading-tight mb-1 relative z-10 truncate group-hover:text-neon-yellow transition-colors">
                                {name}
                            </div>
                            <div className="text-[10px] text-gray-300 relative z-10">{stats.t.toLocaleString()} plays</div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

function StatCard({ label, value, icon, color, glowColor = 'rgba(255,255,255,0.5)' }) {
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
            className="glass-panel no-highlight p-4 flex items-center justify-between group relative overflow-hidden"
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
    )
}


function UserIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}

export default Overview;
