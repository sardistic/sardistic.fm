import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Music, Clock, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from 'recharts';

// Reuse sentiment logic
const getSentimentStyle = (text = "") => {
    const t = text.toLowerCase();
    if (t.includes('day') || t.includes('sun') || t.includes('summer') || t.includes('heat') || t.includes('aug')) return { color: '#facc15' };
    if (t.includes('night') || t.includes('dark') || t.includes('moon') || t.includes('oct') || t.includes('dec')) return { color: '#8b5cf6' };
    if (t.includes('love') || t.includes('heart') || t.includes('feb') || t.includes('spring')) return { color: '#ec4899' };
    return { color: '#06b6d4' }; // Default Cyan
};

const formatDuration = (mins) => {
    if (!mins) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function MonthDetail({ year, month, allData, onBack, metric, setMetric, onMonthClick }) {
    if (!allData || !year || !month) return null;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = monthNames.indexOf(month);
    const monthNum = String(monthIndex + 1).padStart(2, '0');
    const monthPrefix = `${year}-${monthNum}`;

    // Find monthly summary for totals and estimations
    const monthSummary = (allData.history || []).find(d => d.date === monthPrefix) || { scrobbles: 0, minutes: 0 };
    let avgDuration = monthSummary.scrobbles > 0 ? (monthSummary.minutes / monthSummary.scrobbles) : 3.5;
    // Sanity check: If average track is > 20 mins, it's likely bad data (e.g. 1000m tracks). Fallback to 3.5m.
    if (avgDuration > 20) avgDuration = 3.5;

    // Filter Data for this Month using TIMELINE (Daily Data)
    const monthDays = useMemo(() => {
        if (!allData.timeline) return [];

        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const days = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = String(d).padStart(2, '0');
            const dateKey = `${monthPrefix}-${dayStr}`;
            const scrobbles = allData.timeline[dateKey] || 0;
            const minutes = Math.round(scrobbles * avgDuration);

            days.push({
                date: dateKey,
                day: d,
                val: metric === 'minutes' ? minutes : scrobbles,
                weekday: new Date(year, monthIndex, d).getDay() // 0 = Sun
            });
        }
        return days;
    }, [allData.timeline, monthPrefix, metric, avgDuration, year, monthIndex]);

    // Derived Stats
    const totalValue = monthDays.reduce((acc, d) => acc + d.val, 0);
    const avgDaily = monthDays.length > 0 ? Math.round(totalValue / monthDays.length) : 0;

    // Day of Week Stats
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekStats = dayNames.map((name, idx) => ({ name, value: 0 }));
    monthDays.forEach(d => {
        weekStats[d.weekday].value += d.val;
    });
    const maxWeekday = weekStats.reduce((max, curr) => curr.value > max.value ? curr : max, weekStats[0]);

    // Busiest Day
    const busiestDay = monthDays.reduce((max, curr) => curr.val > max.val ? curr : max, { val: 0, date: "" });
    const busiestDateStr = busiestDay.date ? new Date(busiestDay.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : "N/A";

    // Vibe Color
    const vibeColor = getSentimentStyle(month).color;

    // Top Music Data (Derived from Month Summary)
    const topAlbums = (monthSummary.top_albums || []).slice(0, 5);
    const topArtistsMap = new Map();
    (monthSummary.top_albums || []).forEach(album => {
        if (album.artist) {
            topArtistsMap.set(album.artist, (topArtistsMap.get(album.artist) || 0) + album.count);
        }
    });
    const topArtists = Array.from(topArtistsMap.entries())
        .map(([name, count]) => ({ n: name, c: count }))
        .sort((a, b) => b.c - a.c)
        .slice(0, 5);

    // Navigation Handlers
    const handlePrev = () => {
        let newIndex = monthIndex - 1;
        let newYear = year;
        if (newIndex < 0) {
            newIndex = 11;
            newYear = (parseInt(year) - 1).toString();
        }
        if (allData.years[newYear]) { // Only navigate if data likely exists
            onMonthClick(newYear, monthNames[newIndex]);
        }
    };

    const handleNext = () => {
        let newIndex = monthIndex + 1;
        let newYear = year;
        if (newIndex > 11) {
            newIndex = 0;
            newYear = (parseInt(year) + 1).toString();
        }
        if (allData.years[newYear]) {
            onMonthClick(newYear, monthNames[newIndex]);
        }
    };

    // Year Over Year Logic
    const fullMonthName = new Date(year, monthIndex).toLocaleString('default', { month: 'long' });
    const prevYear = (parseInt(year) - 1).toString();
    const prevMonthPrefix = `${prevYear}-${monthNum}`;
    const prevMonthSummary = (allData.history || []).find(d => d.date === prevMonthPrefix);

    // Comparison Stats
    const currentDailyAvg = avgDaily;
    const prevDaysInMonth = new Date(prevYear, monthIndex + 1, 0).getDate();
    const prevDailyAvg = prevMonthSummary ? Math.round((metric === 'minutes' ? prevMonthSummary.minutes : prevMonthSummary.scrobbles) / prevDaysInMonth) : 0;
    const yoyGrowth = prevDailyAvg > 0 ? Math.round(((currentDailyAvg - prevDailyAvg) / prevDailyAvg) * 100) : 0;
    const yoyColor = yoyGrowth >= 0 ? 'text-neon-green' : 'text-red-500';
    const yoyArrow = yoyGrowth >= 0 ? '↑' : '↓';

    return (
        <div className="space-y-8 pb-32 w-full animate-fade-in text-gray-200">
            {/* Header */}
            <div className="flex items-center gap-6 mb-8">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBack}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors group backdrop-blur-md border border-white/5"
                >
                    <ArrowLeft className="text-gray-400 group-hover:text-white" size={24} />
                </motion.button>
                <div className="flex-1 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-6">
                            <motion.button onClick={handlePrev} whileHover={{ x: -2 }} className="p-2 hover:text-white text-gray-500 cursor-pointer">
                                <ChevronLeft size={36} />
                            </motion.button>

                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center min-w-[300px]"
                            >
                                <h1
                                    className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400"
                                    style={{ textShadow: `0 0 40px ${vibeColor}50` }}
                                >
                                    {fullMonthName}
                                </h1>
                                <div className="text-xl font-mono mt-2 text-gray-500 tracking-widest">{year}</div>
                            </motion.div>

                            <motion.button onClick={handleNext} whileHover={{ x: 2 }} className="p-2 hover:text-white text-gray-500 cursor-pointer">
                                <ChevronRight size={36} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Metric Toggle */}
                    <div className="flex items-center bg-[#121212] rounded-full p-1.5 border border-white/10 shadow-2xl">
                        <button
                            onClick={() => setMetric('minutes')}
                            className={`px-6 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-300 ${metric === 'minutes'
                                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            Minutes
                        </button>
                        <button
                            onClick={() => setMetric('scrobbles')}
                            className={`px-6 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-300 ${metric === 'scrobbles'
                                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            Scrobbles
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Music Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mt-10">
                {/* Top Artists Card */}
                <div className="bg-[#121212] rounded-2xl border border-white/5 overflow-hidden group shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-white/5 to-transparent">
                        <h3 className="font-bold text-xl text-white flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-neon-purple rounded-full shadow-[0_0_10px_#8b5cf6]"></span>
                            Top Artists
                        </h3>
                    </div>
                    <div className="p-0 max-h-[320px] overflow-y-auto custom-scrollbar">
                        {topArtists.length > 0 ? (
                            <div className="divide-y divide-white/5">
                                {topArtists.map((artist, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group/item">
                                        <div className="flex items-center gap-4">
                                            <span className={`font-mono font-bold text-sm w-6 text-center ${i < 3 ? 'text-neon-purple' : 'text-gray-600'}`}>#{i + 1}</span>
                                            <span className="font-bold text-gray-200 group-hover/item:text-white transition-colors truncate max-w-[200px] text-lg">{artist.n}</span>
                                        </div>
                                        <span className="text-sm font-mono text-gray-500 group-hover/item:text-neon-purple transition-colors">
                                            {metric === 'minutes' ? formatDuration(Math.round(artist.c * avgDuration)) : `${artist.c} scrobbles`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-sm p-8 text-center flex flex-col items-center justify-center h-full opacity-50">
                                <Music size={32} className="mb-3" />
                                No artist data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Albums Card */}
                <div className="bg-[#121212] rounded-2xl border border-white/5 overflow-hidden group shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-white/5 to-transparent">
                        <h3 className="font-bold text-xl text-white flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-neon-green rounded-full shadow-[0_0_10px_#22c55e]"></span>
                            Top Albums
                        </h3>
                    </div>
                    <div className="p-0 max-h-[320px] overflow-y-auto custom-scrollbar">
                        {topAlbums.length > 0 ? (
                            <div className="divide-y divide-white/5">
                                {topAlbums.map((album, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group/item relative overflow-hidden">
                                        {/* Subtle Album Art BG */}
                                        {album.url && <div className="absolute inset-0 bg-cover bg-center opacity-0 group-hover/item:opacity-20 transition-opacity duration-500 pointer-events-none blur-sm" style={{ backgroundImage: `url(${album.url})` }} />}

                                        <div className="flex items-center gap-4 relative z-10">
                                            <span className={`font-mono font-bold text-sm w-6 text-center ${i < 3 ? 'text-neon-green' : 'text-gray-600'}`}>#{i + 1}</span>
                                            {album.url ? (
                                                <img src={album.url} alt={album.name} className="w-10 h-10 rounded shadow-md object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center"><Music size={16} /></div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-200 group-hover/item:text-white transition-colors truncate max-w-[180px] leading-tight text-lg">{album.name}</span>
                                                <span className="text-xs text-gray-500 font-medium tracking-wide">{album.artist}</span>
                                            </div>
                                        </div>
                                        <span className="text-sm font-mono text-gray-500 group-hover/item:text-neon-green transition-colors relative z-10">
                                            {metric === 'minutes' ? formatDuration(Math.round(album.count * avgDuration)) : album.count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-sm p-8 text-center flex flex-col items-center justify-center h-full opacity-50">
                                <Music size={32} className="mb-3" />
                                No album data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#121212] p-6 rounded-2xl border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">Daily Average</div>
                        {prevYear && (
                            <div className={`text-xs font-mono font-bold ${yoyColor} flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full`}>
                                {yoyArrow} {Math.abs(yoyGrowth)}%
                                <span className="text-gray-600 font-normal ml-1">vs {prevYear}</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-5xl font-black text-white tracking-tighter mb-1">
                            {metric === 'minutes' ? `${avgDaily}m` : avgDaily}
                        </div>
                        <div className="text-sm text-gray-500">per day on average</div>
                    </div>
                </div>
                <div className="bg-[#121212] p-6 rounded-2xl border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">Busiest Day</div>
                        <Clock size={16} className="text-neon-cyan opacity-50" />
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-white mb-1 tracking-tight">{busiestDateStr}</div>
                        <div className="text-sm text-neon-cyan font-mono opacity-80">{metric === 'minutes' ? formatDuration(busiestDay.val) : `${busiestDay.val} scrobbles`}</div>
                    </div>
                </div>
                <div className="bg-[#121212] p-6 rounded-2xl border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">Favorite Weekday</div>
                        <Calendar size={16} style={{ color: vibeColor }} className="opacity-50" />
                    </div>
                    <div className="text-5xl font-black text-white tracking-tighter" style={{ color: vibeColor }}>{maxWeekday.name}</div>
                </div>
            </div>

            {/* Daily Rhythm (Returned to BarChart) */}
            <div className="bg-[#121212] p-8 rounded-3xl border border-white/5 relative group mb-8">
                <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-white">
                    <BarChart2 size={24} style={{ color: vibeColor }} />
                    Daily Rhythm
                </h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthDays} barSize={12}>
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={vibeColor} stopOpacity={1} />
                                    <stop offset="100%" stopColor={vibeColor} stopOpacity={0.3} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis
                                dataKey="day"
                                stroke="#444"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                interval={2}
                                dy={10}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 4 }}
                                formatter={(value) => [
                                    metric === 'minutes' ? formatDuration(value) : `${value} scrobbles`,
                                    metric === 'minutes' ? 'Duration' : 'Volume'
                                ]}
                                labelFormatter={(label) => `${month} ${label}`}
                                labelStyle={{ color: '#888', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}
                            />
                            <Bar dataKey="val" radius={[6, 6, 6, 6]} fill="url(#barGradient)">
                                {monthDays.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.val === busiestDay.val ? '#ffffff' : "url(#barGradient)"}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Weekly Distribution */}
            <div className="bg-[#121212] p-8 rounded-3xl border border-white/5 h-80 relative group flex flex-col">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                    <Calendar size={24} style={{ color: vibeColor }} />
                    Weekly Pattern
                </h3>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weekStats} barSize={32}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis dataKey="name" stroke="#444" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 4 }}
                                formatter={(value) => [
                                    metric === 'minutes' ? formatDuration(value) : `${value} scrobbles`,
                                    metric === 'minutes' ? 'Avg Duration' : 'Total Volume'
                                ]}
                                labelStyle={{ color: '#888' }}
                            />
                            <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                                {weekStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === maxWeekday.name ? vibeColor : '#333'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="text-center text-gray-600 text-sm mt-8 opacity-50">
                Detailed artist stats for individual months are not yet available.
            </div>
        </div>
    );
}
