import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Calendar, Music, User, Zap } from 'lucide-react';
import rawData from './data/dashboard_payload.json';
import Overview from './components/Overview';
import YearDetail from './components/YearDetail';
import MonthDetail from './components/MonthDetail';
import ArtistProfile from './components/ArtistProfile';
import BingeReport from './components/BingeReport';
import Library from './components/Library';
import FluidBackground from './components/FluidBackground';
import AdvancedAnalyticsDashboard from './components/AdvancedAnalyticsDashboard';
import { AnalyticsProvider } from './components/AnalyticsProvider';
import GlassDistortionFilter from './components/GlassDistortionFilter';
import PersistentPlayer from './components/PersistentPlayer';
import ErrorBoundary from './components/ErrorBoundary';

const REFRESH_INTERVAL_MS = 10000;
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function App() {
  const [view, setView] = useState('overview'); // overview, year, artist, binges
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [initialLibrarySearch, setInitialLibrarySearch] = useState('');
  const [metric, setMetric] = useState('scrobbles'); // 'scrobbles' | 'minutes'

  // Global Player State
  const [nowPlaying, setNowPlaying] = useState(null);
  const [isGlobalPlayerActive, setIsGlobalPlayerActive] = useState(false);

  // DEBUG: Check what URL we are using
  console.log('DEBUG: VITE_SERVER_URL config:', {
    env: import.meta.env.VITE_SERVER_URL,
    final: SERVER_URL
  });

  const [globalVolume, setGlobalVolume] = useState(3); // Start at 3% volume
  const [isGlobalPlaying, setIsGlobalPlaying] = useState(false);

  // Background Intensity based on Audio
  const intensity = isGlobalPlaying ? (globalVolume / 100) : 0;

  // Memoize data to prevent lags
  const data = useMemo(() => rawData, []);

  // Poll for Now Playing Data Globally
  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/now-playing`);
        const data = await res.json();
        if (data.nowPlaying) {
          // Only update if the song actually changed to prevent re-renders
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
      } catch (err) {
        console.error("Failed to fetch global now playing:", err);
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

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
      <FluidBackground intensity={intensity} />

      {/* Persistent Global Player */}
      <ErrorBoundary>
        <PersistentPlayer
          nowPlaying={nowPlaying}
          isActive={isGlobalPlayerActive}
          onClose={() => setIsGlobalPlayerActive(false)}
          serverUrl={SERVER_URL}
          volume={globalVolume}
          onVolumeChange={setGlobalVolume}
          onPlayStateChange={setIsGlobalPlaying}
        />
      </ErrorBoundary>

      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-black/40 backdrop-blur-xl border-b border-white/10 z-50 flex items-center px-6 justify-between supports-[backdrop-filter]:bg-black/20">
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={goHome}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            whileHover={{ scale: 1.1 }}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-neon-pink to-neon-purple flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(255,0,85,0.5)]"
          >
            S
          </motion.div>
          <span className="font-bold text-xl tracking-tight text-white group-hover:text-neon-pink transition-colors">
            sardistic.com <span className="opacity-50">Music</span>
          </span>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setView('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${view === 'analytics' ? 'bg-white/10 text-neon-purple border border-neon-purple/30' : 'hover:bg-white/5 text-gray-400 hover:text-neon-purple'}`}
          >
            <LayoutDashboard size={16} /> Analytics
          </button>
          <button
            onClick={handleBingeClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${view === 'binges' ? 'bg-white/10 text-neon-yellow border border-neon-yellow/30' : 'hover:bg-white/5 text-gray-400 hover:text-neon-yellow'}`}
          >
            <Zap size={16} /> Binge Report
          </button>
          <button
            onClick={goHome}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${view === 'overview' ? 'bg-white/10 border border-neon-cyan/50 text-neon-cyan shadow-[0_0_10px_rgba(0,255,204,0.3)]' : 'hover:bg-white/5 text-gray-400'}`}
          >
            Overview
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <AnalyticsProvider currentView={view}>
        <main className="pt-24 px-4 max-w-7xl mx-auto min-h-[80vh]">
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
        </main>
      </AnalyticsProvider>

      <footer className="mt-20 py-10 border-t border-white/5 text-center text-gray-500 text-sm relative z-10 bg-black/50 backdrop-blur-sm">
        <p>Built with ❤️ by Antigravity</p>
      </footer>
    </div>
  );
}

export default App;
