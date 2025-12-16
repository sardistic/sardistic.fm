import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useAnimationFrame } from 'framer-motion';
import { LayoutDashboard, Calendar, Music, User, Zap, Mic, MicOff, Layers } from 'lucide-react';
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
  const { isListening, toggleListening, audioStateRef } = useAudioReactive();
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
      className={`relative flex items-center gap-3 px-4 py-2 rounded-full border transition-colors duration-300 ${isListening ? 'bg-black/80 border-transparent' : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'}`}
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

  const [globalVolume, setGlobalVolume] = useState(3);
  const [isGlobalPlaying, setIsGlobalPlaying] = useState(false);

  // Background Intensity
  const playerIntensity = isGlobalPlaying ? (globalVolume / 100) : 0;

  // Memoize data
  const data = useMemo(() => rawData, []);

  // Poll for Now Playing Data Globally
  useEffect(() => {
    const fetchNowPlaying = async () => {
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
  }, []);

  // Audio State for UI adjustments
  const { isListening } = useAudioReactive();

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
        animate={{ height: isGlobalPlayerActive ? 'auto' : '5rem' }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed top-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-b border-white/10 z-50 flex flex-col overflow-hidden"
      >
        {/* Top Row: Branding, Visuals, Interaction Trigger, Nav */}
        <div className={`w-full flex items-center px-6 justify-between shrink-0 transition-all duration-500 ${isGlobalPlayerActive ? 'py-4 items-start' : 'h-20'}`}>

          {/* Left: Branding & Visual Controls */}
          <div className={`flex items-center gap-4 transition-all duration-500 ${isGlobalPlayerActive ? 'w-auto' : 'w-1/3'}`}>
            <div className="flex items-center gap-2 cursor-pointer group mr-4" onClick={goHome}>
              <span className="text-lg tracking-tight font-mono transition-opacity hover:opacity-80">
                <span className="text-white font-bold">AUDIO</span>
                <span className="text-white/30">.sardistic.com</span>
              </span>
            </div>

            {/* Visual Controls (Always Visible) */}
            <div className={`flex items-center transition-all duration-500 ${isListening ? 'gap-12 ml-6' : 'gap-2'}`}>
              <PulsingMicButton />

              {/* Background Toggle */}
              <div
                onClick={() => setBackgroundType(prev => prev === 'shader' ? 'fluid' : 'shader')}
                className="relative flex items-center bg-black/40 border border-white/10 rounded-full cursor-pointer h-8 w-36 px-1 select-none"
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
            </div>
          </div>

          {/* Center: Blurb / Trigger / Player */}
          {/* We allow this to grow when active */}
          <div className={`flex justify-center transition-all duration-500 relative z-50 ${isGlobalPlayerActive ? 'flex-1 w-full' : 'w-1/3'}`}>
            <AnimatePresence mode="wait">
              {!isGlobalPlayerActive ? (
                nowPlaying && (
                  <motion.button
                    key="blurb"
                    onClick={() => setIsGlobalPlayerActive(true)}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="rounded-full px-6 py-2 flex items-center gap-3 bg-black/50 border border-white/10 hover:border-neon-pink/50 backdrop-blur-md transition-all group"
                  >
                    <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                    <div className="flex flex-col text-left">
                      <span className="text-xs text-white/50 font-mono leading-none">NOW PLAYING</span>
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <span className="text-sm text-white font-bold truncate">{nowPlaying.name}</span>
                        <span className="text-xs text-neon-pink truncate">- {nowPlaying.artist}</span>
                      </div>
                    </div>
                    <Music size={14} className="text-white/30 group-hover:text-white transition-colors" />
                  </motion.button>
                )
              ) : (
                /* Center Embedded Player */
                <motion.div
                  key="embedded-player"
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="w-full max-w-5xl flex justify-center"
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
                    />
                  </ErrorBoundary>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Navigation */}
          <div className={`flex gap-3 justify-end transition-all duration-500 ${isGlobalPlayerActive ? 'w-auto opacity-100 pt-3' : 'w-1/3'}`}>
            <button onClick={() => setView('analytics')} className={`nav-btn ${view === 'analytics' ? 'active' : ''}`}>
              Analytics
            </button>
            <button onClick={handleBingeClick} className={`nav-btn ${view === 'binges' ? 'active' : ''}`}>
              Binges
            </button>
            <button onClick={goHome} className={`nav-btn ${view === 'overview' ? 'active' : ''}`}>
              Overview
            </button>
          </div>
        </div >
      </motion.nav >

      <style jsx>{`
        .nav-pill {
            @apply px-4 py-2 rounded-full text-sm font-medium transition-all text-gray-400 hover:text-white hover:bg-white/5;
        }
        .nav-pill.active {
            @apply bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)];
        }
      `}</style>

      <AnalyticsProvider currentView={view}>
        <motion.main
          animate={{ paddingTop: isGlobalPlayerActive ? '13rem' : '8rem' }}
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

      <footer className="mt-20 py-10 border-t border-white/5 text-center text-gray-500 text-sm relative z-10 bg-black/50 backdrop-blur-sm">
        <p>Built with ❤️ by Antigravity</p>
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
