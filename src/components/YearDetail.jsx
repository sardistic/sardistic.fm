import React from 'react';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';

// Sentiment Analysis Color Logic
// Sentiment Analysis Color Logic
const getSentimentStyle = (text = "") => {
    const t = text.toLowerCase();

    // 1. High Energy / Warmth / Day
    if (t.includes('day') || t.includes('sun') || t.includes('golden') || t.includes('summer') || t.includes('heat') || t.includes('bird') || t.includes('weekend')) {
        return { color: '#facc15', textColor: 'text-neon-yellow' }; // Neon Yellow
    }

    // 2. Passion / Intensity / Love
    if (t.includes('love') || t.includes('heart') || t.includes('obsession') || t.includes('favorite') || t.includes('binge') || t.includes('pink') || t.includes('spring')) {
        return { color: '#ec4899', textColor: 'text-neon-pink' }; // Neon Pink
    }

    // 3. Cool / Fresh / Tech
    if (t.includes('fresh') || t.includes('new') || t.includes('discovery') || t.includes('rhythm') || t.includes('winter') || t.includes('cyan') || t.includes('future')) {
        return { color: '#06b6d4', textColor: 'text-neon-cyan' }; // Neon Cyan
    }

    // 4. Deep / Night / Mystery
    if (t.includes('night') || t.includes('moon') || t.includes('owl') || t.includes('dark') || t.includes('silence') || t.includes('purple') || t.includes('streak') || t.includes('blood')) {
        return { color: '#8b5cf6', textColor: 'text-neon-purple' }; // Neon Purple
    }

    // 5. Fall / Earthy
    if (t.includes('fall') || t.includes('autumn') || t.includes('orange')) {
        return { color: '#f97316', textColor: 'text-orange-500' }; // Neon Orange
    }

    // Default Cool White/Blue
    return { color: '#ffffff', textColor: 'text-white' };
};

