import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    Calendar,
    Clock3,
    Disc3,
    Flame,
    Heart,
    History,
    Infinity as InfinityIcon,
    Library,
    Loader,
    Music,
    Play,
    Radio,
    RefreshCw,
    Repeat,
    Shuffle,
    Sparkles,
    Zap
} from 'lucide-react';

const PRESETS = [
    {
        id: 'yearly-top',
        name: 'Yearly Top 100',
        shortName: 'Yearly Top',
        description: 'Your most-played tracks during one calendar year.',
        icon: Calendar,
        accent: '#00ffcc',
        needsYear: true
    },
    {
        id: 'all-time',
        name: 'All-Time Heavy Rotation',
        shortName: 'All-Time',
        description: 'The songs with the highest lifetime play counts.',
        icon: InfinityIcon,
        accent: '#ffffff'
    },
    {
        id: 'forgotten-favorites',
        name: 'Forgotten Favorites',
        shortName: 'Forgotten',
        description: 'Former staples you have not played for at least a year.',
        icon: History,
        accent: '#facc15'
    },
    {
        id: 'peak-obsessions',
        name: 'Peak Obsessions',
        shortName: 'Obsessions',
        description: 'Tracks that took over a particular month of your life.',
        icon: Flame,
        accent: '#ff4d6d'
    },
    {
        id: 'long-haul',
        name: 'Long-Term Companions',
        shortName: 'Long Haul',
        description: 'Songs that kept returning across three or more years.',
        icon: Heart,
        accent: '#ec4899'
    },
    {
        id: 'rediscoveries',
        name: 'Recent Rediscoveries',
        shortName: 'Rediscovered',
        description: 'Old music heard again after a gap of at least a year.',
        icon: RefreshCw,
        accent: '#38bdf8'
    },
    {
        id: 'deep-catalog',
        name: 'Deep Catalog',
        shortName: 'Deep Cuts',
        description: 'Less-played tracks hiding inside your favorite artists.',
        icon: Library,
        accent: '#a78bfa'
    },
    {
        id: 'time-capsule',
        name: 'Year Time Capsule',
        shortName: 'Time Capsule',
        description: 'Tracks whose listening history belongs overwhelmingly to one year.',
        icon: Clock3,
        accent: '#fb923c',
        needsYear: true
    },
    {
        id: 'fresh-finds',
        name: 'Fresh Finds',
        shortName: 'First Heard',
        description: 'Music you first scrobbled in the selected year.',
        icon: Sparkles,
        accent: '#22d3ee',
        needsYear: true
    },
    {
        id: 'one-per-artist',
        name: 'One Per Artist',
        shortName: 'Artist Sampler',
        description: 'Your number-one track from each artist, with no repeats.',
        icon: Radio,
        accent: '#84cc16'
    },
    {
        id: 'steady-rotation',
        name: 'Steady Rotation',
        shortName: 'Steady Rotation',
        description: 'Songs heard on the greatest number of different days.',
        icon: Repeat,
        accent: '#14b8a6'
    },
    {
        id: 'seasonal-returns',
        name: 'Seasonal Returns',
        shortName: 'Seasonal',
        description: 'Tracks that return during the same month across multiple years.',
        icon: Zap,
        accent: '#e879f9',
        needsMonth: true
    },
    {
        id: 'album-sampler',
        name: 'Album Sampler',
        shortName: 'Album Sampler',
        description: 'One defining track from each of your most-played albums.',
        icon: Disc3,
        accent: '#f97316'
    },
    {
        id: 'recent-rotation',
        name: 'Recent Rotation',
        shortName: 'Recent',
        description: 'Your most-played music from the last 180 days.',
        icon: Music,
        accent: '#60a5fa'
    }
];

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const LIMITS = [25, 50, 100, 200];
const AnimatedButton = motion.button;

function TrackArtwork({ track }) {
    if (track.image) {
        return <img src={track.image} alt="" className="h-12 w-12 rounded-lg object-cover border border-white/10" />;
    }

    return (
        <div className="h-12 w-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
            <Music size={18} />
        </div>
    );
}

