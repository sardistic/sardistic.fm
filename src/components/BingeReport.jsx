import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

function BingeReport({ data, onBack, onArtistClick }) {
    // Process Binge Data
    const bingeArtists = useMemo(() => {
        return Object.entries(data.artists)
            .filter(([_, stats]) => stats.b && stats.b.count > 0)
            .map(([name, stats]) => ({
                name,
                binges: stats.b.count,
                maxStreak: stats.b.max_streak,
                total: stats.t,
                img: stats.img
            }))
            .sort((a, b) => b.binges - a.binges)
            .slice(0, 20);
    }, [data]);

    return (
        <div className="space-y-8 pb-10 animate-fade-in">
            <motion.button
                whileHover={{ x: -5, color: '#fff' }}
                onClick={onBack}
                className="flex items-center gap-2 text-gray-400 transition-colors mb-4 group"
            >
                <ArrowLeft size={20} className="group-hover:text-neon-pink transition-colors" /> Back
            </motion.button>

            <header className="mb-10">
                <h1 className="text-5xl font-black text-white mb-2 flex items-center gap-3">
                    <Zap className="text-neon-yellow w-12 h-12" />
                    Binge Report
                </h1>
                <p className="text-gray-400 text-lg">Deepest musical obsessions and habits.</p>
            </header>

            {/* Top Binge Artists Grid */}
            <section>
                <h2 className="text-2xl font-bold mb-6 text-white">Most Obsessive Artists</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {bingeArtists.map((artist, idx) => (
                        <motion.div
                            key={artist.name}
                            whileHover={{ scale: 1.02, y: -5 }}
                            className="glass-panel p-6 border-l-4 border-neon-yellow bg-black/30 relative overflow-hidden"
                            onClick={() => onArtistClick(artist.name)}
                        >
                            {artist.img && (
                                <div className="absolute inset-0 z-0 opacity-30 bg-cover bg-center transition-opacity hover:opacity-50" style={{ backgroundImage: `url(${artist.img})` }} />
                            )}
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-4xl font-black text-white/10">#{idx + 1}</span>
                                    <div className="bg-neon-yellow/10 text-neon-yellow px-2 py-1 rounded text-xs font-bold uppercase">
                                        {artist.maxStreak} track streak
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white truncate mb-1">{artist.name}</h3>
                                <p className="text-gray-400 text-sm">{artist.binges} separate sessions</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    );
}

export default BingeReport;