function YearDetail({ year, data, onBack, onArtistClick, allData }) {
    if (!data) return <div>No data for {year}</div>;

    const { months, days, top_artists } = data;

    // --- New Factoid Calculations ---
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthData = months.map((val, i) => ({ name: monthNames[i], plays: val }));

    // 1. Busiest Month
    const maxMonthIndex = months.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
    const busiestMonthName = monthNames[maxMonthIndex];
    const busiestMonthPlays = months[maxMonthIndex];

    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayData = days.map((val, i) => ({ name: dayNames[i], plays: val }));

    // 2. Favorite Day
    const maxDayIndex = days.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
    const favoriteDayName = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][maxDayIndex];

    // 3. Weekend vs Weekday
    const weekendPlays = (days[5] || 0) + (days[6] || 0);
    const weekdayPlays = (data.total || 0) - weekendPlays;
    const weekendPercent = data.total > 0 ? Math.round((weekendPlays / data.total) * 100) : 0;

    // 4. Top Artist Obsession
    const topArtist = top_artists[0];
    const topArtistPercent = (topArtist && data.total > 0) ? Math.round((topArtist.c / data.total) * 100) : 0;

    // --- Row 2 Calculations ---

    // Timezone Helper: offset is -5 for EST
    const shiftHours = (h, offset) => {
        const shifted = new Array(24).fill(0);
        for (let i = 0; i < 24; i++) {
            let newIndex = (i + offset) % 24;
            if (newIndex < 0) newIndex += 24;
            shifted[newIndex] = h[i];
        }
        return shifted;
    };

    // 5. Golden Hour (Shifted)
    const rawHours = data.hours || Array(24).fill(0);
    const shiftedHours = shiftHours(rawHours, -5);
    const maxHourIndex = shiftedHours.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
    const formatHour = (h) => {
        if (h === 0) return "Midnight";
        if (h === 12) return "Noon";
        return h > 12 ? `${h - 12} PM` : `${h} AM`;
    };
    const goldenHourName = formatHour(maxHourIndex);

    // --- Row 3 Calculations ---

    // 9. New Obsession (Highest rank not in previous year)
    let newObsessionName = "None";
    let newObsessionRank = 0;
    let newObsessionPlays = 0;
    if (allData.years) {
        const prevYear = (parseInt(year) - 1).toString();
        const prevData = allData.years[prevYear];
        if (prevData && prevData.top_artists) {
            const prevArtists = new Set(prevData.top_artists.map(a => a.n));
            const found = top_artists.find(a => !prevArtists.has(a.n));
            if (found) {
                newObsessionName = found.n;
                newObsessionRank = top_artists.indexOf(found) + 1;
                newObsessionPlays = found.c;
            }
        } else if (top_artists.length > 0) {
            newObsessionName = top_artists[0].n; // If no prev year, top is new
            newObsessionRank = 1;
            newObsessionPlays = top_artists[0].c;
        }
    }

    // 10. Late Nite Owl (12am - 4am EST)
    // Indices 0, 1, 2, 3, 4
    const lateNightPlays = shiftedHours.slice(0, 5).reduce((a, b) => a + b, 0);
    const lateNightPercent = data.total > 0 ? Math.round((lateNightPlays / data.total) * 100) : 0;

    // 11. Early Bird (5am - 9am EST)
    // Indices 5, 6, 7, 8, 9
    const earlyBirdPlays = shiftedHours.slice(5, 10).reduce((a, b) => a + b, 0);
    const earlyBirdPercent = data.total > 0 ? Math.round((earlyBirdPlays / data.total) * 100) : 0;

    // 12. Diversity Score (Unique Artists per 1000 plays)
    const diversityScore = data.total > 0 ? Math.round((top_artists.length / data.total) * 1000) : 0;

    // --- Row 4 Calculations ---

    // 13. Peak Day (Date with max scrobbles)
    let peakDateStr = "N/A";
    let peakDateCount = 0;
    if (allData.timeline) {
        const yearPrefix = `${year}-`;
        const yearDates = Object.entries(allData.timeline)
            .filter(([k, v]) => k.startsWith(yearPrefix));

        if (yearDates.length > 0) {
            const [bestDate, bestCount] = yearDates.reduce((max, curr) => curr[1] > max[1] ? curr : max, yearDates[0]);
            const dateObj = new Date(bestDate); // Assuming YYYY-MM-DD
            // Format: "Nov 23"
            peakDateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            peakDateCount = bestCount;
        }
    }

    // --- Listening Age Calculation (Spotify Wrapped style) ---
    // Calculate based on the era of music the user listens to
    const calculateListeningAge = (topArtists, currentYear) => {
        // Artist era mapping (peak/formation years for popular artists)
        const artistEras = {
            // Classic Rock / Oldies (1960s-1970s)
            'The Beatles': 1965, 'Led Zeppelin': 1970, 'Pink Floyd': 1973, 'The Rolling Stones': 1965,
            'Queen': 1975, 'David Bowie': 1972, 'Fleetwood Mac': 1977, 'The Who': 1969,
            'Jimi Hendrix': 1968, 'The Doors': 1967, 'Cream': 1967, 'Black Sabbath': 1970,

            // 1980s
            'Michael Jackson': 1983, 'Madonna': 1984, 'Prince': 1984, 'U2': 1987,
            'Depeche Mode': 1987, 'The Cure': 1989, 'Duran Duran': 1983, 'New Order': 1983,
            'The Smiths': 1985, 'R.E.M.': 1987, 'Talking Heads': 1983, 'Joy Division': 1980,

            // 1990s
            'Nirvana': 1991, 'Radiohead': 1997, 'Oasis': 1995, 'Red Hot Chili Peppers': 1991,
            'Pearl Jam': 1992, 'Smashing Pumpkins': 1995, 'Blur': 1994, 'The Prodigy': 1997,
            'Portishead': 1994, 'Massive Attack': 1991, 'Daft Punk': 1997, 'Björk': 1993,

            // 2000s
            'Coldplay': 2002, 'The Strokes': 2001, 'Arctic Monkeys': 2006, 'Muse': 2006,
            'Kanye West': 2004, 'Amy Winehouse': 2006, 'The Killers': 2004, 'Green Day': 2004,
            'LCD Soundsystem': 2005, 'Arcade Fire': 2004, 'Yeah Yeah Yeahs': 2003, 'The White Stripes': 2001,

            // 2010s
            'Lana Del Rey': 2012, 'The Weeknd': 2015, 'Tame Impala': 2015, 'Kendrick Lamar': 2015,
            'Billie Eilish': 2019, 'Post Malone': 2018, 'Travis Scott': 2018, 'Ariana Grande': 2018,
            'Frank Ocean': 2012, 'Tyler, The Creator': 2011, 'Lorde': 2013, 'Bon Iver': 2011,

            // 2020s
            'Olivia Rodrigo': 2021, 'Doja Cat': 2021, 'Bad Bunny': 2022, 'SZA': 2022,
            'Charli xcx': 2022, 'Sabrina Carpenter': 2023, 'Chappell Roan': 2023, 'Gracie Abrams': 2023,
            'Boygenius': 2023, 'Phoebe Bridgers': 2020, 'Clairo': 2021, 'Mitski': 2022
        };

        let totalYears = 0;
        let matchedArtists = 0;

        topArtists.slice(0, 20).forEach((artist, index) => {
            const artistName = artist.n;
            const matchedYear = artistEras[artistName];

            if (matchedYear) {
                totalYears += matchedYear;
                matchedArtists++;
            } else {
                // For unknown artists, use the year being viewed as context
                // Assume they were listening to contemporary music (music from that year)
                totalYears += parseInt(currentYear);
                matchedArtists++;
            }
        });

        if (matchedArtists === 0) return 25; // Default fallback

        const avgYear = Math.round(totalYears / matchedArtists);
        const now = new Date().getFullYear();

        // Calculate "listening age" - someone who was 20 when that music was popular
        const listeningAge = now - avgYear + 20;

        return Math.max(10, Math.min(listeningAge, 100)); // Clamp between 10-100
    };

    const listeningAge = calculateListeningAge(top_artists, year);
    console.log(`🎵 Listening Age for ${year}:`, listeningAge, '| Top artists:', top_artists.slice(0, 5).map(a => a.n));

    // Life Phase Logic based on listening age
    let lifePhase = "";
    if (listeningAge <= 18) lifePhase = "Gen Z Vibes";
    else if (listeningAge <= 25) lifePhase = "Young Millennial";
    else if (listeningAge <= 35) lifePhase = "Peak Millennial";
    else if (listeningAge <= 45) lifePhase = "Gen X Energy";
    else if (listeningAge <= 60) lifePhase = "Boomer Beats";
    else lifePhase = "Classic Soul";

    // 14. Silence (Longest Break - consecutive days with 0 plays)
    let longestBreak = 0;
    let currentBreak = 0;
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const dayCount = isLeap ? 366 : 365;

    // Generate all date strings for the year to check for gaps
    for (let d = 0; d < dayCount; d++) {
        const date = new Date(year, 0, 1 + d); // Month is 0-indexed
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(date.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${dayStr}`;

        const plays = allData.timeline?.[key] || 0;

        if (plays === 0) {
            currentBreak++;
        } else {
            if (currentBreak > longestBreak) longestBreak = currentBreak;
            currentBreak = 0;
        }
    }
    if (currentBreak > longestBreak) longestBreak = currentBreak;

    // 15. Fresh Favorites (Count of Top 20 artists new this year)
    let freshFavoritesCount = 0;
    if (allData.years) {
        const prevYear = (parseInt(year) - 1).toString();
        const prevData = allData.years[prevYear];
        if (prevData && prevData.top_artists) {
            const prevArtistNames = new Set(prevData.top_artists.map(a => a.n));
            top_artists.slice(0, 20).forEach(artist => {
                if (!prevArtistNames.has(artist.n)) freshFavoritesCount++;
            });
        } else {
            freshFavoritesCount = Math.min(top_artists.length, 20);
        }
    }

    // 16. Turnover (Diff from last year's Top 10)
    let turnoverRate = 0;
    if (allData.years) {
        const prevYear = (parseInt(year) - 1).toString();
        const prevData = allData.years[prevYear];
        if (prevData && prevData.top_artists) {
            const currentTop10 = new Set(top_artists.slice(0, 10).map(a => a.n));
            const prevTop10 = new Set(prevData.top_artists.slice(0, 10).map(a => a.n));
            // Count how many of current top 10 were NOT in prev top 10
            let newFaces = 0;
            currentTop10.forEach(artist => {
                if (!prevTop10.has(artist)) newFaces++;
            });
            turnoverRate = Math.round((newFaces / 10) * 100);
        } else {
            turnoverRate = 100; // All new if no prev year
        }
    }


    const daysInYear = year % 4 === 0 ? 366 : 365;
    const dailyAvg = Math.round(data.total / daysInYear);

    // 7. Top Season
    // Winter: Dec, Jan, Feb (11, 0, 1)
    // Spring: Mar, Apr, May (2, 3, 4)
    // Summer: Jun, Jul, Aug (5, 6, 7)
    // Fall: Sep, Oct, Nov (8, 9, 10)
    const seasons = {
        "Winter": (months[11] || 0) + (months[0] || 0) + (months[1] || 0),
        "Spring": (months[2] || 0) + (months[3] || 0) + (months[4] || 0),
        "Summer": (months[5] || 0) + (months[6] || 0) + (months[7] || 0),
        "Fall": (months[8] || 0) + (months[9] || 0) + (months[10] || 0),
    };
    const topSeason = Object.keys(seasons).reduce((a, b) => seasons[a] > seasons[b] ? a : b);

    // 8. Longest Streak
    let longestStreak = 0;
    let currentStreak = 0;
    // Iterate through all days in the timeline for this year
    // We assume timeline keys are YYYY-MM-DD. Simple robust check:
    const yearPrefix = `${year}-`;
    const sortedDays = Object.keys(allData.timeline || {})
        .filter(k => k.startsWith(yearPrefix))
        .sort();

    if (sortedDays.length > 0) {
        let prevDate = new Date(sortedDays[0]);
        currentStreak = 1;
        longestStreak = 1;

        for (let i = 1; i < sortedDays.length; i++) {
            const currDate = new Date(sortedDays[i]);
            const diffTime = Math.abs(currDate - prevDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                currentStreak++;
            } else {
                currentStreak = 1;
            }
            if (currentStreak > longestStreak) longestStreak = currentStreak;
            prevDate = currDate;
        }
    }

    // Chart Data Preparation
    const seasonCounts = {
        "Winter": (months[11] || 0) + (months[0] || 0) + (months[1] || 0),
        "Spring": (months[2] || 0) + (months[3] || 0) + (months[4] || 0),
        "Summer": (months[5] || 0) + (months[6] || 0) + (months[7] || 0),
        "Fall": (months[8] || 0) + (months[9] || 0) + (months[10] || 0),
    };

    const seasonChartData = [
        { name: 'Win', value: seasonCounts.Winter, color: '#0ea5e9' }, // sky-500
        { name: 'Spr', value: seasonCounts.Spring, color: '#10b981' }, // emerald-500
        { name: 'Sum', value: seasonCounts.Summer, color: '#f59e0b' }, // amber-500
        { name: 'Fall', value: seasonCounts.Fall, color: '#f97316' }, // orange-500
    ];

    // Day/Night Data for Chart (Recalculating for chart usage)
    const nightPlaysForChart = (shiftedHours.slice(0, 6).reduce((a, b) => a + b, 0) || 0) + (shiftedHours.slice(18, 24).reduce((a, b) => a + b, 0) || 0);
    const dayPlaysForChart = data.total - nightPlaysForChart;
    const dayNightChartData = [
        { name: 'Day', value: dayPlaysForChart, color: '#facc15' }, // yellow-400
        { name: 'Night', value: nightPlaysForChart, color: '#8b5cf6' }, // violet-500
    ];

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    return (
        <div className="space-y-8 pb-10">
            <motion.button
                whileHover={{ x: -5, color: '#fff' }}
                onClick={onBack}
                className="flex items-center gap-2 text-gray-400 transition-colors mb-4 group"
            >
                <ArrowLeft size={20} className="group-hover:text-neon-pink transition-colors" /> Back to Overview
            </motion.button>

            <header className="glass-panel glass-subtle p-8 w-full flex flex-col md:flex-row items-center justify-between relative mb-8">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/20 blur-[100px] rounded-full pointer-events-none mix-blend-screen"></div>

                <div className="relative z-10 w-full md:w-auto">
                    <motion.h1
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan tracking-tighter"
                    >
                        {year}
                    </motion.h1>
                    <p className="text-xl text-gray-400 mt-2 font-light">
                        <span className="text-white font-bold">{data.total.toLocaleString()}</span> total plays
                    </p>
                </div>

                {/* Header Pie Charts - Now transparent inside the main glass header */}
                <div className="flex items-center gap-8 mt-6 md:mt-0 relative z-10">
                    {/* Season Chart */}
                    <div className="text-center">
                        <div className="h-20 w-20">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={seasonChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={15} outerRadius={35} strokeWidth={0}>
                                        {seasonChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Seasons</div>
                    </div>

                    {/* Day/Night Chart */}
                    <div className="text-center">
                        <div className="h-20 w-20">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={dayNightChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={15} outerRadius={35} strokeWidth={0}>
                                        {dayNightChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Day/Night</div>
                    </div>
                </div>
            </header>

            {/* Day/Night Breakdown */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <motion.div
                    onMouseMove={handleMouseMove}
                    transition={{ duration: 0.2 }}
                    className="glass-panel p-4 flex items-center justify-between relative overflow-hidden group"
                    style={{ '--spotlight-color': '#facc15' }} // Yellow
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-neon-yellow shadow-[0_0_10px_#facc15] rounded-l-md transition-all group-hover:w-1.5" />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Daytime (6am-6pm)</div>
                        <div className="text-2xl font-black text-neon-yellow drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                            {(() => {
                                // Timezone shift logic (UTC -> EST = -5)
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
                                const h = shiftHours(rawHours, -5); // Hardcoded EST for now as requested

                                const night = (h.slice(0, 6).reduce((a, b) => a + b, 0) || 0) + (h.slice(18, 24).reduce((a, b) => a + b, 0) || 0);
                                return (data.total - night).toLocaleString();
                            })()}
                        </div>
                    </div>
                    <Sun className="text-neon-yellow" size={24} />
                </motion.div>
                <motion.div
                    onMouseMove={handleMouseMove}
                    transition={{ duration: 0.2 }}
                    className="glass-panel p-4 flex items-center justify-between relative overflow-hidden group"
                    style={{ '--spotlight-color': '#8b5cf6' }} // Purple
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-neon-purple shadow-[0_0_10px_#8b5cf6] rounded-l-md transition-all group-hover:w-1.5" />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Nighttime (6pm-6am)</div>
                        <div className="text-2xl font-black text-neon-purple drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                            {(() => {
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
                                const h = shiftHours(rawHours, -5);
                                return ((h.slice(0, 6).reduce((a, b) => a + b, 0) || 0) + (h.slice(18, 24).reduce((a, b) => a + b, 0) || 0)).toLocaleString();
                            })()}
                        </div>
                    </div>
                    <Moon className="text-neon-purple" size={24} />
                </motion.div>
            </div>

            {/* Insight Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Busiest Month').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Busiest Month').color, boxShadow: `0 0 10px ${getSentimentStyle('Busiest Month').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Busiest Month</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Busiest Month').color, textShadow: `0 0 20px ${getSentimentStyle('Busiest Month').color}40` }}>{busiestMonthName}</div>
                            <div className="text-xs text-gray-500 mt-1">{busiestMonthPlays.toLocaleString()} plays</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Favorite Day').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Favorite Day').color, boxShadow: `0 0 10px ${getSentimentStyle('Favorite Day').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Favorite Day</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Favorite Day').color, textShadow: `0 0 20px ${getSentimentStyle('Favorite Day').color}40` }}>{favoriteDayName}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {days[maxDayIndex].toLocaleString()} plays
                            </div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Weekend Warrior').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Weekend Warrior').color, boxShadow: `0 0 10px ${getSentimentStyle('Weekend Warrior').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Weekend Warrior</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Weekend Warrior').color, textShadow: `0 0 20px ${getSentimentStyle('Weekend Warrior').color}40` }}>{weekendPercent}%</div>
                            <div className="text-xs text-gray-500 mt-1">of listening on Sat/Sun</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Top Artist Obsession').color }}>
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
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Golden Hour').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Golden Hour').color, boxShadow: `0 0 10px ${getSentimentStyle('Golden Hour').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Golden Hour</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Golden Hour').color, textShadow: `0 0 20px ${getSentimentStyle('Golden Hour').color}40` }}>{goldenHourName}</div>
                            <div className="text-xs text-gray-500 mt-1">Peak listening time (EST)</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Daily Rhythm').color }}>
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
                    transition={{ duration: 0.2 }}
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
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Longest Streak').color }}>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('New Obsession').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('New Obsession').color, boxShadow: `0 0 10px ${getSentimentStyle('New Obsession').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">New Obsession</div>
                        <div>
                            <div className="text-xl font-bold leading-none truncate" style={{ color: getSentimentStyle('New Obsession').color, textShadow: `0 0 20px ${getSentimentStyle('New Obsession').color}40` }}>{newObsessionName}</div>
                            <div className="text-xs text-gray-500 mt-1">#{newObsessionRank} • {newObsessionPlays.toLocaleString()} plays</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Late Nite Owl').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Late Nite Owl').color, boxShadow: `0 0 10px ${getSentimentStyle('Late Nite Owl').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Late Nite Owl</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Late Nite Owl').color, textShadow: `0 0 20px ${getSentimentStyle('Late Nite Owl').color}40` }}>{lateNightPercent}%</div>
                            <div className="text-xs text-gray-500 mt-1">plays 12am - 4am</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Early Bird').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Early Bird').color, boxShadow: `0 0 10px ${getSentimentStyle('Early Bird').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Early Bird</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Early Bird').color, textShadow: `0 0 20px ${getSentimentStyle('Early Bird').color}40` }}>{earlyBirdPercent}%</div>
                            <div className="text-xs text-gray-500 mt-1">plays 5am - 9am</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Discovery').color }}>
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
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('The Binge').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('The Binge').color, boxShadow: `0 0 10px ${getSentimentStyle('The Binge').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">The Binge</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('The Binge').color, textShadow: `0 0 20px ${getSentimentStyle('The Binge').color}40` }}>{peakDateStr}</div>
                            <div className="text-xs text-gray-500 mt-1">{peakDateCount} plays in 24h</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Silence').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Silence').color, boxShadow: `0 0 10px ${getSentimentStyle('Silence').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Silence</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Silence').color, textShadow: `0 0 20px ${getSentimentStyle('Silence').color}40` }}>{longestBreak}</div>
                            <div className="text-xs text-gray-500 mt-1">consecutive days w/o music</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Fresh Favorites').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Fresh Favorites').color, boxShadow: `0 0 10px ${getSentimentStyle('Fresh Favorites').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Fresh Favorites</div>
                        <div>
                            <div className="text-2xl font-bold leading-none" style={{ color: getSentimentStyle('Fresh Favorites').color, textShadow: `0 0 20px ${getSentimentStyle('Fresh Favorites').color}40` }}>{freshFavoritesCount}</div>
                            <div className="text-xs text-gray-500 mt-1">of Top 20 were new</div>
                        </div>
                    </div>
                </motion.div>
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Fresh Blood').color }}>
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
                <motion.div onMouseMove={handleMouseMove} transition={{ duration: 0.2 }} className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden group" style={{ '--spotlight-color': getSentimentStyle('Stats').color }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: getSentimentStyle('Stats').color, boxShadow: `0 0 10px ${getSentimentStyle('Stats').color}` }} />
                    <div className="pl-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Stats</div>
                        <div>
                            <div className="text-xl font-bold leading-none" style={{ color: getSentimentStyle('Stats').color, textShadow: `0 0 20px ${getSentimentStyle('Stats').color}40` }}>#{Object.keys(allData.years).sort().indexOf(year) + 1}</div>
                            <div className="text-xs text-gray-500 mt-1">year on record</div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* New Charts Section: Listening Patterns */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-neon-cyan rounded-full"></span>
                    Listening Patterns
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Monthly Trend Area Chart */}
                    <motion.div
                        onMouseMove={handleMouseMove}
                        whileHover={{ scale: 1.01 }}
                        className="glass-panel p-6 rounded-xl h-80 relative overflow-hidden group"
                        style={{ '--spotlight-color': '#06b6d4' }} // Cyan
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: '#06b6d4', boxShadow: `0 0 10px #06b6d4` }} />

                        <div className="pl-2 h-full">
                            <div className="text-gray-400 text-xs uppercase tracking-wider mb-4">Monthly Intensity</div>
                            <ResponsiveContainer width="100%" height="90%">
                                <AreaChart data={monthData}>
                                    <defs>
                                        <linearGradient id="colorPlays" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                        cursor={{ stroke: '#ffffff20' }}
                                    />
                                    <Area type="monotone" dataKey="plays" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPlays)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Weekly Bar Chart */}
                    <motion.div
                        onMouseMove={handleMouseMove}
                        whileHover={{ scale: 1.01 }}
                        className="glass-panel p-6 rounded-xl h-80 relative overflow-hidden group"
                        style={{ '--spotlight-color': '#ec4899' }} // Pink/Magenta for contrast or match main vibe
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: '#ec4899', boxShadow: `0 0 10px #ec4899` }} />
                        <div className="pl-2 h-full">
                            <div className="text-gray-400 text-xs uppercase tracking-wider mb-4">Weekly Rhythm</div>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={dayData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="plays" radius={[4, 4, 0, 0]}>
                                        {dayData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === maxDayIndex ? '#ec4899' : '#ffffff20'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Top Artists of the Year */}
            <section>
                <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-neon-pink rounded-full"></span>
                    Top Artists of {year}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {top_artists.slice(0, 100).map((artist, idx) => {
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
                                style={{ '--spotlight-color': '#ff0055' }} // Neon Pink
                            >
                                {/* Inner Stripe */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5 z-20" style={{ backgroundColor: '#ff0055', boxShadow: `0 0 10px #ff0055` }} />

                                {/* Background Image */}
                                {artistImg && (
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80"
                                        style={{ backgroundImage: `url(${artistImg})` }}
                                    />
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                                <div className="absolute top-2 right-2 text-4xl font-black text-white/10 group-hover:text-white/30 transition-colors select-none z-10">
                                    #{idx + 1}
                                </div>

                                <div className="relative z-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-300 pl-2">
                                    <h3
                                        className="font-bold text-lg leading-tight text-white mb-1 shadow-black drop-shadow-md group-hover:text-neon-pink transition-colors"
                                        style={{ textShadow: `0 0 10px rgba(0,0,0,0.8)` }}
                                    >
                                        {artist.n}
                                    </h3>
                                    <div className="text-neon-pink text-sm font-medium">{artist.c.toLocaleString()} plays</div>
                                    <div className="w-full bg-white/5 h-1 mt-3 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(artist.c / top_artists[0].c) * 100}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className="h-full bg-gradient-to-r from-neon-pink to-neon-purple"
                                        ></motion.div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Trend */}
                <motion.div
                    onMouseMove={handleMouseMove}
                    whileHover={{ scale: 1.01 }}
                    className="glass-panel p-6 relative overflow-hidden group"
                    style={{ '--spotlight-color': '#bd00ff' }} // Purple
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: '#bd00ff', boxShadow: `0 0 10px #bd00ff` }} />
                    <div className="pl-2 h-full">
                        <h3 className="text-lg font-bold mb-4 text-gray-300">Seasonality</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthData}>
                                    <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#121212', border: '1px solid #333' }}
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    />
                                    <Bar dataKey="plays" radius={[4, 4, 0, 0]}>
                                        {monthData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#bd00ff' : '#00ccff'} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </motion.div>

                {/* Weekly Routine */}
                <motion.div
                    onMouseMove={handleMouseMove}
                    whileHover={{ scale: 1.01 }}
                    className="glass-panel p-6 relative overflow-hidden group"
                    style={{ '--spotlight-color': '#ffff00' }} // Yellow
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-all group-hover:w-1.5" style={{ backgroundColor: '#ffff00', boxShadow: `0 0 10px #ffff00` }} />
                    <div className="pl-2 h-full">
                        <h3 className="text-lg font-bold mb-4 text-gray-300">Weekly Routine</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dayData}>
                                    <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#121212', border: '1px solid #333' }}
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    />
                                    <Bar dataKey="plays" fill="#ffff00" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div >
    );
}

export default YearDetail;