export default function Jukebox({ data, serverUrl, onPlayContext }) {
    const years = useMemo(
        () => Object.keys(data?.years || {}).map(Number).sort((a, b) => b - a),
        [data?.years]
    );
    const [presetId, setPresetId] = useState('yearly-top');
    const [year, setYear] = useState(() => years[0] || new Date().getFullYear());
    const [month, setMonth] = useState(() => new Date().getMonth() + 1);
    const [limit, setLimit] = useState(100);
    const [refreshToken, setRefreshToken] = useState(0);
    const [requestState, setRequestState] = useState({ key: '', playlist: null, error: '' });

    const preset = PRESETS.find((item) => item.id === presetId) || PRESETS[0];
    const PresetIcon = preset.icon;
    const requestQuery = useMemo(() => new URLSearchParams({
        type: presetId,
        year: String(year),
        month: String(month),
        limit: String(limit)
    }).toString(), [presetId, year, month, limit]);
    const requestKey = `${requestQuery}:${refreshToken}`;
    const loading = requestState.key !== requestKey;
    const playlist = requestState.playlist;
    const error = requestState.key === requestKey ? requestState.error : '';

    useEffect(() => {
        const controller = new AbortController();

        fetch(`${serverUrl}/api/jukebox?${requestQuery}`, { signal: controller.signal })
            .then(async (response) => {
                const body = await response.json();
                if (!response.ok) throw new Error(body.error || 'The jukebox could not build this mix.');
                return body;
            })
            .then((nextPlaylist) => setRequestState({ key: requestKey, playlist: nextPlaylist, error: '' }))
            .catch((requestError) => {
                if (requestError.name !== 'AbortError') {
                    setRequestState({
                        key: requestKey,
                        playlist: null,
                        error: requestError.message || 'The jukebox could not reach the music archive.'
                    });
                }
            });

        return () => controller.abort();
    }, [requestKey, requestQuery, serverUrl]);

    const playTracks = (tracks, suffix = '') => {
        if (!tracks?.length || !onPlayContext) return;
        onPlayContext(tracks, `jukebox-${presetId}${suffix}`);
    };

    const shuffleAndPlay = () => {
        const shuffled = [...(playlist?.tracks || [])];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
        }
        playTracks(shuffled, '-shuffle');
    };

    return (
        <div className="pb-20">
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl px-6 py-10 md:px-10 md:py-12 mb-8">
                <div
                    className="absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl opacity-20 pointer-events-none"
                    style={{ backgroundColor: preset.accent }}
                />
                <div className="relative z-10 max-w-4xl">
                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.35em] mb-4" style={{ color: preset.accent }}>
                        <Radio size={14} /> Memory-driven radio
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-4">Jukebox</h1>
                    <p className="text-gray-400 text-base md:text-lg max-w-2xl leading-relaxed">
                        Turn your complete Last.fm history into playable queues. Pick a lens, tune the rules, and let the header player carry the mix anywhere in the archive.
                    </p>
                </div>
            </section>

            <section className="mb-8">
                <div className="flex items-end justify-between gap-4 mb-4">
                    <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-2">Choose a signal</p>
                        <h2 className="text-2xl font-bold text-white">Playlist recipes</h2>
                    </div>
                    <span className="hidden md:block text-xs font-mono text-white/30">{PRESETS.length} WAYS INTO THE ARCHIVE</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {PRESETS.map((item) => {
                        const Icon = item.icon;
                        const active = item.id === presetId;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setPresetId(item.id)}
                                className={`group text-left rounded-2xl border p-4 transition-all duration-300 min-h-[138px] ${active ? 'bg-white/10 border-white/25 -translate-y-1' : 'bg-black/30 border-white/5 hover:bg-white/5 hover:border-white/15'}`}
                                style={active ? { boxShadow: `0 14px 40px ${item.accent}18` } : undefined}
                            >
                                <div className="flex items-center justify-between mb-5">
                                    <span className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/5" style={{ color: item.accent }}>
                                        <Icon size={18} />
                                    </span>
                                    {active && <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: item.accent }} />}
                                </div>
                                <div className="font-bold text-white text-sm mb-1">{item.shortName}</div>
                                <div className="text-[11px] leading-relaxed text-gray-500 group-hover:text-gray-400 transition-colors">{item.description}</div>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
                <aside className="lg:sticky lg:top-36 rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl p-5">
                    <div className="flex items-center gap-3 mb-5">
                        <span className="h-11 w-11 rounded-2xl bg-white/5 flex items-center justify-center" style={{ color: preset.accent }}>
                            <PresetIcon size={20} />
                        </span>
                        <div>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-white/35">Now building</div>
                            <div className="font-bold text-white">{preset.name}</div>
                        </div>
                    </div>

                    <p className="text-sm text-gray-400 leading-relaxed mb-6">{preset.description}</p>

                    {preset.needsYear && (
                        <label className="block mb-5">
                            <span className="block text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">Year</span>
                            <select
                                value={year}
                                onChange={(event) => setYear(Number(event.target.value))}
                                className="w-full rounded-xl bg-black/60 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
                            >
                                {years.map((availableYear) => <option key={availableYear} value={availableYear}>{availableYear}</option>)}
                            </select>
                        </label>
                    )}

                    {preset.needsMonth && (
                        <label className="block mb-5">
                            <span className="block text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">Recurring month</span>
                            <select
                                value={month}
                                onChange={(event) => setMonth(Number(event.target.value))}
                                className="w-full rounded-xl bg-black/60 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
                            >
                                {MONTHS.map((monthName, index) => <option key={monthName} value={index + 1}>{monthName}</option>)}
                            </select>
                        </label>
                    )}

                    <div className="mb-6">
                        <span className="block text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">Queue length</span>
                        <div className="grid grid-cols-4 gap-1.5">
                            {LIMITS.map((queueLimit) => (
                                <button
                                    key={queueLimit}
                                    type="button"
                                    onClick={() => setLimit(queueLimit)}
                                    className={`rounded-lg py-2 text-xs font-mono transition-colors ${limit === queueLimit ? 'bg-white text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                >
                                    {queueLimit}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            disabled={!playlist?.tracks?.length || loading}
                            onClick={() => playTracks(playlist.tracks)}
                            className="rounded-xl bg-white text-black py-3 px-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                        >
                            <Play size={15} fill="currentColor" /> Play
                        </button>
                        <button
                            type="button"
                            disabled={!playlist?.tracks?.length || loading}
                            onClick={shuffleAndPlay}
                            className="rounded-xl bg-white/10 text-white py-3 px-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/15 transition-colors"
                        >
                            <Shuffle size={15} /> Shuffle
                        </button>
                    </div>
                </aside>

                <div className="rounded-3xl border border-white/10 bg-black/45 backdrop-blur-xl overflow-hidden min-h-[520px]">
                    <div className="px-5 md:px-7 py-5 border-b border-white/10 flex items-center justify-between gap-4">
                        <div>
                            <h2 className="font-bold text-white text-xl">{preset.name}</h2>
                            <p className="text-xs text-white/35 mt-1 font-mono">
                                {loading ? 'READING LISTENING HISTORY…' : `${playlist?.tracks?.length || 0} TRACKS · ${playlist?.totalCandidates || 0} CANDIDATES`}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setRefreshToken((value) => value + 1)}
                            disabled={loading}
                            className="p-2.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
                            title="Rebuild this mix"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {loading && (
                        <div className="min-h-[420px] flex flex-col items-center justify-center gap-4 text-white/40">
                            <Loader size={28} className="animate-spin" style={{ color: preset.accent }} />
                            <span className="text-xs font-mono tracking-[0.25em]">TUNING THE ARCHIVE</span>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="min-h-[420px] flex flex-col items-center justify-center text-center p-8">
                            <AlertCircle size={28} className="text-neon-pink mb-4" />
                            <h3 className="text-white font-bold mb-2">The signal dropped</h3>
                            <p className="text-sm text-gray-500 max-w-md mb-5">{error}</p>
                            <button
                                type="button"
                                onClick={() => setRefreshToken((value) => value + 1)}
                                className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {!loading && !error && playlist?.tracks?.length === 0 && (
                        <div className="min-h-[420px] flex flex-col items-center justify-center text-center p-8">
                            <Music size={30} className="text-white/20 mb-4" />
                            <h3 className="text-white font-bold mb-2">No tracks fit this recipe</h3>
                            <p className="text-sm text-gray-500 max-w-md">Try another year, month, or playlist recipe.</p>
                        </div>
                    )}

                    {!loading && !error && playlist?.tracks?.length > 0 && (
                        <div className="divide-y divide-white/5">
                            {playlist.tracks.map((track, index) => (
                                <AnimatedButton
                                    key={`${track.artist}-${track.name}`}
                                    type="button"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(index * 0.012, 0.35) }}
                                    onClick={() => playTracks(playlist.tracks.slice(index), `-${index + 1}`)}
                                    className="w-full grid grid-cols-[34px_48px_minmax(0,1fr)_auto] items-center gap-3 px-4 md:px-6 py-3 text-left hover:bg-white/5 transition-colors group"
                                >
                                    <span className="text-xs font-mono text-white/25 group-hover:text-white/60 text-right">{index + 1}</span>
                                    <TrackArtwork track={track} />
                                    <span className="min-w-0">
                                        <span className="block text-sm font-bold text-white truncate group-hover:text-neon-cyan transition-colors">{track.name}</span>
                                        <span className="block text-xs text-gray-500 truncate mt-0.5">{track.artist}{track.album ? ` · ${track.album}` : ''}</span>
                                        <span className="block md:hidden text-[10px] text-white/30 truncate mt-1">{track.detail}</span>
                                    </span>
                                    <span className="hidden md:flex items-center gap-4 pl-4">
                                        <span className="text-[11px] text-white/35 max-w-[260px] truncate">{track.detail}</span>
                                        <span className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-white group-hover:text-black transition-colors">
                                            <Play size={13} fill="currentColor" />
                                        </span>
                                    </span>
                                </AnimatedButton>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
