import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useAnimationFrame } from 'framer-motion';
import { LayoutDashboard, Calendar, Music, User, Zap, Mic, MicOff, Layers, MessageSquare, X, Github, ChevronDown, BookOpen, PenTool, MessageCircle, Sparkles, Leaf } from 'lucide-react';
import rawData from './data/dashboard_payload.json';
import Overview from './components/Overview';
import YearDetail from './components/YearDetail';
import MonthDetail from './components/MonthDetail';
import ArtistProfile from './components/ArtistProfile';
import BingeReport from './components/BingeReport';
import Library from './components/Library';
import FluidBackground from './components/FluidBackground';
import ShaderBackground from './components/ShaderBackground';
import AdvancedAnalyticsDashboard from './components/AdvancedAnalyticsDashboard';
import { AnalyticsProvider } from './components/AnalyticsProvider';
import GlassDistortionFilter from './components/GlassDistortionFilter';
import PersistentPlayer from './components/PersistentPlayer';
import ErrorBoundary from './components/ErrorBoundary';
import { AudioReactiveProvider, useAudioReactive } from './components/AudioReactiveContext';

const REFRESH_INTERVAL_MS = 10000;
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Optimized Button Component that animates without re-rendering parent
const PulsingMicButton = () => {
  const { isListening, toggleListening, audioSource, setAudioSource, audioStateRef } = useAudioReactive();
  const buttonRef = useRef(null);
  const canvasRef = useRef(null);
  const borderCanvasRef = useRef(null); // New canvas for the border

  // Animate via Framer Motion loop (bypasses React Render)
  useAnimationFrame(() => {
    const canvas = canvasRef.current;
    const borderCanvas = borderCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    const borderCtx = borderCanvas?.getContext('2d');

    if (!isListening || !audioStateRef.current || !ctx || !borderCtx) {
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Enhanced Idle Animation
      if (buttonRef.current && borderCtx && borderCanvas) {
        const time = Date.now() / 1500; // Slow breath
        const idleGlow = (Math.sin(time) * 0.5 + 0.5); // 0 to 1

        // 1. Button Breathing
        buttonRef.current.style.transform = `scale(${1 + idleGlow * 0.03})`;
        buttonRef.current.style.boxShadow = `0 0 ${8 + idleGlow * 12}px rgba(0, 255, 255, ${0.1 + idleGlow * 0.15})`;
        buttonRef.current.style.borderColor = `rgba(255, 255, 255, ${0.15 + idleGlow * 0.2})`;

        // 2. Rotating Border Ring (Searching Effect)
        const bw = borderCanvas.width;
        const bh = borderCanvas.height;
        borderCtx.clearRect(0, 0, bw, bh);

        const pad = 4;
        const r = (bh - 2 * pad) / 2;
        const leftX = r + pad;
        const rightX = bw - r - pad;

        // Draw Faint Track
        borderCtx.strokeStyle = 'rgba(255,255,255,0.05)';
        borderCtx.lineWidth = 1;
        borderCtx.beginPath();
        borderCtx.roundRect(pad, pad, bw - 2 * pad, bh - 2 * pad, r);
        borderCtx.stroke();

        // Draw Rotating Arcs
        // We simulate a 'pill path' mathematically or just draw arcs at the corners?
        // Let's keep it simple: Just 2 rotating partial arcs around the pill shape would be hard to calculate perfect path.
        // Instead, let's just pulse the "Mini Graph" with a fake EQ pattern
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const w = canvas.width;
          const h = canvas.height;
          const barWidth = w / 8;
          ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + idleGlow * 0.3})`;

          for (let i = 0; i < 8; i++) {
            const x = i * barWidth;
            // Fake sine wave movement
            const fakeAmp = Math.sin(i * 0.8 + time * 3) * 0.5 + 0.5;
            const barHeight = 2 + (fakeAmp * h * 0.4);
            const y = (h - barHeight) / 2;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
          }
        }
      }
      return;
    }

    const { energy, data } = audioStateRef.current;
    const time = Date.now() / 1000;

    // 1. Animate Button Scale/Glow directly via DOM
    // Smooth scaling
    const targetScale = 1 + (energy * 0.05); // Reduced scale slightly to keep border sharp
    buttonRef.current.style.transform = `scale(${targetScale})`;

    // Shadow pulse
    const color = energy > 0.5 ? '#ff00ff' : '#00ffcc';
    buttonRef.current.style.boxShadow = `0 0 ${15 + (energy * 20)}px ${color}30`; // Softer shadow
    buttonRef.current.style.borderColor = 'transparent'; // Hide CSS border so canvas can shine

    // 2. Draw Mini Visualizer on Canvas
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const barWidth = w / 8; // 8 bars
    const step = Math.floor(data.length / 8);

    ctx.fillStyle = color;
    for (let i = 0; i < 8; i++) {
      const dataIndex = i * step;
      const value = data[dataIndex] || 0;
      const percent = value / 255;
      const barHeight = Math.max(2, percent * h * 0.8);

      // Draw rounded bars centered vertically
      const x = i * barWidth;
      const y = (h - barHeight) / 2;

      ctx.globalAlpha = 0.8;
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
    }

    // 3. Draw Waveform Border
    // The canvas covers the entire button + padding. We draw a "pill" shape that wiggles.
    const bw = borderCanvas.width;
    const bh = borderCanvas.height;
    borderCtx.clearRect(0, 0, bw, bh);
    borderCtx.strokeStyle = color;
    borderCtx.lineWidth = 2;
    borderCtx.lineCap = 'round';
    borderCtx.lineJoin = 'round';
    borderCtx.shadowBlur = 4;
    borderCtx.shadowColor = color;

    // Define Pill Path
    const pad = 4; // Padding from edge
    const r = (bh - 2 * pad) / 2;
    const leftX = r + pad;
    const rightX = bw - r - pad;
    const midY = bh / 2;

    borderCtx.beginPath();

    // We'll walk around the perimeter of the pill shape
    // Simplify: Draw top line, right arc, bottom line, left arc using small segments to add noise

    // Top Line (Left to Right)
    for (let x = leftX; x <= rightX; x += 2) {
      // Noise based on audio data
      const dataIdx = Math.floor(((x - leftX) / (rightX - leftX)) * (data.length / 2));
      const noise = (data[dataIdx] / 255) * energy * 6 * Math.sin(x * 0.2 + time * 10);
      borderCtx.lineTo(x, pad + noise);
    }

    // Right Arc
    borderCtx.arc(rightX, midY, r, -Math.PI / 2, Math.PI / 2);

    // Bottom Line (Right to Left)
    for (let x = rightX; x >= leftX; x -= 2) {
      // Noise
      const dataIdx = Math.floor(((rightX - x) / (rightX - leftX)) * (data.length / 2)) + (data.length / 2);
      const noise = (data[dataIdx] / 255) * energy * 6 * Math.sin(x * 0.2 + time * 8);
      borderCtx.lineTo(x, bh - pad + noise);
    }

    // Left Arc
    borderCtx.arc(leftX, midY, r, Math.PI / 2, -Math.PI / 2);

    borderCtx.stroke();

  });

  return (
    <button
      ref={buttonRef}
      onClick={toggleListening}
      className={`group relative flex items-center gap-3 px-4 py-2 rounded-full border transition-colors duration-300 ${isListening ? 'bg-black/80 border-transparent' : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'}`}
      title="Visualize Audio (Speaker/Mic Required)"
    >
      {/* Waveform Border Canvas (Absolute Overlay) */}
      <canvas
        ref={borderCanvasRef}
        width={220} // Slightly larger than button
        height={60}
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300 ${isListening ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Icon */}
      <div className={`relative z-10 ${isListening ? "text-neon-cyan animate-pulse" : ""}`}>
        {isListening ? <Zap size={18} fill="currentColor" /> : <MicOff size={18} />}
      </div>

      {/* Source Toggle */}
      <div
        role="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isListening) {
            alert('Stop audio first');
            return;
          }
          setAudioSource(audioSource === 'mic' ? 'tab' : 'mic');
        }}
        className="text-xs px-2 py-1 rounded border border-white/20 hover:border-neon-cyan hover:bg-white/5 transition-colors relative z-10 cursor-pointer select-none"
        title={`Switch to ${audioSource === 'mic' ? 'Tab Audio' : 'Microphone'}`}
      >
        {audioSource === 'mic' ? 'Mic' : 'Tab'}
      </div>

      {/* Mini Graph Canvas */}
      <div className="flex flex-col gap-0.5 relative z-10">
        <canvas
          ref={canvasRef}
          width={60}
          height={20}
          className="opacity-90"
        />
      </div>

      {/* Text Label (Optional, maybe just Visualizer?) */}
      {!isListening && <span className="text-xs font-mono tracking-widest opacity-60">VISUALIZE</span>}
    </button>
  );
};

