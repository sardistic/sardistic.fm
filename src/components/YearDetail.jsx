import React, { useMemo, useState, memo, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Sun, Moon, ChevronLeft, ChevronRight, Disc, Music, Play } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import MagneticText from './MagneticText';
import LocalizedSwarm from './LocalizedSwarm';
import monthMeta from '../data/month_meta.json';

const hexToRgb = (hex) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 255, 204';
};

// Sentiment Analysis Color Logic
const getSentimentStyle = (text = "") => {
    const t = text.toLowerCase();
    // 1. High Energy / Warmth / Day
    if (t.includes('day') || t.includes('sun') || t.includes('golden') || t.includes('summer') || t.includes('heat') || t.includes('bird') || t.includes('weekend')) {
        return { color: '#facc15', textColor: 'text-neon-yellow' };
    }
    // 2. Passion / Intensity / Love
    if (t.includes('love') || t.includes('heart') || t.includes('obsession') || t.includes('favorite') || t.includes('binge') || t.includes('pink') || t.includes('spring')) {
        return { color: '#ec4899', textColor: 'text-neon-pink' };
    }
    // 3. Cool / Fresh / Tech
    if (t.includes('fresh') || t.includes('new') || t.includes('discovery') || t.includes('rhythm') || t.includes('winter') || t.includes('cyan') || t.includes('future')) {
        return { color: '#06b6d4', textColor: 'text-neon-cyan' };
    }
    // 4. Deep / Night / Mystery
    if (t.includes('night') || t.includes('moon') || t.includes('owl') || t.includes('dark') || t.includes('silence') || t.includes('purple') || t.includes('streak') || t.includes('blood')) {
        return { color: '#8b5cf6', textColor: 'text-neon-purple' };
    }
    // 5. Fall / Earthy
    if (t.includes('fall') || t.includes('autumn') || t.includes('orange')) {
        return { color: '#f97316', textColor: 'text-orange-500' };
    }
    return { color: '#ffffff', textColor: 'text-white' };
};

// Helper: Get Color by Month Index (0-11)
const getMonthVibeColor = (monthIndex) => {
    // Winter: Dec (11), Jan (0), Feb (1) -> Cyan (Cool/Fresh)
    if (monthIndex === 11 || monthIndex === 0 || monthIndex === 1) return '#06b6d4';
    // Spring: Mar (2), Apr (3) -> Pink (Love/Bloom)
    if (monthIndex === 2 || monthIndex === 3) return '#ec4899';
    // Late Spring / Summer: May (4), Jun (5), Jul (6) -> Yellow (Sun/Energy)
    if (monthIndex === 4 || monthIndex === 5 || monthIndex === 6) return '#facc15';
    // Late Summer / Early Fall: Aug (7), Sep (8) -> Orange (Heat/Harvest)
    if (monthIndex === 7 || monthIndex === 8) return '#f97316';
    // Late Fall: Oct (9), Nov (10) -> Purple (Spooky/Deep)
    if (monthIndex === 9 || monthIndex === 10) return '#8b5cf6';

    return '#ffffff';
};

// Helper: Format Duration
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

