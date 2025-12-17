import React from 'react';
import { ArrowLeft, TrendingUp, Music, Moon, Sun, Zap, Play } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

function ArtistProfile({ artist, stats, onBack, allData, onTagClick, metric = 'scrobbles', onPlayContext }) {
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



    // State for Expanded Albums
    const [expandedAlbum, setExpandedAlbum] = React.useState(null);

    // Image Cycling Logic
    const [bgImage, setBgImage] = React.useState(null);

    React.useEffect(() => {
        if (stats.img) {
            if (Array.isArray(stats.img) && stats.img.length > 0) {
                // Select random image from valid array
                const randomImg = stats.img[Math.floor(Math.random() * stats.img.length)];
                setBgImage(randomImg);
            } else if (typeof stats.img === 'string') {
                // Legacy string support
                setBgImage(stats.img);
            }
        }
    }, [stats.img]);

    // Sort Albums
    const sortedAlbums = stats.albums
        ? Object.entries(stats.albums)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 10)
        : [];

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
                {bgImage && (
                    <div className="absolute inset-0 z-0 opacity-20 bg-cover bg-center transition-all duration-1000" style={{ backgroundImage: `url(${bgImage})` }} />
                )}

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <h1 className="text-6xl font-black text-white tracking-tighter drop-shadow-lg leading-none">{artist}</h1>
                        <button
                            onClick={() => {
                                if (onPlayContext && stats.albums) {
                                    const allTracks = Object.values(stats.albums)
                                        .flatMap(a => a.tracks)
                                        .map(t => ({ ...t, artist: artist }))
                                        .sort((a, b) => b.count - a.count);
                                    onPlayContext(allTracks);
                                }
                            }}
                            className="bg-neon-pink text-black p-3 rounded-full hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,0,85,0.4)]"
                            title="Play All Top Tracks"
                        >
                            <Play size={20} fill="currentColor" />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                        {stats.tags && stats.tags.map(tag => (
                            <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: "rgba(0, 255, 204, 0.15)" }}
                                whileTap={{ scale: 0.95 }}
                                key={tag}
                                onClick={() => onTagClick && onTagClick(tag)}
                                className="px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full text-xs font-bold text-neon-cyan border border-neon-cyan/30 shadow-[0_0_10px_rgba(0,255,204,0.1)] hover:shadow-[0_0_15px_rgba(0,255,204,0.3)] hover:border-neon-cyan/60 transition-all cursor-pointer"
                            >
                                #{tag}
                            </motion.button>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-6 text-gray-300 mb-8">
                        <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10 backdrop-blur-sm">
                            <span className="block text-xs text-gray-500 uppercase">{metric === 'minutes' ? 'Est. Minutes' : 'Total Plays'}</span>
                            <span className="text-xl font-bold text-white">
                                {metric === 'minutes'
                                    ? (stats.m ? stats.m.toLocaleString() : Math.round(stats.t * 3.5).toLocaleString())
                                    : stats.t.toLocaleString()}
                            </span>
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

                    {/* Top Albums Section */}
                    {sortedAlbums.length > 0 && (
                        <div className="mb-10">
                            <div className="flex items-center gap-4 mb-6">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Music className="text-neon-pink" size={24} /> Top Albums
                                </h3>
                                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {sortedAlbums.map(([name, data]) => (
                                    <motion.div
                                        layoutId={`album-${name}`}
                                        key={name}
                                        onClick={() => setExpandedAlbum(expandedAlbum === name ? null : name)}
                                        whileHover={{ y: -5 }}
                                        className={`group relative bg-black/40 rounded-xl overflow-hidden border transition-all cursor-pointer ${expandedAlbum === name ? 'border-neon-pink ring-2 ring-neon-pink/50 shadow-[0_0_20px_rgba(255,0,85,0.3)]' : 'border-white/10 hover:border-white/30 hover:shadow-xl'}`}
                                    >
                                        <div className="aspect-square bg-black/40 relative">
                                            {data.url ? (
                                                <img src={data.url} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-700">
                                                    <Music size={40} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <div className="font-bold text-sm text-white truncate" title={name}>{name}</div>
                                            <div className="text-xs text-gray-500">{data.count} plays</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Expanded Album Details */}
                            <AnimatePresence>
                                {expandedAlbum && stats.albums[expandedAlbum] && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0, y: -20 }}
                                        animate={{ height: 'auto', opacity: 1, y: 0 }}
                                        exit={{ height: 0, opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3, ease: "circOut" }}
                                        className="overflow-hidden bg-black/40 rounded-xl border border-white/10 mt-6 backdrop-blur-md relative"
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full bg-neon-pink"></div>
                                        <div className="p-6">
                                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                                <div className="flex items-center gap-4">
                                                    {stats.albums[expandedAlbum].url && (
                                                        <img src={stats.albums[expandedAlbum].url} className="w-12 h-12 rounded border border-white/10" />
                                                    )}
                                                    <div>
                                                        <h4 className="text-xl font-bold text-white">{expandedAlbum}</h4>
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-xs text-neon-pink font-mono uppercase tracking-widest">Tracklist</div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const tracks = stats.albums[expandedAlbum].tracks.map(t => ({ ...t, artist: artist }));
                                                                    if (onPlayContext) onPlayContext(tracks);
                                                                }}
                                                                className="flex items-center gap-1 text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-full transition-colors"
                                                            >
                                                                <Play size={10} fill="currentColor" /> PLAY
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setExpandedAlbum(null)}
                                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center transition-colors text-gray-400 hover:text-white"
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                                                {stats.albums[expandedAlbum].tracks.map((track, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-white/5 rounded group border-b border-white/5 last:border-0 border-dashed">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className="text-gray-600 w-6 text-right font-mono text-xs">{idx + 1}</span>
                                                            <span className={`text-sm font-medium truncate max-w-[200px] transition-colors ${track.verified ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                                                {track.name}
                                                            </span>
                                                            {track.verified && (
                                                                <Zap size={10} className="text-neon-cyan/50 shrink-0" title="Verified Track" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-neon-pink/50"
                                                                    style={{ width: `${Math.min((track.count / (stats.albums[expandedAlbum].count || 1)) * 300, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-mono text-gray-500 w-10 text-right">{track.count}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

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
