import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, X, Loader, Volume2, Maximize2, Minimize2 } from 'lucide-react';

export default function PersistentPlayer({
    serverUrl = 'http://localhost:3001',
    nowPlaying,
    isActive,
    onClose,
    onExpand,
    volume,
    onVolumeChange,
    onPlayStateChange
}) {
    const iframeRef = useRef(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [tuning, setTuning] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Helper: Send command to YouTube Iframe
    const sendCommand = (func, args = []) => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func, args }),
                '*'
            );
        }
    };

    // Apply Volume: Aggressive sync to ensure start volume hits
    useEffect(() => {
        if (!videoUrl) return;

        // 1. Immediate Attempt
        sendCommand('setVolume', [volume]);

        // 2. Poll for first few seconds to catch "Ready" state
        let attempts = 0;
        const interval = setInterval(() => {
            sendCommand('setVolume', [volume]);
            attempts++;
            if (attempts > 8) clearInterval(interval); // Stop after ~4s
        }, 500);

        return () => clearInterval(interval);
    }, [videoUrl, volume]);

    // Sync volume when user changes it
    useEffect(() => {
        if (videoUrl) {
            sendCommand('setVolume', [volume]);
        }
    }, [volume]);

    // Listener for Player Ready (Legacy/Standard method)
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin.includes('youtube.com')) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.event === 'onReady' || data.info?.playerState) {
                        sendCommand('setVolume', [volume]);
                    }
                } catch (e) { }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [volume]);

    const handleVolumeChange = (e) => {
        const newVol = parseInt(e.target.value);
        if (onVolumeChange) onVolumeChange(newVol);
    };

    const togglePlay = (e) => {
        e.stopPropagation();
        const nextState = !isPaused;
        if (nextState) {
            sendCommand('pauseVideo');
        } else {
            sendCommand('playVideo');
        }
        setIsPaused(nextState);
        if (onPlayStateChange) onPlayStateChange(!nextState);
    };

    // YouTube Search / Sync Logic
    useEffect(() => {
        if (isActive && nowPlaying) {
            const tuneIn = async () => {
                setTuning(true);
                try {
                    const query = `${nowPlaying.artist} ${nowPlaying.name} Audio`;

                    const res = await fetch(`${serverUrl}/api/youtube/search?q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    if (data.videoId) {
                        setVideoUrl(`https://www.youtube.com/embed/${data.videoId}?autoplay=1&enablejsapi=1&controls=0`);
                        setIsPaused(false);
                        if (onPlayStateChange) onPlayStateChange(true);
                    } else {
                        console.warn("No video found for", query);
                    }
                } catch (e) {
                    console.error("Tune in failed", e);
                } finally {
                    setTuning(false);
                }
            };
            tuneIn();
        } else if (!isActive) {
            setVideoUrl(null);
            if (onPlayStateChange) onPlayStateChange(false);
        }
    }, [isActive, nowPlaying?.name, nowPlaying?.artist, serverUrl]);

    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="fixed top-0 left-0 right-0 z-[60] flex justify-start pl-4 md:pl-6 pointer-events-none"
                // z-60 to be above the nav (z-50)
                >
                    <div className="bg-black/90 backdrop-blur-2xl border border-white/10 rounded-b-xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col select-none relative"
                        style={{ width: isExpanded ? '400px' : '320px', transition: 'width 0.3s' }}>

                        {/* Header / Controls */}
                        <div className="w-full h-14 flex items-center justify-between px-4 bg-white/5 border-b border-white/5 gap-3">
                            {/* Left: Indicator or Minified Info */}
                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                <Radio size={16} className="text-neon-pink animate-pulse shrink-0" />
                                {(!isExpanded || tuning) && (
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-xs font-bold text-white truncate max-w-[120px]">
                                            {tuning ? "Scanning..." : (nowPlaying?.name || "Loading...")}
                                        </span>
                                        {!tuning && (
                                            <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
                                                {nowPlaying?.artist}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Right: Window Controls */}
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                                >
                                    {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-neon-pink/20 rounded-full text-gray-400 hover:text-neon-pink transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Player Area (Video) - Height Animated */}
                        <motion.div
                            animate={{ height: isExpanded ? 225 : 0, opacity: isExpanded ? 1 : 0 }}
                            className="w-full bg-black relative overflow-hidden"
                        >
                            <div className={`w-full h-full ${!videoUrl ? 'flex items-center justify-center' : ''}`}>
                                {videoUrl ? (
                                    <iframe
                                        ref={iframeRef}
                                        key={videoUrl}
                                        width="100%"
                                        height="100%"
                                        src={videoUrl}
                                        title="YouTube Player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute inset-0"
                                    ></iframe>
                                ) : (
                                    <div className="text-neon-cyan animate-pulse">
                                        <Loader size={24} className="animate-spin" />
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Collapsed Controls - Volume Front & Center */}
                        {!isExpanded && (
                            <div className="w-full px-4 py-3 flex items-center justify-between gap-4 bg-gradient-to-r from-black/80 to-transparent">

                                {/* Play/Pause */}
                                <button
                                    onClick={togglePlay}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-95"
                                >
                                    {isPaused ?
                                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg> :
                                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                    }
                                </button>

                                {/* Volume Slider */}
                                <div className="flex-1 flex items-center gap-2 group">
                                    <Volume2 size={14} className={`text-gray-400 ${volume > 0 ? 'group-hover:text-neon-cyan' : ''}`} />
                                    <div className="relative flex-1 h-6 flex items-center">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={volume}
                                            onChange={handleVolumeChange}
                                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.5)] hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                                        />
                                        {/* Progress Fill Hack */}
                                        <div
                                            className="absolute left-0 h-1 bg-neon-cyan rounded-l-lg pointer-events-none"
                                            style={{ width: `${volume}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