const formatChartDuration = (mins) => {
    if (!mins) return '0m';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// Memoized Chart Component to prevent re-renders on hover
const DailyHistoryChart = memo(({ data, metric, onHoverMonth, activeMonth }) => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const lastHoveredRef = useRef(null);

    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [tooltipData, setTooltipData] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });


    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel no-highlight p-6 h-[300px] flex flex-col relative group" // Removed overflow-hidden
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMousePos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                });
            }}
            onMouseLeave={() => {
                lastHoveredRef.current = null;
                onHoverMonth(null);
                setTooltipData(null);
            }}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4 relative z-10">
                <span className={`w-1 h-6 rounded-full shadow-[0_0_10px] ${metric === 'minutes' ? 'bg-yellow-400 shadow-yellow-400' : 'bg-neon-cyan shadow-neon-cyan'}`}></span>
                Listening History <span className="text-xs text-gray-500 font-normal ml-2">(Daily)</span>
            </h2>
            <div className="flex-1 relative z-10 w-full flex items-end gap-[1px]">
                {/* Custom Bar Chart Replacement */}
                {(() => {
                    // CRITICAL: Calculate Max based on BOTH metrics to ensure a shared Y-Axis scale.
                    // We normalize Minutes by 2.4 (instead of 3.5) to ensuring the Minutes graph is VISUALLY TALLER
                    // than the Plays graph for average songs, satisfying the "Visible Difference" requirement.
                    const VISUAL_MINUTES_FACTOR = 2.4;

                    const maxPlays = Math.max(...data.map(d => d.scrobbles || 0), 1);
                    const maxMinsNorm = Math.max(...data.map(d => (d.realMinutes || 0) / VISUAL_MINUTES_FACTOR), 1);
                    const sharedMax = Math.max(maxPlays, maxMinsNorm);

                    return data.map((entry, index) => {
                        const isMatch = activeMonth === entry.monthName;
                        const isDimmed = activeMonth && !isMatch;

                        // Use sharedMax for height calculation
                        // Determine value based on metric
                        const val = metric === 'minutes'
                            ? ((entry.realMinutes || 0) / VISUAL_MINUTES_FACTOR)
                            : (entry.scrobbles || 0);

                        const heightPercent = Math.max((val / sharedMax) * 100, 2); // Min height 2%

                        return (
                            <motion.div
                                key={index}
                                className="flex-1 h-full flex items-end justify-center relative group"
                                initial="initial" // Use variant name
                                animate="idle"
                                whileHover="hover"
                                onMouseEnter={() => {
                                    if (lastHoveredRef.current !== entry.monthName) {
                                        lastHoveredRef.current = entry.monthName;
                                        onHoverMonth(entry.monthName);
                                    }
                                    setTooltipData(entry);
                                }}
                            >
                                <motion.div
                                    className="w-full rounded-t-sm origin-bottom"
                                    variants={{
                                        initial: { height: 0, opacity: 0 },
                                        idle: {
                                            height: `${heightPercent}%`,
                                            opacity: isDimmed ? 0.2 : 0.7,
                                            scaleY: 1,
                                            boxShadow: `0 0 4px ${entry.color}40`,
                                            zIndex: 1
                                        },
                                        hover: {
                                            height: `${heightPercent}%`,
                                            opacity: 1,
                                            scaleY: 1.5,
                                            zIndex: 50,
                                            boxShadow: `0 0 25px ${entry.color}, 0 0 5px white`,
                                            transition: { duration: 0.1, type: "spring", stiffness: 300, damping: 20 }
                                        }
                                    }}
                                    style={{
                                        background: `linear-gradient(to top, ${entry.color}, ${entry.color}80)`,
                                        filter: isDimmed ? 'grayscale(100%)' : 'none'
                                    }}
                                />
                            </motion.div>
                        );
                    });
                })()}
            </div>

            {/* Custom Floating Tooltip (Mimicking Overview AreaChart Tooltip) */}
            <AnimatePresence>
                {tooltipData && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute z-[100] pointer-events-none"
                        style={{
                            left: Math.min(Math.max(mousePos.x + 20, 0), 1000), // Clamp logic simplified
                            top: Math.min(Math.max(mousePos.y - 150, 0), 200),
                            transform: 'translate3d(0, 0, 0)'
                        }}
                    >
                        <div className="bg-[#0a0a0a]/95 p-3 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md min-w-[320px] max-w-[400px]">
                            <div className="flex gap-4 items-start">
                                {/* Art */}
                                <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden shadow-lg bg-[#1a1a1a]">
                                    <img
                                        src={tooltipData.top_albums?.[0]?.url || tooltipData.img || 'https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png'}
                                        alt="Art"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="mb-2">
                                        <p className="text-white font-bold text-base leading-tight">{tooltipData.label}</p>
                                        <p className="text-neon-cyan text-sm font-mono font-bold">
                                            {metric === 'minutes'
                                                ? `Time: ${formatChartDuration(tooltipData.originalValue || tooltipData.value)}`
                                                : `Plays: ${Math.round(tooltipData.value).toLocaleString()}`}
                                        </p>
                                    </div>
                                    {/* Top Album */}
                                    {tooltipData.top_albums?.[0] && (
                                        <div className="mb-1.5">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1">
                                                <Disc size={8} /> Top Album
                                            </p>
                                            <p className="text-white text-xs font-semibold truncate w-full">{tooltipData.top_albums[0].name}</p>
                                            <p className="text-gray-400 text-[10px] truncate w-full">{tooltipData.top_albums[0].artist}</p>
                                        </div>
                                    )}
                                    {/* Top Track */}
                                    {tooltipData.top_tracks?.[0] && (
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1">
                                                <Music size={8} /> Top Track
                                            </p>
                                            <p className="text-white text-xs font-semibold truncate w-full">{tooltipData.top_tracks[0].name}</p>
                                            <p className="text-gray-400 text-[10px] truncate w-full">{tooltipData.top_tracks[0].artist}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div >

    );
}, (prev, next) => {
    return prev.metric === next.metric && prev.data === next.data && prev.activeMonth === next.activeMonth;
});

export default function YearDetail({ year, data, onBack, allData, metric, setMetric, onArtistClick, onMonthClick, onYearClick, nowPlaying, isListening, onToggleListen, onPlayContext, queueLoading }) {
    if (!data) return <div>No data for {year}</div>;

    const requestRef = useRef(null);

    // --- Navigation Logic ---
    const sortedYears = Object.keys(allData?.years || {}).sort((a, b) => b - a);
    const currentIndex = sortedYears.indexOf(String(year));
    const nextYear = currentIndex > 0 ? sortedYears[currentIndex - 1] : null;
    const prevYear = currentIndex < sortedYears.length - 1 ? sortedYears[currentIndex + 1] : null;

    // --- Data Preparation ---
    const { months = [], days = [] } = data;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const [hoveredMonth, setHoveredMonth] = useState(null);


    // Daily Timeline Data (generated from allData.timeline for true daily granularity)
    const dailyTimeline = useMemo(() => {
        if (!allData?.timeline || !year) return [];

        const days = [];
        const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
        const daysInMonth = [31, isLeap(parseInt(year)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        // faster lookup for monthly averages and metadata
        const monthlyMinutesMap = new Map();
        const monthlyMetaMap = new Map();

        if (allData.history) {
            allData.history.forEach(h => {
                if (h.date.startsWith(year)) {
                    // Avoid division by zero
                    const avg = h.scrobbles > 0 ? (h.minutes || 0) / h.scrobbles : 3.5;
                    monthlyMinutesMap.set(h.date, avg);
                    // Store metadata for fallback
                    monthlyMetaMap.set(h.date, {
                        top_albums: h.top_albums,
                        top_tracks: h.top_tracks,
                        img: h.img
                    });
                }
            });
        }

        let currentMonth = 0; // 0-indexed
        let currentDay = 1;

        // Generate all dates for the year
        while (currentMonth < 12) {
            const monthStr = (currentMonth + 1).toString().padStart(2, '0');
            const dayStr = currentDay.toString().padStart(2, '0');
            const dateKey = `${year}-${monthStr}-${dayStr}`;
            const monthKey = `${year}-${monthStr}`;

            const scrobbles = allData.timeline[dateKey] || 0;
            let value = scrobbles;
            let originalValueVal = scrobbles;

            if (metric === 'minutes') {
                let rawMinutes = 0;
                // Try to use precise daily minutes from calendar
                if (allData.calendar && allData.calendar[dateKey]) {
                    rawMinutes = allData.calendar[dateKey].minutes || 0;
                } else {
                    // Fallback to monthly average estimate
                    const avg = monthlyMinutesMap.get(monthKey) || 3.5;
                    rawMinutes = scrobbles * avg;
                }

                // CRITICAL: Normalize visual height by 3.5 to align with Scrobble scale
                // This makes "Long Song" days taller than "Short Song" days relative to the Plays graph.
                value = rawMinutes / 3.5;
                originalValueVal = rawMinutes; // Tooltip shows real minutes
            }

            // Sync Color with Month Cards (Meta > Vibe > Default)
            const meta = monthMeta[monthKey] || {};
            const barColor = meta.dominantColor || getMonthVibeColor(currentMonth);

            const monthMetaEntry = monthlyMetaMap.get(monthKey) || {};

            // Daily Granularity Override
            let dailyMeta = {};
            if (allData.calendar && allData.calendar[dateKey]) {
                const c = allData.calendar[dateKey];
                dailyMeta = {
                    top_tracks: c.top_track ? [c.top_track] : [],
                    top_albums: c.top_album ? [c.top_album] : [],
                    img: c.top_track?.img || c.top_album?.img
                };
            } else {
                dailyMeta = monthMetaEntry;
            }

            // Always store real minutes for global scaling calculations
            // If calendar data is missing, fallback to the monthly average estimate just like we do for 'value' logic
            const fallbackAvg = monthlyMinutesMap.get(monthKey) || 3.5;
            const actualRealMinutes = allData.calendar?.[dateKey]?.minutes || (scrobbles * fallbackAvg);

            days.push({
                date: dateKey,
                label: dateKey,
                monthName: monthNames[currentMonth],
                value: value,
                originalValue: originalValueVal,
                realMinutes: actualRealMinutes, // PERSISTENT FIELD FOR SCALING
                color: barColor,
                scrobbles: scrobbles,
                minutes: (metric === 'minutes' && allData.calendar?.[dateKey]) ? allData.calendar[dateKey].minutes : (scrobbles * 3.5),
                ...dailyMeta
            });

            currentDay++;
            if (currentDay > daysInMonth[currentMonth]) {
                currentMonth++;
                currentDay = 1;
            }
        }

        return days;
    }, [allData, year, metric]);

    // Calculate total minutes for the year
    const { totalMins, formattedTotal } = useMemo(() => {
        let totalMins = 0;
        if (allData?.history) {
            allData.history.forEach(h => {
                if (h.date.startsWith(year)) {
                    totalMins += (h.minutes || 0);
                }
            });
        }

        const formattedTotal = totalMins > 10000
            ? `${(totalMins / 1000).toFixed(0)}k`
            : totalMins.toLocaleString();

        return {
            totalMins,
            formattedTotal
        };
    }, [year, allData, metric]);

    const handleLocalMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    // Enhanced Monthly Grid Data
    const monthlyGridData = useMemo(() => {
        return monthNames.map((m, i) => {
            const monthPrefix = `${year}-${String(i + 1).padStart(2, '0')}`;
            const daysInMonthCount = new Date(year, i + 1, 0).getDate();

            const dailyScrobbles = [];
            const dailyMinutes = [];

            // Calculate Monthly Ratio for fallback
            const monthTotalScrobbles = months[i] || 1;
            const monthHistoryEntry = (allData.history || []).find(h => h.date === monthPrefix);
            const monthTotalMinutes = monthHistoryEntry?.minutes || (monthTotalScrobbles * 3.5);
            const fallbackRatio = monthTotalMinutes / monthTotalScrobbles;

            if (allData?.timeline) {
                for (let d = 1; d <= daysInMonthCount; d++) {
                    const dayKey = `${year}-${String(i + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const sVal = allData.timeline[dayKey] || 0;

                    // Precise Minutes or Fallback
                    let mVal = 0;
                    if (allData.calendar && allData.calendar[dayKey]) {
                        mVal = allData.calendar[dayKey].minutes;
                    } else {
                        mVal = sVal * fallbackRatio;
                    }

                    dailyScrobbles.push(sVal);
                    dailyMinutes.push(mVal);
                }
            } else {
                // Empty override
                for (let d = 1; d <= daysInMonthCount; d++) {
                    dailyScrobbles.push(0);
                    dailyMinutes.push(0);
                }
            }

            // Aggregates
            const totalScrobbles = months[i] || 0;
            const totalMinutes = dailyMinutes.reduce((a, b) => a + b, 0);

            // Legacy/Display Values based on current Metric to keep compatibility
            const displayValue = metric === 'minutes' ? totalMinutes : totalScrobbles;
            const displayFormatted = metric === 'minutes' ? formatDuration(displayValue) : displayValue.toLocaleString();
            const avgDaily = Math.round(displayValue / daysInMonthCount);

            // Layout Props
            const vibeColor = getMonthVibeColor(i);
            const textColor = getSentimentStyle(m).textColor;

            return {
                month: m,
                value: displayValue,
                formattedValue: displayFormatted,
                avgDaily,
                vibeColor,
                textColor,
                daysScrobbles: dailyScrobbles, // NEW
                daysMinutes: dailyMinutes,     // NEW
                days: metric === 'minutes' ? dailyMinutes : dailyScrobbles, // Fallback for old usages
                maxDayScrobbles: Math.max(...dailyScrobbles, 1),
                maxDayMinutes: Math.max(...dailyMinutes, 1),
                topTracks: monthHistoryEntry?.top_tracks
            };
        });
    }, [year, data, allData?.history, allData?.calendar, metric, months]);

    const handleMouseMove = (e) => {
        if (requestRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const target = e.currentTarget;

        requestRef.current = requestAnimationFrame(() => {
            target.style.setProperty('--mouse-x', `${x}px`);
            target.style.setProperty('--mouse-y', `${y}px`);
            requestRef.current = null;
        });
    };

    // --- Factoid Logic (Preserved) ---
    // 1. Busiest Month
    const maxMonthIndex = (months || []).length > 0 ? months.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0) : 0;
    const busiestMonthName = monthNames[maxMonthIndex];
    const busiestMonthPlays = months[maxMonthIndex];

    // 2. Favorite Day
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayData = (days || []).map((val, i) => ({ name: dayNames[i], plays: val }));
    const maxDayIndex = (days || []).length > 0 ? days.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0) : 0;
    const favoriteDayName = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][maxDayIndex];

    // 3. Weekend Warrior
    const weekendPlays = ((days && days[5]) || 0) + ((days && days[6]) || 0);
    const weekendPercent = data.total > 0 ? Math.round((weekendPlays / data.total) * 100) : 0;

    // 4. Top Artist Obsession
    const topArtist = (data.top_artists || [])[0];
    const topArtistPercent = (topArtist && data.total > 0) ? Math.round((topArtist.c / data.total) * 100) : 0;

    // Timezone Helper
    const shiftHours = (h, offset) => {
        const shifted = new Array(24).fill(0);
        for (let i = 0; i < 24; i++) {
            let newIndex = (i + offset) % 24;
            if (newIndex < 0) newIndex += 24;
            shifted[newIndex] = h[i];
        }
        return shifted;
    };
    const rawHours = data.hours || Array(24).fill(0);
    const shiftedHours = shiftHours(rawHours, -5);
    const maxHourIndex = shiftedHours.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
    const formatHour = (h) => {
        if (h === 0) return "Midnight";
        if (h === 12) return "Noon";
        return h > 12 ? `${h - 12} PM` : `${h} AM`;
    };
    const goldenHourName = formatHour(maxHourIndex);

    // 9. New Obsession
    let newObsessionName = "None";
    let newObsessionRank = 0;
    let newObsessionPlays = 0;

    // Defensive access to current top artists
    const currentTopArtists = (data?.top_artists || []).filter(a => a && a.n);

    if (allData && allData.years) {
        const prevYear = (parseInt(year) - 1).toString();
        const prevData = allData.years[prevYear];

        if (prevData && Array.isArray(prevData.top_artists)) {
            const prevArtists = new Set((prevData.top_artists || []).filter(a => a && a.n).map(a => a.n));
            const found = (currentTopArtists || []).find(a => a && a.n && !prevArtists.has(a.n));
            if (found) {
                newObsessionName = found.n;
                newObsessionRank = currentTopArtists.indexOf(found) + 1;
                newObsessionPlays = found.c;
            }
        } else if (currentTopArtists.length > 0) {
            newObsessionName = currentTopArtists[0]?.n || "Unknown";
            newObsessionRank = 1;
            newObsessionPlays = currentTopArtists[0]?.c || 0;
        }
    }

    // 10. Late Nite Owl
    const lateNightPlays = shiftedHours.slice(0, 5).reduce((a, b) => a + b, 0);
    const lateNightPercent = data.total > 0 ? Math.round((lateNightPlays / data.total) * 100) : 0;

    // 11. Early Bird
    const earlyBirdPlays = shiftedHours.slice(5, 10).reduce((a, b) => a + b, 0);
    const earlyBirdPercent = data.total > 0 ? Math.round((earlyBirdPlays / data.total) * 100) : 0;

    // 12. Diversity Score
    const diversityScore = data.total > 0 ? Math.round(((data.top_artists || []).length / data.total) * 1000) : 0;

    // 13. Peak Day
    let peakDateStr = "N/A";
    let peakDateCount = 0;
    if (allData?.timeline) {
        const yearPrefix = `${year}-`;
        const yearDates = Object.entries(allData?.timeline || {})
            .filter(([k, v]) => k.startsWith(yearPrefix));
        if (yearDates.length > 0) {
            const [bestDate, bestCount] = yearDates.reduce((max, curr) => curr[1] > max[1] ? curr : max, yearDates[0]);
            const dateObj = new Date(bestDate);
            peakDateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            peakDateCount = bestCount;
        }
    }

    // Listening Age
    const calculateListeningAge = (topArtists, currentYear) => {
        const artistEras = {
            'The Beatles': 1965, 'Led Zeppelin': 1970, 'Pink Floyd': 1973, 'The Rolling Stones': 1965,
            'Queen': 1975, 'David Bowie': 1972, 'Fleetwood Mac': 1977, 'The Who': 1969,
            'Jimi Hendrix': 1968, 'The Doors': 1967, 'Cream': 1967, 'Black Sabbath': 1970,
            'Michael Jackson': 1983, 'Madonna': 1984, 'Prince': 1984, 'U2': 1987,
            'Depeche Mode': 1987, 'The Cure': 1989, 'Duran Duran': 1983, 'New Order': 1983,
            'The Smiths': 1985, 'R.E.M.': 1987, 'Talking Heads': 1983, 'Joy Division': 1980,
            'Nirvana': 1991, 'Radiohead': 1997, 'Oasis': 1995, 'Red Hot Chili Peppers': 1991,
            'Pearl Jam': 1992, 'Smashing Pumpkins': 1995, 'Blur': 1994, 'The Prodigy': 1997,
            'Portishead': 1994, 'Massive Attack': 1991, 'Daft Punk': 1997, 'Björk': 1993,
            'Coldplay': 2002, 'The Strokes': 2001, 'Arctic Monkeys': 2006, 'Muse': 2006,
            'Kanye West': 2004, 'Amy Winehouse': 2006, 'The Killers': 2004, 'Green Day': 2004,
            'LCD Soundsystem': 2005, 'Arcade Fire': 2004, 'Yeah Yeah Yeahs': 2003, 'The White Stripes': 2001,
            'Lana Del Rey': 2012, 'The Weeknd': 2015, 'Tame Impala': 2015, 'Kendrick Lamar': 2015,
            'Billie Eilish': 2019, 'Post Malone': 2018, 'Travis Scott': 2018, 'Ariana Grande': 2018,
            'Frank Ocean': 2012, 'Tyler, The Creator': 2011, 'Lorde': 2013, 'Bon Iver': 2011,
            'Olivia Rodrigo': 2021, 'Doja Cat': 2021, 'Bad Bunny': 2022, 'SZA': 2022,
            'Charli xcx': 2022, 'Sabrina Carpenter': 2023, 'Chappell Roan': 2023, 'Gracie Abrams': 2023,
            'Boygenius': 2023, 'Phoebe Bridgers': 2020, 'Clairo': 2021, 'Mitski': 2022
        };
        let totalYears = 0;
        let matchedArtists = 0;
        (data.top_artists || []).filter(a => a && a.n).slice(0, 20).forEach((artist) => {
            const matchedYear = artistEras[artist.n];
            if (matchedYear) { totalYears += matchedYear; matchedArtists++; }
            else { totalYears += parseInt(currentYear); matchedArtists++; }
        });
        if (matchedArtists === 0) return 25;
        const avgYear = Math.round(totalYears / matchedArtists);
        const now = new Date().getFullYear();
        return Math.max(10, Math.min(now - avgYear + 20, 100));
    };
    const listeningAge = calculateListeningAge((data.top_artists || []), year);

    let lifePhase = "";
    if (listeningAge <= 18) lifePhase = "Gen Z Vibes";
    else if (listeningAge <= 25) lifePhase = "Young Millennial";
    else if (listeningAge <= 35) lifePhase = "Peak Millennial";
    else if (listeningAge <= 45) lifePhase = "Gen X Energy";
    else if (listeningAge <= 60) lifePhase = "Boomer Beats";
    else lifePhase = "Classic Soul";

    // 14. Silence
    let longestBreak = 0;
    let currentBreak = 0;
    let currentStreak = 0;
    let longestStreak = 0; // Merging Logic
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const dayCount = isLeap ? 366 : 365;

    for (let d = 0; d < dayCount; d++) {
        const date = new Date(year, 0, 1 + d);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(date.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${dayStr}`;
        const plays = allData?.timeline?.[key] || 0;

        if (plays === 0) {
            currentBreak++;
            if (currentStreak > longestStreak) longestStreak = currentStreak;
            currentStreak = 0;
        } else {
            if (currentBreak > longestBreak) longestBreak = currentBreak;
            currentBreak = 0;
            currentStreak++;
        }
    }
    if (currentBreak > longestBreak) longestBreak = currentBreak;
    if (currentStreak > longestStreak) longestStreak = currentStreak;

    // 15. Fresh Favorites
    let freshFavoritesCount = 0;
    if (allData?.years) {
        const prevYear = (parseInt(year) - 1).toString();
        const prevData = allData?.years?.[prevYear];
        if (prevData && prevData.top_artists) {
            const prevArtistNames = new Set(prevData.top_artists.map(a => a.n));
            (data.top_artists || []).filter(a => a && a.n).slice(0, 20).forEach(artist => {
                if (!prevArtistNames.has(artist.n)) freshFavoritesCount++;
            });
        } else {
            freshFavoritesCount = Math.min((data.top_artists || []).length, 20);
        }
    }

    // 16. Turnover
    let turnoverRate = 0;
    if (allData?.years) {
        const prevYear = (parseInt(year) - 1).toString();
        const prevData = allData?.years?.[prevYear];
        if (prevData && prevData.top_artists) {
            const currentTop10 = new Set((data.top_artists || []).filter(a => a && a.n).slice(0, 10).map(a => a.n));
            const prevTop10 = new Set(prevData.top_artists.slice(0, 10).map(a => a.n));
            let newFaces = 0;
            currentTop10.forEach(artist => { if (!prevTop10.has(artist)) newFaces++; });
            turnoverRate = Math.round((newFaces / 10) * 100);
        } else turnoverRate = 100;
    }

    const seasons = {
        "Winter": (months[11] || 0) + (months[0] || 0) + (months[1] || 0),
        "Spring": (months[2] || 0) + (months[3] || 0) + (months[4] || 0),
        "Summer": (months[5] || 0) + (months[6] || 0) + (months[7] || 0),
        "Fall": (months[8] || 0) + (months[9] || 0) + (months[10] || 0),
    };
    const topSeason = Object.keys(seasons).reduce((a, b) => seasons[a] > seasons[b] ? a : b);
    const dailyAvg = Math.round(data.total / dayCount);

    const nightPlaysForChart = (shiftedHours.slice(0, 6).reduce((a, b) => a + b, 0) || 0) + (shiftedHours.slice(18, 24).reduce((a, b) => a + b, 0) || 0);
    const dayPlaysForChart = data.total - nightPlaysForChart;

    return (
        <div className="space-y-8 pb-10">
            {/* Header Area: Integrated Now Playing / Back */}
            <div className="relative flex items-center justify-between h-24 mb-6">

                {/* LEFT: NOW PLAYING / BACK BOX */}
                <button
                    onClick={onBack}
                    className="relative w-80 h-full rounded-xl overflow-hidden group text-left transition-transform hover:scale-[1.02]"
                >
                    {/* Dynamic Background Art */}
                    <div className="absolute inset-0 bg-black">
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-60 transition-all duration-700 group-hover:scale-110 group-hover:opacity-80 grayscale group-hover:grayscale-0"
                            style={{ backgroundImage: `url(${nowPlaying?.image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop"})` }}
                        />
                        {/* Swarm (Mini) */}
                        <div className="absolute inset-0 z-10 opacity-50 mix-blend-screen pointer-events-none">
                            <LocalizedSwarm />
                        </div>
                        {/* Overlays */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent z-20" />
                        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-20 pointer-events-none" />
                    </div>

                    {/* Content Stack */}
                    <div className="relative z-30 flex flex-col justify-center h-full px-5">
                        <div className="flex items-center gap-2 mb-1">
                            <ArrowLeft size={12} className="text-neon-pink group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[9px] font-bold text-neon-pink tracking-[0.2em] font-mono uppercase">
                                {isListening ? "NOW PLAYING" : "Overview"}
                            </span>
                        </div>

                        <div className="font-bold text-white text-lg leading-tight truncate w-full drop-shadow-md pr-4">
                            {nowPlaying?.name || "System Ready"}
                        </div>
                        <div className="text-xs text-white/60 font-medium truncate w-full pr-4">
                            {nowPlaying?.artist || "Select a year to dive in"}
                        </div>
                    </div>

                    {/* Cyber Border */}
                    <div className="absolute inset-0 border border-white/10 rounded-xl z-40 group-hover:border-white/30 transition-colors" />
                </button>


                {/* CENTER: YEAR NAVIGATION (Absolutely Centered) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-6">
                    {/* Next (Future) */}
                    <button
                        onClick={() => nextYear && onYearClick(nextYear)}
                        disabled={!nextYear}
                        className={`p-3 rounded-full transition-all ${nextYear ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-800 cursor-default'}`}
                    >
                        <ChevronLeft size={28} />
                    </button>

                    <div className="flex flex-col items-center group/title cursor-pointer" onClick={() => onPlayContext && onPlayContext(data.top_tracks)}>
                        <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-2xl group-hover/title:to-white transition-all">
                            {year}
                        </h1>
                        <div className="flex items-center gap-2 text-neon-pink opacity-0 group-hover/title:opacity-100 transition-all -mt-2">
                            <Play size={12} fill="currentColor" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">Play Year</span>
                        </div>
                    </div>

                    {/* Prev (Past) */}
                    <button
                        onClick={() => prevYear && onYearClick(prevYear)}
                        disabled={!prevYear}
                        className={`p-3 rounded-full transition-all ${prevYear ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-800 cursor-default'}`}
                    >
                        <ChevronRight size={28} />
                    </button>
                </div>


                {/* RIGHT: METRIC TOGGLE */}
                <div className="flex items-center bg-black/40 backdrop-blur-md rounded-full p-1.5 border border-white/10 shadow-xl z-20">
                    <button
                        onClick={() => setMetric('minutes')}
                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${metric === 'minutes'
                            ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        MINUTES
                    </button>
                    <button
                        onClick={() => setMetric('scrobbles')}
                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${metric === 'scrobbles'
                            ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        PLAYS
                    </button>
                </div>
            </div>

            {/* Listening History Chart (Daily) */}
            <DailyHistoryChart
                key={metric} // FORCE REMOUNT for proper scaling update
                data={dailyTimeline}
                metric={metric}
                onHoverMonth={setHoveredMonth}
                activeMonth={hoveredMonth}
            />

            {/* Deep Dive by Month Grid */}
            <div>
                <h2 className="text-xl font-bold mb-4 text-neon-pink drop-shadow-sm">Deep Dive by Month</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {monthlyGridData.map((m, i) => {
                        const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
                        const meta = monthMeta[monthKey] || {};
                        const activeColor = meta.dominantColor || m.vibeColor || '#00ffcc';
                        const displayImage = meta.imageUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop";
                        const activeColorRgb = hexToRgb(activeColor);
                        const isHovered = hoveredMonth === m.month;
                        const isLoading = queueLoading === `${year}-${String(i + 1).padStart(2, '0')}`;
                        const cardRef = useRef(null);

                        // Swarm Bar Positions (Shared Scale Logic) - HORIZONTAL LAYOUT
                        const VISUAL_MINUTES_FACTOR = 2.4;
                        const localMaxPlays = m.maxDayScrobbles || 1;
                        const localMaxMinsNorm = (m.maxDayMinutes || 1) / VISUAL_MINUTES_FACTOR;
                        const localSharedMax = Math.max(localMaxPlays, localMaxMinsNorm);
                        const MAX_WIDTH_PERCENT = 85; // Prevent hitting the absolute right edge

                        const barPositions = (m.days || []).map((val, dIdx) => {
                            // Calculate WIDTH based on metric's normalization
                            let normalizedVal = val;
                            if (metric === 'minutes') {
                                normalizedVal = val / VISUAL_MINUTES_FACTOR;
                            }

                            const widthPct = (normalizedVal / localSharedMax) * MAX_WIDTH_PERCENT;

                            return {
                                val: val, // Keep original for tooltip
                                width: Math.min(Math.max(widthPct, 1), 100), // Clamp
                                color: activeColor
                            };
                        });

                        const isMins = metric === 'minutes';
                        const format = (n) => {
                            if (isMins) return formatDuration(Math.round(n));
                            return Math.round(n).toLocaleString();
                        };

                        return (
                            <motion.div
                                key={m.month}
                                onClick={() => onMonthClick?.(year, m.month)}
                                onMouseEnter={() => setHoveredMonth(m.month)}
                                onMouseLeave={() => setHoveredMonth(null)}
                                onMouseMove={handleLocalMouseMove}
                                className="glass-panel p-0 group min-h-[160px] flex flex-col justify-between transition-all duration-300 rounded-xl cursor-pointer"
                                style={{
                                    '--spotlight-color': activeColor,
                                    zIndex: isHovered ? 50 : 1,
                                    boxShadow: isLoading ? `0 0 30px 5px ${activeColor}, 0 0 60px 10px ${activeColor}` : undefined,
                                    animation: isLoading ? 'pulse 1s ease-in-out infinite' : undefined
                                }}
                            >
                                {/* Inner Content Wrapper (Clipped for images) */}
                                <div className="absolute inset-0 rounded-xl overflow-hidden z-0">

                                    {/* 1. Base Album Art (Subtle Tint behind CSS Glass) */}
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-10 pointer-events-none mix-blend-overlay"
                                        style={{
                                            backgroundImage: `url(${displayImage})`,
                                            transform: 'scale(1.1)'
                                        }}
                                    />

                                    {/* Frosted Background (Unrevealed) - CLEAN GLASS */}
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />

                                    {/* 2. Revealed Clear Background (Top Layer) - Wipe Reveal */}
                                    <div
                                        className="absolute inset-0 z-0 overflow-hidden rounded-xl transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                                        style={{
                                            clipPath: isHovered ? 'inset(0 25% 0 0)' : 'inset(0 100% 0 0)'
                                        }}
                                    >
                                        <div
                                            className="absolute inset-0 bg-cover bg-center"
                                            style={{
                                                backgroundImage: `url(${displayImage})`,
                                                filter: 'grayscale(0%) contrast(1.1)',
                                                transform: 'scale(1.1)'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Left Accent Bar - Always Visible */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-xl z-30 transition-all duration-300"
                                    style={{
                                        background: activeColor,
                                        boxShadow: `0 0 10px ${activeColor}`,
                                    }}
                                />

                                {/* "Left-Growth" Daily Graph */}
                                <div className="absolute left-[4px] top-4 bottom-4 w-full flex flex-col justify-center gap-[1px] z-50 pointer-events-auto mix-blend-screen">
                                    {barPositions.map((bar, dIdx) => {
                                        const dayLabel = `${m.month} ${dIdx + 1}`;
                                        return (
                                            <motion.div
                                                key={dIdx}
                                                className="h-full rounded-r-full origin-left cursor-crosshair"
                                                initial={{ width: 0, opacity: 0 }}
                                                animate={{ width: `${bar.width}%`, opacity: 1 }}
                                                whileHover={{
                                                    scaleY: 1.5, // Scale Y for thicker bar on hover
                                                    opacity: 1,
                                                    boxShadow: `0 0 25px ${activeColor}, 0 0 10px ${activeColor}`, // SUPER STRONG GLOW
                                                    zIndex: 60, // Pop above neighbors
                                                    transition: { duration: 0.1 }
                                                }}
                                                title={`${dayLabel}: ${metric === 'minutes' ? formatDuration(bar.val) : bar.val.toLocaleString()} ${metric === 'minutes' ? 'mins' : 'plays'}`}
                                                transition={{ duration: 0.5, delay: dIdx * 0.015 }}
                                                style={{
                                                    background: `linear-gradient(90deg, ${activeColor}, transparent)`, // Stronger gradient
                                                    boxShadow: `0 0 8px ${activeColor}60`, // Stronger permanent shadow
                                                    opacity: 0.8
                                                }}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Content Slide Container */}
                                <div className="relative z-40 p-4 h-full flex flex-col justify-between pointer-events-none">
                                    <div className="flex justify-between items-start pointer-events-none">
                                        {/* Month Label - Slides RIGHT & ROTATES to Top Right Edge (Balanced) */}
                                        <div className="flex flex-col transition-all duration-500 ease-out group-hover:translate-x-[185px] group-hover:-translate-y-1 group-hover:rotate-90 origin-top-left relative">
                                            <span
                                                className="text-3xl font-black transition-colors relative z-10 whitespace-nowrap"
                                                style={{ color: activeColor }}
                                            >
                                                {m.month}
                                            </span>
                                            <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest relative z-10 group-hover:text-white transition-colors">
                                                {year}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Metrics - Slides UP */}
                                    <div className="pl-4 transition-all duration-300 group-hover:-translate-y-20 relative z-50 pointer-events-none">
                                        <div
                                            className="text-2xl font-black tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                                            style={{
                                                color: activeColor,
                                                textShadow: '0 2px 10px rgba(0,0,0,0.8)'
                                            }}
                                        >
                                            {format(m.value)}
                                        </div>
                                        <div className="text-[10px] uppercase tracking-wider text-white/60 font-mono font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" style={{ textShadow: '0 1px 4px rgba(0,0,0,1)' }}>
                                            {format(m.avgDaily)}/day
                                        </div>
                                    </div>
                                </div>

                                {/* Play Button - Bottom Right (Moved outside content container) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        const contextId = `${year}-${String(i + 1).padStart(2, '0')}`;
                                        console.log('[YearDetail] Play clicked, contextId:', contextId, 'topTracks:', m.topTracks);
                                        if (onPlayContext && m.topTracks) {
                                            onPlayContext(m.topTracks, contextId);
                                        } else {
                                            console.warn('[YearDetail] Missing data');
                                        }
                                    }}
                                    className="absolute bottom-3 right-3 p-2 bg-white text-black rounded-full opacity-0 group-hover:opacity-100 shadow-[0_0_15px_rgba(255,255,255,0.5)] hover:scale-110 transition-all duration-300 z-[100] pointer-events-auto"
                                    title="Play Top Tracks of Month"
                                >
                                    <Play size={16} fill="currentColor" />
                                </button>

                                {/* Artistic Text Reveal (Bottom Left) */}
                                <div className={`absolute inset-x-0 bottom-0 p-4 z-50 transition-all duration-500 delay-100 flex flex-col items-start pointer-events-none ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}>
                                    <div className="text-white font-black text-lg leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-shadow-[0_2px_8px_rgba(0,0,0,0.9)] line-clamp-2 mix-blend-overlay">
                                        {meta.album || "Unknown Album"}
                                    </div>
                                    <div className="text-white font-bold text-xs uppercase tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-1 opacity-90 text-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                        {meta.artist || "Unknown Artist"}
                                    </div>
                                </div>

                                {/* Particle Swarm */}
                                <div className="absolute inset-0 z-30 pointer-events-none mix-blend-screen rounded-xl overflow-hidden">
                                    <LocalizedSwarm
                                        barPositions={barPositions}
                                        isHovered={isHovered}
                                        barScale={isHovered ? 1.2 : 0.8}
                                    />
                                </div>


                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Day/Night Breakdown */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <motion.div
                    onMouseMove={handleMouseMove}
                    transition={{ duration: 0.2 }}
                    className="glass-panel p-4 flex items-center justify-between relative overflow-hidden group"
                    style={{ '--spotlight-color': '#facc15' }}
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-neon-yellow shadow-[0_0_10px_#facc15] rounded-l-md transition-all group-hover:w-1.5" />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Daytime (6am-6pm)</div>
                        <div className="text-2xl font-black text-neon-yellow drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                            {dayPlaysForChart.toLocaleString()}
                        </div>
                    </div>
                    <Sun className="text-neon-yellow" size={24} />
                </motion.div>
                <motion.div
                    onMouseMove={handleMouseMove}
                    transition={{ duration: 0.2 }}
                    className="glass-panel p-4 flex items-center justify-between relative overflow-hidden group"
                    style={{ '--spotlight-color': '#8b5cf6' }}
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-neon-purple shadow-[0_0_10px_#8b5cf6] rounded-l-md transition-all group-hover:w-1.5" />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Nighttime (6pm-6am)</div>
                        <div className="text-2xl font-black text-neon-purple drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                            {nightPlaysForChart.toLocaleString()}
                        </div>
                    </div>
                    <Moon className="text-neon-purple" size={24} />
                </motion.div>
            </div>

            {/* Insight Cards (Preserved) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Busiest Month').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Busiest Month').color, boxShadow: `0 0 10px ${getSentimentStyle('Busiest Month').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Busiest Month</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Busiest Month').color, textShadow: `0 0 20px ${getSentimentStyle('Busiest Month').color}40` }}>{busiestMonthName}</div>
                            <div className="text-xs text-gray-500 mt-1">{busiestMonthPlays.toLocaleString()} plays</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Favorite Day').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Favorite Day').color, boxShadow: `0 0 10px ${getSentimentStyle('Favorite Day').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Favorite Day</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Favorite Day').color, textShadow: `0 0 20px ${getSentimentStyle('Favorite Day').color}40` }}>{favoriteDayName}</div>
                            <div className="text-xs text-gray-500 mt-1">{days[maxDayIndex].toLocaleString()} plays</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Weekend Warrior').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Weekend Warrior').color, boxShadow: `0 0 10px ${getSentimentStyle('Weekend Warrior').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Weekend Warrior</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Weekend Warrior').color, textShadow: `0 0 20px ${getSentimentStyle('Weekend Warrior').color}40` }}>{weekendPercent}%</div>
                            <div className="text-xs text-gray-500 mt-1">of listening on Sat/Sun</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Top Artist Obsession').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Top Artist Obsession').color, boxShadow: `0 0 10px ${getSentimentStyle('Top Artist Obsession').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Top Artist Obsession</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Top Artist Obsession').color, textShadow: `0 0 20px ${getSentimentStyle('Top Artist Obsession').color}40` }}>{topArtistPercent}%</div>
                            <div className="text-xs text-gray-500 mt-1 truncate max-w-full">is {topArtist?.n}</div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Insight Cards Row 2 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Golden Hour').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Golden Hour').color, boxShadow: `0 0 10px ${getSentimentStyle('Golden Hour').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Golden Hour</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Golden Hour').color, textShadow: `0 0 20px ${getSentimentStyle('Golden Hour').color}40` }}>{goldenHourName}</div>
                            <div className="text-xs text-gray-500 mt-1">Peak listening time (EST)</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Daily Rhythm').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Daily Rhythm').color, boxShadow: `0 0 10px ${getSentimentStyle('Daily Rhythm').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Daily Rhythm</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Daily Rhythm').color, textShadow: `0 0 20px ${getSentimentStyle('Daily Rhythm').color}40` }}>{dailyAvg}</div>
                            <div className="text-xs text-gray-500 mt-1">tracks per day</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.15)' }}
                    className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group"
                    style={{ '--spotlight-color': getSentimentStyle(topSeason).color }}
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle(topSeason).color, boxShadow: `0 0 10px ${getSentimentStyle(topSeason).color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Top Season</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle(topSeason).color, textShadow: `0 0 20px ${getSentimentStyle(topSeason).color}40` }}>{topSeason}</div>
                            <div className="text-xs text-gray-500 mt-1">{seasons[topSeason].toLocaleString()} plays</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Longest Streak').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Longest Streak').color, boxShadow: `0 0 10px ${getSentimentStyle('Longest Streak').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Longest Streak</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Longest Streak').color, textShadow: `0 0 20px ${getSentimentStyle('Longest Streak').color}40` }}>{longestStreak}</div>
                            <div className="text-xs text-gray-500 mt-1">days in a row</div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Insight Cards Row 3 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('New Obsession').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('New Obsession').color, boxShadow: `0 0 10px ${getSentimentStyle('New Obsession').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">New Obsession</div>
                        <div>
                            <div className="text-xl font-bold leading-none truncate" style={{ color: getSentimentStyle('New Obsession').color, textShadow: `0 0 20px ${getSentimentStyle('New Obsession').color}40` }}>{newObsessionName}</div>
                            <div className="text-xs text-gray-500 mt-1">#{newObsessionRank} • {newObsessionPlays.toLocaleString()} plays</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Late Nite Owl').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Late Nite Owl').color, boxShadow: `0 0 10px ${getSentimentStyle('Late Nite Owl').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Late Nite Owl</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Late Nite Owl').color, textShadow: `0 0 20px ${getSentimentStyle('Late Nite Owl').color}40` }}>{lateNightPercent}%</div>
                            <div className="text-xs text-gray-500 mt-1">plays 12am - 4am</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Early Bird').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Early Bird').color, boxShadow: `0 0 10px ${getSentimentStyle('Early Bird').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Early Bird</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Early Bird').color, textShadow: `0 0 20px ${getSentimentStyle('Early Bird').color}40` }}>{earlyBirdPercent}%</div>
                            <div className="text-xs text-gray-500 mt-1">plays 5am - 9am</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Discovery').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Discovery').color, boxShadow: `0 0 10px ${getSentimentStyle('Discovery').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Discovery</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Discovery').color, textShadow: `0 0 20px ${getSentimentStyle('Discovery').color}40` }}>{diversityScore}</div>
                            <div className="text-xs text-gray-500 mt-1">Unique Artists / 1k plays</div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Insight Cards Row 4 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('The Binge').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('The Binge').color, boxShadow: `0 0 10px ${getSentimentStyle('The Binge').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">The Binge</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('The Binge').color, textShadow: `0 0 20px ${getSentimentStyle('The Binge').color}40` }}>{peakDateStr}</div>
                            <div className="text-xs text-gray-500 mt-1">{peakDateCount} plays in 24h</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Silence').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Silence').color, boxShadow: `0 0 10px ${getSentimentStyle('Silence').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Silence</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Silence').color, textShadow: `0 0 20px ${getSentimentStyle('Silence').color}40` }}>{longestBreak}</div>
                            <div className="text-xs text-gray-500 mt-1">consecutive days w/o music</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Fresh Favorites').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Fresh Favorites').color, boxShadow: `0 0 10px ${getSentimentStyle('Fresh Favorites').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Fresh Favorites</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Fresh Favorites').color, textShadow: `0 0 20px ${getSentimentStyle('Fresh Favorites').color}40` }}>{freshFavoritesCount}</div>
                            <div className="text-xs text-gray-500 mt-1">of Top 20 were new</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Fresh Blood').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Fresh Blood').color, boxShadow: `0 0 10px ${getSentimentStyle('Fresh Blood').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Fresh Blood</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Fresh Blood').color, textShadow: `0 0 20px ${getSentimentStyle('Fresh Blood').color}40` }}>{turnoverRate}%</div>
                            <div className="text-xs text-gray-500 mt-1">new artists in Top 10</div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Insight Cards Row 5 (Age & Life Context) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Listening Age').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Listening Age').color, boxShadow: `0 0 10px ${getSentimentStyle('Listening Age').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Listening Age</div>
                        <div>
                            <div className="text-4xl font-black leading-none" style={{ color: getSentimentStyle('Listening Age').color, textShadow: `0 0 20px ${getSentimentStyle('Listening Age').color}40` }}>{listeningAge}</div>
                            <div className="text-xs text-gray-500 mt-1">based on music taste</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} className="glass-panel p-4 flex flex-col justify-between md:col-span-2 relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Musical Generation').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Musical Generation').color, boxShadow: `0 0 10px ${getSentimentStyle('Musical Generation').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Musical Generation</div>
                        <div>
                            <div className="text-2xl font-bold leading-none line-clamp-1" style={{ color: getSentimentStyle('Musical Generation').color, textShadow: `0 0 20px ${getSentimentStyle('Musical Generation').color}40` }}>{lifePhase}</div>
                            <div className="text-xs text-gray-500 mt-1">Vibes transcend time</div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Top Artists of the Year */}
            <section>
                <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-neon-pink rounded-full"></span>
                    Top Artists of {year}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {(data.top_artists || []).filter(a => a && a.n).slice(0, 100).map((artist, idx) => {
                        const artistImg = allData?.artists?.[artist.n]?.img;
                        return (
                            <motion.div
                                key={artist.n}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onMouseMove={handleMouseMove}
                                whileHover={{ y: -5, scale: 1.05 }}
                                onClick={() => onArtistClick(artist.n)}
                                className="glass-panel p-4 cursor-pointer transition-colors group relative overflow-hidden aspect-[4/5] flex flex-col justify-end border-0"
                                style={{ '--spotlight-color': '#ff0055' }}
                            >
                                {/* Inner Stripe */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5 z-20" style={{ backgroundColor: '#ff0055', boxShadow: `0 0 10px #ff0055` }} />

                                {/* Background Image */}
                                {artistImg ? (
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100"
                                        style={{ backgroundImage: `url(${artistImg})` }}
                                    ></div>
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black opacity-60 group-hover:opacity-100"></div>
                                )}

                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10"></div>

                                <div className="relative z-20 pl-2">
                                    <div className="text-xs text-gray-400 font-mono mb-1">#{idx + 1}</div>
                                    <div className="font-bold text-white text-lg leading-tight mb-1 truncate group-hover:text-neon-pink transition-colors">
                                        {artist.n}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {artist.c.toLocaleString()} plays
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </section>
        </div >
    );
}