// Reusable Nav Dropdown Menu Component
const NavDropdown = ({ label, links }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const dropdownVariants = {
    hidden: {
      opacity: 0,
      y: -8,
      scale: 0.95,
      filter: 'blur(4px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
        staggerChildren: 0.06,
        delayChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      y: -6,
      scale: 0.97,
      filter: 'blur(4px)',
      transition: { duration: 0.15, staggerChildren: 0.03, staggerDirection: -1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -12, scale: 0.9 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 500, damping: 22 },
    },
    exit: { opacity: 0, x: -8, scale: 0.95, transition: { duration: 0.1 } },
  };

  return (
    <div
      ref={dropdownRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative px-4 py-2 text-xs font-mono tracking-widest text-gray-400 uppercase transition-all duration-300 hover:text-white flex items-center gap-1.5"
      >
        {/* Animated underline */}
        <span className="absolute bottom-1 left-1/2 h-[1px] w-0 bg-gradient-to-r from-neon-cyan via-neon-pink to-neon-cyan transition-all duration-300 group-hover:left-2 group-hover:w-[calc(100%-16px)]" />

        {/* Glow on hover */}
        <span className="absolute inset-0 rounded-lg opacity-0 bg-white/5 transition-opacity duration-300 group-hover:opacity-100" />

        <span className="relative z-10 transition-transform duration-300 group-hover:-translate-y-[1px] inline-block">
          {label}
        </span>

        {/* Chevron with rotation animation */}
        <motion.span
          className="relative z-10"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <ChevronDown size={12} />
        </motion.span>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 origin-top z-[60]"
          >
            {/* Decorative arrow */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-black/80 border-l border-t border-white/10" />

            <div className="relative bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(0,255,255,0.05)]">
              {/* Subtle gradient shine at top */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />

              <div className="py-1.5">
                {links.map((link, i) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    variants={itemVariants}
                    className="group/item relative flex items-center gap-3 px-4 py-2.5 text-xs font-mono tracking-wider text-gray-400 uppercase transition-all duration-300 hover:text-white"
                    whileHover={{ x: 4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {/* Hover background glow */}
                    <span className="absolute inset-x-1 inset-y-0.5 rounded-lg opacity-0 bg-white/5 transition-opacity duration-200 group-hover/item:opacity-100" />

                    {/* Icon with gradient color on hover */}
                    <motion.span
                      className="relative z-10 text-gray-500 transition-colors duration-300 group-hover/item:text-white"
                      whileHover={{ rotate: [0, -10, 10, -5, 0], scale: 1.2 }}
                      transition={{ duration: 0.4 }}
                    >
                      <link.icon size={14} />
                    </motion.span>

                    {/* Label */}
                    <span className="relative z-10">{link.label}</span>

                    {/* Animated neon dot indicator on hover */}
                    <motion.span
                      className={`ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r ${link.color} opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 relative z-10`}
                      animate={isOpen ? { scale: [1, 1.4, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
                    />

                    {/* Bottom separator (except last) */}
                    {i < links.length - 1 && (
                      <span className="absolute bottom-0 left-4 right-4 h-px bg-white/5" />
                    )}
                  </motion.a>
                ))}
              </div>

              {/* Subtle gradient shine at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-neon-pink/20 to-transparent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Inner Content Component
function MainDashboard() {
  const [view, setView] = useState('overview'); // overview, year, artist, binges
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [initialLibrarySearch, setInitialLibrarySearch] = useState('');
  const [metric, setMetric] = useState('scrobbles'); // 'scrobbles' | 'minutes'
  const [backgroundType, setBackgroundType] = useState('fluid'); // Default to Fluid

  // Global Player State
  const [nowPlaying, setNowPlaying] = useState(null);
  const [isGlobalPlayerActive, setIsGlobalPlayerActive] = useState(false);

  const [globalVolume, setGlobalVolume] = useState(25);
  const [isGlobalPlaying, setIsGlobalPlaying] = useState(false);

  // Queue / Manual Playback State
  const [playbackQueue, setPlaybackQueue] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isManualPlayback, setIsManualPlayback] = useState(false);
  const [queueLoading, setQueueLoading] = useState(null); // Track which context is loading

  // Background Intensity
  const playerIntensity = isGlobalPlaying ? (globalVolume / 100) : 0;

  // --- Lyrics Logic ---
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);

  // Helper: Parse LRC
  const parseLrc = (lrcString) => {
    if (!lrcString) return [];
    const lines = lrcString.split('\n');
    const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
    return lines.map(line => {
      const match = regex.exec(line);
      if (!match) return null;
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3]);
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = match[4].trim();
      return { time, text };
    }).filter(l => l !== null);
  };

  const syncedLines = useMemo(() => {
    if (lyrics && lyrics.trim().startsWith('[')) {
      return parseLrc(lyrics);
    }
    return null;
  }, [lyrics]);

  const activeLineIndex = useMemo(() => {
    if (!syncedLines) return -1;
    // Offset to trigger highlights slightly earlier (user request: "a sec before")
    const SYNC_OFFSET = 1.5;
    return syncedLines.findLastIndex(l => l.time <= currentPlaybackTime + SYNC_OFFSET);
  }, [syncedLines, currentPlaybackTime]);

  // Auto-scroll lyrics
  const lyricsContainerRef = useRef(null);
  useEffect(() => {
    if (activeLineIndex !== -1 && lyricsContainerRef.current && lyricsContainerRef.current.children[0]) {
      // The first child is the wrapper div, children are the lines
      // Wait, I rendered a wrapper div in the JSX below.
      // Let's target the wrapper's children
      const wrapper = lyricsContainerRef.current.children[0]; // If I wrap in a div
      if (!wrapper) return;
      const activeEl = wrapper.children[activeLineIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLineIndex]);

  // Auto-fetch lyrics when song changes or panel opens
  useEffect(() => {
    if (showLyrics && nowPlaying) {
      setLyricsLoading(true);
      setLyrics(null); // Clear previous lyrics
      fetch(`${SERVER_URL}/api/lyrics?artist=${encodeURIComponent(nowPlaying.artist)}&track=${encodeURIComponent(nowPlaying.name)}`)
        .then(res => res.json())
        .then(data => {
          setLyrics(data.lyrics || "Lyrics not found in database.");
        })
        .catch(err => setLyrics("Lyrics not found."))
        .finally(() => setLyricsLoading(false));
    }
  }, [nowPlaying?.name, nowPlaying?.artist, showLyrics]);

  // Reset lyrics on song change
  useEffect(() => {
    setLyrics(null);
  }, [nowPlaying?.name, nowPlaying?.artist]);

  // Data State (Starts with static bundle, updates from API)
  const [data, setData] = useState(rawData);

  // Fetch fresh data periodically (every 2 minutes)
  useEffect(() => {
    const fetchData = () => {
      fetch(`${SERVER_URL}/api/dashboard/data`)
        .then(res => res.json())
        .then(freshData => {
          // Validate that we actually received meaningful data before overwriting
          const isValid = freshData.timeline && Object.keys(freshData.timeline).length > 0;

          if (!isValid) {
            console.warn('Received empty/invalid data from API. Ignoring:', freshData);
            return;
          }

          setData(prevData => {
            // Safety Check: If server returns 0/low data but we have data, likely a server-side DB issue (common on Vercel)
            // We trust the bundled data (prevData) more than an empty server response.
            const prevTotal = prevData?.meta?.total_scrobbles || 0;
            const newTotal = freshData.meta.total_scrobbles || 0;

            if (prevTotal > 0 && newTotal === 0) {
              console.warn('Server returned 0/empty data vs local valid data. Ignoring server update.');
              return prevData;
            }

            if (freshData.meta.update_time !== prevData?.meta?.update_time) {
              console.log('Loaded fresh dashboard data:', freshData.meta.update_time);
              return freshData;
            }
            return prevData;
          });
        })
        .catch(err => {
          console.error('Failed to load fresh data from API:', err);
          console.warn('Falling back to static payload (may be stale).');
        });
    };

    fetchData(); // Initial load
    const interval = setInterval(fetchData, 120000); // Poll every 2 minutes
    return () => clearInterval(interval);
  }, []);

  // Poll for Now Playing Data Globally
  useEffect(() => {
    const fetchNowPlaying = async () => {
      if (isManualPlayback) return; // Skip polling if manual queue is active

      try {
        const res = await fetch(`${SERVER_URL}/api/now-playing`);
        const data = await res.json();
        if (data.nowPlaying) {
          setNowPlaying(prev => {
            if (prev &&
              prev.name === data.nowPlaying.name &&
              prev.artist === data.nowPlaying.artist &&
              prev.isPlaying === data.nowPlaying.isPlaying) {
              return prev;
            }
            return data.nowPlaying;
          });
        }
      } catch (err) { }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isManualPlayback]);

  // Audio State for UI adjustments
  const { isListening, updateVolume } = useAudioReactive();

  // Sync Global Volume to Audio Visualizer Sensitivity
  useEffect(() => {
    if (updateVolume) updateVolume(globalVolume);
  }, [globalVolume, updateVolume]);

  // --- Queue Logic ---
  const playContext = (tracks, contextId = null) => {
    if (!tracks || tracks.length === 0) return;

    // Set loading state
    setQueueLoading(contextId);

    // Normalize tracks
    const formattedTracks = tracks.map(t => ({
      name: t.name || t.trackName,
      artist: t.artist || t.artistName,
      image: t.image || null,
      isPlaying: true
    }));

    setPlaybackQueue(formattedTracks);
    setCurrentTrackIndex(0);
    setIsManualPlayback(true);
    setNowPlaying(formattedTracks[0]);
    setIsGlobalPlayerActive(true);
    setIsGlobalPlaying(true);

    // Clear loading state after a short delay (when player starts)
    setTimeout(() => setQueueLoading(null), 1000);
  };

  const handleTrackEnded = () => {
    if (isManualPlayback && playbackQueue.length > 0) {
      if (currentTrackIndex < playbackQueue.length - 1) {
        const nextIndex = currentTrackIndex + 1;
        setCurrentTrackIndex(nextIndex);
        setNowPlaying(playbackQueue[nextIndex]);
      } else {
        // End of queue
        setIsManualPlayback(false);
        setIsGlobalPlaying(false);
      }
    }
  };



  // View Handlers
  const handleYearClick = (year, metric) => {
    setSelectedYear(year);
    setView('year');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMonthClick = (year, month) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setView('month');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleArtistClick = (artistName) => {
    setSelectedArtist(artistName);
    setView('artist');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBingeClick = () => {
    setView('binges');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const goHome = () => {
    setView('overview');
    setSelectedYear(null);
    setSelectedArtist(null);
    setInitialLibrarySearch('');
  };

  const handleTagClick = (tag) => {
    setInitialLibrarySearch(tag);
    setView('library');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen text-gray-200 selection:bg-neon-pink selection:text-white pb-20 overflow-x-hidden relative">
      {/* Backgrounds */}
      <AnimatePresence mode="wait">
        {backgroundType === 'fluid' ? (
          <motion.div key="fluid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 -z-10">
            <FluidBackground intensity={playerIntensity} />
          </motion.div>
        ) : (
          <motion.div key="shader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 -z-10">
            <ShaderBackground />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.nav
        initial={false}
        animate={{ height: isGlobalPlayerActive ? 'auto' : 'auto' }}
        className="fixed top-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-b border-white/10 z-50 flex flex-col"
      >
        {/* Responsive Container */}
        <div className={`w-full flex flex-wrap items-center justify-between px-4 py-3 gap-y-4 md:gap-y-0 transition-all duration-500 ${isGlobalPlayerActive ? 'md:h-auto md:py-4' : 'md:h-20'}`}>

          <div className="flex items-start order-1 md:w-1/3 h-full">
            <div className="flex items-start gap-1 h-full">
              {/* "audio." part -> Links to current app home */}
              <div className="cursor-pointer group self-start" onClick={goHome}>
                <span className="text-xl tracking-tight transition-opacity hover:opacity-80">
                  <span className="text-white font-bold" style={{ fontFamily: "'Roboto', sans-serif" }}>audio.</span>
                </span>
              </div>

              {/* "sardistic.com" part -> Links to main site, replaced by GIF overhang */}
              <a href="https://sardistic.com" className="relative block group z-50 ml-1 self-start">
                {/* Image overhangs the header below only.
                     Aligned to top (self-start).
                     Size reduced (~20%): h-12 (mobile) md:h-20 (desktop base) 
                     Added slight scale on hover. */}
                <img
                  src="https://www.sardistic.com/wp-content/uploads/2026/02/liquid_transparent.webp"
                  alt="sardistic.com"
                  className="h-10 md:h-[72px] w-auto object-contain transition-transform group-hover:scale-105"
                  style={{
                    marginTop: '-5px', // Fine-tune top alignment
                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
                  }}
                />
              </a>
            </div>

            {/* Navigation Menu Links */}
            <nav className="hidden md:flex items-center gap-1 ml-6">
              {/* Sardistic Dropdown */}
              <NavDropdown label="Sardistic" links={[
                { label: 'Chat', href: 'https://chat.sardistic.com/', icon: MessageCircle, color: 'from-neon-cyan to-blue-400' },
                { label: 'Read', href: 'https://read.sardistic.com/', icon: BookOpen, color: 'from-neon-pink to-purple-400' },
                { label: 'Write', href: 'https://write.sardistic.com/', icon: PenTool, color: 'from-neon-green to-emerald-400' },
              ]} />

              {/* .com link */}
              <a
                href="https://sardistic.com"
                className="group relative px-4 py-2 text-xs font-mono tracking-widest text-gray-400 uppercase transition-all duration-300 hover:text-white"
              >
                <span className="absolute bottom-1 left-1/2 h-[1px] w-0 bg-gradient-to-r from-neon-cyan via-neon-pink to-neon-cyan transition-all duration-300 group-hover:left-2 group-hover:w-[calc(100%-16px)]" />
                <span className="absolute inset-0 rounded-lg opacity-0 bg-white/5 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative z-10 transition-transform duration-300 group-hover:-translate-y-[1px] inline-block">.com</span>
                <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white/20" />
              </a>

              {/* Gallery Dropdown */}
              <NavDropdown label="Gallery" links={[
                { label: 'Artificial', href: 'https://www.sardistic.com/ai-timeline/', icon: Sparkles, color: 'from-neon-cyan to-violet-400' },
                { label: 'Organic', href: 'https://sardistic.com/gallery-timeline/', icon: Leaf, color: 'from-neon-green to-lime-400' },
              ]} />
            </nav>

            {/* Desktop Visual Controls (Hidden on Mobile) */}
            <div className={`hidden md:flex items-center transition-all duration-500 ${isListening ? 'gap-12 ml-12' : 'gap-4 ml-6'}`}>
              <PulsingMicButton />

              {/* Full Text Background Toggle (Desktop) */}
              <div
                onClick={() => setBackgroundType(prev => prev === 'shader' ? 'fluid' : 'shader')}
                className="relative flex items-center bg-white/5 border border-white/10 rounded-full cursor-pointer h-8 w-36 px-1 select-none hover:bg-white/10 transition-colors"
                title="Switch Background Visuals"
              >
                <motion.div
                  className="absolute top-1 bottom-1 w-16 bg-white/10 rounded-full border border-white/5 shadow-inner"
                  animate={{ x: backgroundType === 'fluid' ? 0 : 66 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
                <div className={`z-10 w-1/2 flex justify-center items-center gap-1.5 text-[10px] font-mono tracking-wider transition-colors ${backgroundType === 'fluid' ? 'text-neon-cyan' : 'text-gray-500'}`}>
                  <Layers size={12} /> CANVAS
                </div>
                <div className={`z-10 w-1/2 flex justify-center items-center gap-1.5 text-[10px] font-mono tracking-wider transition-colors ${backgroundType === 'shader' ? 'text-neon-pink' : 'text-gray-500'}`}>
                  <Zap size={12} /> GLSL
                </div>
              </div>

              {/* Lyrics Toggle (Desktop) */}
              {(nowPlaying || playbackQueue.length > 0) && (
                <button
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`p-2 rounded-full border transition-all ${showLyrics ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' : 'bg-transparent border-white/10 text-gray-400 hover:text-white'}`}
                >
                  <MessageSquare size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 2. Center: Player Blurb / Trigger (Mobile: Top Right, Desktop: Center) */}
          <div className={`flex justify-end md:justify-center transition-all duration-500 relative z-50 ${isGlobalPlayerActive ? 'w-full order-first md:w-auto md:flex-1 md:order-2' : 'w-auto md:w-1/3 order-2 md:order-2'}`}>
            <AnimatePresence mode="wait">
              {!isGlobalPlayerActive ? (
                nowPlaying && (
                  <motion.button
                    key="blurb"
                    onClick={() => setIsGlobalPlayerActive(true)}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="rounded-full pl-3 pr-4 py-1.5 flex items-center gap-3 bg-white/5 border border-white/10 hover:border-neon-pink/50 backdrop-blur-md transition-all relative z-10 max-w-[200px] md:max-w-none"
                  >
                    <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse shrink-0" />
                    <div className="flex flex-col text-left overflow-hidden">
                      <span className="text-[10px] text-white/50 font-mono leading-none md:block hidden">NOW PLAYING</span>
                      <span className="text-sm text-white font-bold truncate max-w-[120px]">{nowPlaying.name}</span>
                    </div>
                    <Music size={14} className="text-white/30 group-hover:text-white transition-colors" />
                  </motion.button>
                )
              ) : (
                /* Global Player Expanded */
                <motion.div
                  key="embedded-player"
                  initial={{ opacity: 0, y: -20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  className="w-full max-w-5xl flex justify-center pt-4 md:pt-0"
                >
                  <ErrorBoundary>
                    <PersistentPlayer
                      nowPlaying={nowPlaying}
                      isActive={true}
                      onClose={() => setIsGlobalPlayerActive(false)}
                      serverUrl={SERVER_URL}
                      volume={globalVolume}
                      onVolumeChange={setGlobalVolume}
                      onPlayStateChange={setIsGlobalPlaying}
                      isEmbedded={true}
                      onEnded={handleTrackEnded}
                      onProgress={setCurrentPlaybackTime}
                    />
                  </ErrorBoundary>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Controls & Nav (Mobile: Bottom Row full width, Desktop: Separated) */}
          <div className={`flex items-center justify-between w-full md:w-1/3 md:justify-end gap-4 order-3 md:order-3 ${isGlobalPlayerActive ? 'md:absolute md:right-4 md:top-0 md:h-20' : ''}`}>

            {/* Visual Controls (Mobile Only: Left side of bottom row) */}
            <div className="flex md:hidden items-center gap-2">
              <PulsingMicButton />

              {/* Compact Background Toggle (Mobile) */}
              <div
                onClick={() => setBackgroundType(prev => prev === 'shader' ? 'fluid' : 'shader')}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 cursor-pointer text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                title="Switch Visuals"
              >
                {backgroundType === 'fluid' ? <Layers size={14} /> : <Zap size={14} />}
              </div>

              {/* Lyrics (Mobile) */}
              {(nowPlaying || playbackQueue.length > 0) && (
                <button
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`p-2 rounded-full border transition-all ${showLyrics ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' : 'bg-transparent border-white/10 text-gray-400 hover:text-white'}`}
                >
                  <MessageSquare size={14} />
                </button>
              )}
            </div>

            {/* Nav Links (Right side of bottom row on mobile) */}
            <div className="flex items-center gap-2">
              <button onClick={() => setView('analytics')} className={`nav-btn px-3 py-1.5 text-xs ${view === 'analytics' ? 'active' : ''}`}>
                Analytics
              </button>
              <button onClick={handleBingeClick} className={`nav-btn px-3 py-1.5 text-xs ${view === 'binges' ? 'active' : ''}`}>
                Binges
              </button>
              <button onClick={goHome} className={`nav-btn px-3 py-1.5 text-xs ${view === 'overview' ? 'active' : ''}`}>
                Overview
              </button>
            </div>
          </div>

        </div >
      </motion.nav >

      {/* FLOATING LYRICS OVERLAY (Moved to Root Level) */}
      <AnimatePresence>
        {showLyrics && (
          <motion.div
            initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
            className="fixed top-28 left-6 z-[100] w-[350px] h-[500px] pointer-events-none"
          >
            <div className="w-full h-full bg-black/80 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col pointer-events-auto overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 cursor-move">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_10px_rgba(0,255,255,0.5)] animate-pulse" />
                  <span className="text-xs font-mono font-bold tracking-widest text-white/90">LYRICS STREAM</span>
                </div>
                <button
                  onClick={() => setShowLyrics(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent relative" ref={lyricsContainerRef}>
                {lyricsLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-mono text-neon-cyan/80 animate-pulse tracking-widest">SEARCHING FREQUENCIES...</span>
                  </div>
                ) : (
                  syncedLines ? (
                    <div className="flex flex-col gap-6 py-[50%]">
                      {syncedLines.map((line, i) => (
                        <motion.div
                          key={i}
                          initial={false}
                          animate={{
                            opacity: i === activeLineIndex ? 1 : 0.6,
                            scale: i === activeLineIndex ? 1.05 : 1,
                            filter: 'blur(0px)',
                            y: 0
                          }}
                          className={`text-center font-sans font-bold transition-all duration-300 ${i === activeLineIndex ? 'text-neon-cyan text-xl drop-shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'text-white/60 text-base'}`}
                        >
                          {line.text}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-white/90 leading-loose font-sans whitespace-pre-wrap text-center tracking-wide">
                      {lyrics || <span className="text-gray-500 italic text-xs">Signal lost. No lyrics data found.</span>}
                    </div>
                  )
                )}
                {/* Aesthetic Top/Bottom Fades */}
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/90 to-transparent pointer-events-none sticky top-0 z-10" />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/90 to-transparent pointer-events-none sticky bottom-0 z-10" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx="true">{`
        .nav-pill {
            @apply px-4 py-2 rounded-full text-sm font-medium transition-all text-gray-400 hover:text-white hover:bg-white/5;
        }
        .nav-pill.active {
            @apply bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)];
        }
      `}</style>

      <AnalyticsProvider currentView={view}>
        <motion.main
          animate={{ paddingTop: isGlobalPlayerActive ? '18rem' : '8rem' }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="px-4 max-w-7xl mx-auto min-h-[80vh]"
        >
          <AnimatePresence mode="wait">
            {view === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <Overview
                  data={data}
                  metric={metric}
                  setMetric={setMetric}
                  onYearClick={handleYearClick}
                  onArtistClick={handleArtistClick}
                  onLibraryClick={() => setView('library')}
                  nowPlaying={nowPlaying}
                  isListening={isGlobalPlayerActive}
                  onToggleListen={() => setIsGlobalPlayerActive(!isGlobalPlayerActive)}
                  onPlayContext={playContext}
                />
              </motion.div>
            )}

            {view === 'binges' && (
              <motion.div
                key="binges"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.4 }}
              >
                <BingeReport
                  data={data}
                  onBack={goHome}
                  onArtistClick={handleArtistClick}
                  onPlayContext={playContext}
                />
              </motion.div>
            )}

            {view === 'library' && (
              <motion.div
                key="library"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Library
                  data={data}
                  metric={metric}
                  onBack={goHome}
                  onArtistClick={handleArtistClick}
                  initialSearch={initialLibrarySearch}
                  onPlayContext={playContext}
                />
              </motion.div>
            )}

            {view === 'year' && selectedYear && (
              <motion.div
                key="year"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
              >
                <YearDetail
                  year={selectedYear}
                  data={data.years[selectedYear]}
                  allData={data}
                  onBack={goHome}
                  onArtistClick={handleArtistClick}
                  onMonthClick={handleMonthClick}
                  onYearClick={handleYearClick}
                  metric={metric}
                  setMetric={setMetric}
                  nowPlaying={nowPlaying}
                  isListening={isGlobalPlayerActive}
                  onToggleListen={() => setIsGlobalPlayerActive(!isGlobalPlayerActive)}
                  onPlayContext={playContext}
                  queueLoading={queueLoading}
                />
              </motion.div>
            )}

            {view === 'month' && selectedYear && selectedMonth && (
              <motion.div
                key="month"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
              >
                <MonthDetail
                  year={selectedYear}
                  month={selectedMonth}
                  allData={data}
                  metric={metric}
                  setMetric={setMetric}
                  onBack={() => setView('year')}
                  onMonthClick={handleMonthClick}
                  onPlayContext={playContext}
                />
              </motion.div>
            )}

            {view === 'artist' && selectedArtist && (
              <motion.div
                key="artist"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <ArtistProfile
                  artist={selectedArtist}
                  stats={data.artists[selectedArtist]}
                  metric={metric}
                  allData={data}
                  onBack={() => setView(selectedYear ? 'year' : 'overview')}
                  onTagClick={handleTagClick}
                  onPlayContext={playContext}
                />
              </motion.div>
            )}

            {view === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <AdvancedAnalyticsDashboard />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.main>
      </AnalyticsProvider>

      <footer className="mt-20 py-10 border-t border-white/5 text-center text-gray-400 text-xs relative z-10 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-4">
          <p>Built with ❤️ by Antigravity & Sardistic</p>
          <span className="w-px h-3 bg-white/10" />
          <a
            href="https://github.com/sardistic/sardistic.fm"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-white transition-colors group"
          >
            <Github size={14} className="opacity-60 group-hover:opacity-100" />
            <span>Repo on GitHub</span>
          </a>
        </div>
      </footer>
    </div >
  );
}

function App() {
  return (
    <AudioReactiveProvider>
      <MainDashboard />
    </AudioReactiveProvider>
  );
}

export default App;
