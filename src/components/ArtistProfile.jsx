import React from 'react';
import { ArrowLeft, TrendingUp, Music, Moon, Sun, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { motion } from 'framer-motion';

function ArtistProfile({ artist, stats, onBack, allData }) {
    if (!stats) return <div>Artist not found</div>;

    // Transform year stats into array
    const yearData = Object.entries(stats.y)
        .map(([year, count]) => ({ year: parseInt(year), count }))
        .sort((a, b) => a.year - b.year);

    // Time of Day Data
    const todData = [
        { subject: 'Morning', A: stats.tod ? stats.tod[0] : 0, fullMark: 100 },
        { subject: 'Afternoon', A: stats.tod ? stats.tod[1] : 0, fullMark: 100 },
        { subject: 'Evening', A: stats.tod ? stats.tod[2] : 0, fullMark: 100 },
        { subject: 'Night', A: stats.tod ? stats.tod[3] : 0, fullMark: 100 },
    ];

    const firstRelease = stats.fry || 'Unknown';

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-slide-up pb-20">
            <motion.button
                whileHover={{ x: -5, color: '#fff' }}
                onClick={onBack}
                className="flex items-center gap-2 text-gray-400 transition-colors"
            >
                <ArrowLeft size={20} /> Back
            </motion.button>

            <div className="glass-panel p-8 relative overflow-hidden border-t-4 border-neon-pink">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Music size={300} />
                </div>

                {/* Album Art Placeholder / Background */}
                {stats.img && (
                    <div className="absolute inset-0 z-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url(${stats.img})` }} />
                )}

                <div className="relative z-10">
                    <h1 className="text-6xl font-black mb-4 text-white tracking-tighter drop-shadow-lg">{artist}</h1>

                    <div className="flex flex-wrap gap-2 mb-6">
                        {stats.tags && stats.tags.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-neon-cyan border border-neon-cyan/20">
                                #{tag}
                            </span>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-6 text-gray-300 mb-8">
                        <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10 backdrop-blur-sm">
                            <span className="block text-xs text-gray-500 uppercase">Total Plays</span>
                            <span className="text-xl font-bold text-white">{stats.t.toLocaleString()}</span>
                        </div>
                        <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10 backdrop-blur-sm">
                            <span className="block text-xs text-gray-500 uppercase">First Discovery</span>
                            <span className="text-xl font-bold text-white">{new Date(stats.fs * 1000).getFullYear()}</span>
                        </div>
                        {stats.b && (
                            <div className="bg-neon-yellow/10 px-4 py-2 rounded-lg border border-neon-yellow/20 backdrop-blur-sm">
                                <span className="block text-xs text-neon-yellow/70 uppercase">Max Binge</span>
                                <span className="text-xl font-bold text-neon-yellow">{stats.b.max_streak} tracks</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Trajectory */}
                        <div className="lg:col-span-2 h-80">
                            <h3 className="text-lg font-bold mb-4 text-gray-400">Career Trajectory</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={yearData}>
                                    <defs>
                                        <linearGradient id="colorArtist" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ff0055" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ff0055" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="year" stroke="#666" />
                                    <YAxis stroke="#666" />
                                    <Tooltip contentStyle={{ backgroundColor: '#121212', border: '1px solid #333' }} />
                                    <Area type="monotone" dataKey="count" stroke="#ff0055" fill="url(#colorArtist)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Vibe / Time of Day */}
                        <div className="h-80">
                            <h3 className="text-lg font-bold mb-4 text-gray-400">Listening Vibe</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={todData}>
                                    <PolarGrid stroke="#333" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                    <Radar
                                        name="Plays"
                                        dataKey="A"
                                        stroke="#00ffcc"
                                        strokeWidth={2}
                                        fill="#00ffcc"
                                        fillOpacity={0.4}
                                    />
                                    <Tooltip contentStyle={{ backgroundColor: '#121212', border: '1px solid #333' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ArtistProfile;
