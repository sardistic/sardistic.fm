import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, X, Loader, Volume2, Maximize2, SkipForward } from 'lucide-react';
import RetroAlbumPlaceholder from './RetroAlbumPlaceholder';

export default function PersistentPlayer({
    serverUrl = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'),
    nowPlaying,
    isActive,
    onClose,
    volume,
    onVolumeChange,
    onPlayStateChange,
    onEnded,
    onNext,
    canGoNext = false,
    onProgress,
    isEmbedded = false
}) {
    const iframeRef = useRef(null);
    const lastPlayerStateRef = useRef(null);
    const onEndedRef = useRef(onEnded);
    const onProgressRef = useRef(onProgress);
    const [videoUrl, setVideoUrl] = useState(null);
    const [tuning, setTuning] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    onEndedRef.current = onEnded;
    onProgressRef.current = onProgress;

    // DEBUG: Lifecycle
    useEffect(() => {
        console.log("PersistentPlayer: Mounted");
        return () => console.log("PersistentPlayer: Unmounted");
    }, []);

    useEffect(() => {
        if (videoUrl) console.log("PersistentPlayer: Video URL set to:", videoUrl);
    }, [videoUrl]);

    // Helper: Send command to YouTube Iframe
    const sendCommand = (func, args = []) => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func, args }),
                '*'
            );
        }
    };

    const subscribeToPlayerEvents = useCallback(() => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'listening', id: 'persistent-player' }),
                '*'
            );
        }
    }, []);

    // A raw YouTube iframe does not emit state updates until its postMessage
    // event stream has a listener. Retry briefly because iframe readiness and
    // React's load event can arrive in either order.
    useEffect(() => {
        if (!videoUrl) return;

        lastPlayerStateRef.current = null;
        subscribeToPlayerEvents();
        const subscriptionAttempts = [250, 750, 1500, 3000].map((delay) => (
            setTimeout(subscribeToPlayerEvents, delay)
        ));

        return () => subscriptionAttempts.forEach(clearTimeout);
    }, [videoUrl, subscribeToPlayerEvents]);

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
    }, [videoUrl, volume]);

    // Playback Progress (Dead Reckoning for Lyrics Sync)
    const currentTimeRef = useRef(0);
    const progressInterval = useRef(null);

    // Reset progress on track change
    useEffect(() => {
        currentTimeRef.current = 0;
        if (onProgressRef.current) onProgressRef.current(0);
    }, [nowPlaying?.name, nowPlaying?.artist]);

    // Timer Loop
    useEffect(() => {
        if (!isPaused && videoUrl) {
            progressInterval.current = setInterval(() => {
                const next = currentTimeRef.current + 0.1;
                currentTimeRef.current = next;
                if (onProgressRef.current) onProgressRef.current(next);
            }, 100);
        } else {
            if (progressInterval.current) clearInterval(progressInterval.current);
        }
        return () => {
            if (progressInterval.current) clearInterval(progressInterval.current);
        };
    }, [isPaused, videoUrl]);

    // Handle External Time Updates (if YouTube sends them via postMessage)
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin.includes('youtube.com')) {
                try {
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                    // Volume Init
                    if (data.event === 'onReady' || data.info?.playerState) {
                        sendCommand('setVolume', [volume]);
                    }

                    const playerState = data.info?.playerState;
                    if (typeof playerState === 'number') {
                        const previousPlayerState = lastPlayerStateRef.current;
                        lastPlayerStateRef.current = playerState;

                        // YouTube can deliver the same info snapshot repeatedly.
                        // Advance once on the transition to ENDED (state 0).
                        if (playerState === 0 && previousPlayerState !== 0 && onEndedRef.current) {
                            onEndedRef.current();
                        }
                    }
                    // Time Sync (Rare but possible)
                    if (data.info && typeof data.info.currentTime === 'number') {
                        currentTimeRef.current = data.info.currentTime;
                        if (onProgressRef.current) onProgressRef.current(data.info.currentTime);
                    }
                } catch {
                    // Ignore unrelated or malformed iframe messages.
                }
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
            const controller = new AbortController();

            const tuneIn = async () => {
                setTuning(true);
                try {
                    const query = `${nowPlaying.artist} ${nowPlaying.name} Audio`;

                    const res = await fetch(`${serverUrl}/api/youtube/search?q=${encodeURIComponent(query)}`, {
                        signal: controller.signal
                    });
                    const data = await res.json();
                    if (data.videoId) {
                        setVideoUrl(`https://www.youtube.com/embed/${data.videoId}?autoplay=1&enablejsapi=1&controls=0&origin=${window.location.origin}`);
                        setIsPaused(false);
                        if (onPlayStateChange) onPlayStateChange(true);
                    } else {
                        console.warn("No video found for", query);
                    }
                } catch (e) {
                    if (e.name !== 'AbortError') console.error("Tune in failed", e);
                } finally {
                    if (!controller.signal.aborted) setTuning(false);
                }
            };
            tuneIn();

            return () => controller.abort();
        } else if (!isActive) {
            setVideoUrl(null);
            if (onPlayStateChange) onPlayStateChange(false);
        }
    }, [isActive, nowPlaying, onPlayStateChange, serverUrl]);

    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="flex justify-center w-full"
                >
                    <div className={`${isEmbedded ? 'w-full bg-transparent flex flex-row items-center gap-6 h-full px-4' : 'bg-black/90 backdrop-blur-2xl border border-white/10 rounded-b-xl shadow-2xl overflow-hidden flex flex-col relative'}`}
                        style={!isEmbedded ? { width: isExpanded ? '400px' : '320px', transition: 'width 0.3s' } : {}}>

                        {/* MEDIA AREA (Video or Thumbnail) */}
                        <div className={`${isEmbedded ? 'w-48 h-28 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-black relative' : 'w-full bg-black relative overflow-hidden'}`}
                            style={!isEmbedded ? { height: isExpanded ? 225 : 0, opacity: isExpanded ? 1 : 0, transition: 'all 0.3s' } : {}}>

                            <div className={`w-full h-full ${!videoUrl && !isEmbedded ? 'hidden' : 'flex items-center justify-center'}`}>
                                {videoUrl ? (
                                    <iframe
                                        ref={iframeRef}
                                        id="persistent-player"
                                        key={videoUrl}
                                        width="100%"
                                        height="100%"
                                        src={videoUrl}
                                        title="YouTube Player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        onLoad={subscribeToPlayerEvents}
                                        className="absolute inset-0"
                                    ></iframe>
                                ) : (
                                    /* Fallback Art if Embedded and no video yet */
                                    isEmbedded ? (
                                        <div className="w-full h-full relative bg-black">
                                            <RetroAlbumPlaceholder size={300} className="w-full h-full object-cover opacity-80" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="text-neon-cyan animate-pulse">
                                                    <Loader size={20} className="animate-spin" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-neon-cyan animate-pulse">
                                            <Loader size={24} className="animate-spin" />
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {/* CONTROLS AREA (Embedded: Right Side, Popup: Bottom) */}
                        <div className={`${isEmbedded ? 'flex-1 flex flex-col justify-center items-start h-full py-2 pl-4' : 'w-full px-4 py-3 flex items-center justify-between gap-4 bg-gradient-to-r from-black/80 to-transparent'}`}>

                            {/* Standard Header Info (Popup Only) */}
                            {!isEmbedded && (
                                <div className="w-full h-14 flex items-center justify-between border-b border-white/5 gap-3 mb-2">
                                    {/* ... Existing popup header logic ... */}
                                    {/* Note: I'm simplifying the diff to replace the structural logic,
                                         assuming the user wants the redundancy GONE in embedded mode.
                                         For embedded, we show Controls + Volume.
                                     */}
                                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                                        <Radio size={16} className="text-neon-pink animate-pulse shrink-0" />
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-xs font-bold text-white truncate">{tuning ? "Scanning..." : (nowPlaying?.name || "Loading...")}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-gray-400 hover:text-white"><Maximize2 size={14} /></button>
                                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-neon-pink"><X size={14} /></button>
                                    </div>
                                </div>
                            )}

                            {/* Embedded Center Info */}
                            {isEmbedded && (
                                <div className="flex flex-col justify-end px-0 mb-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-white font-bold text-lg truncate">{nowPlaying?.name}</span>
                                        {tuning && <span className="text-neon-cyan text-xs animate-pulse">(Scanning...)</span>}
                                    </div>
                                    <span className="text-neon-pink text-sm font-mono truncate">{nowPlaying?.artist}</span>
                                </div>
                            )}

                            {/* CONTROLS ROW */}
                            <div className={`flex items-center gap-6 ${isEmbedded ? 'shrink-0' : ''}`}>
                                {/* Play/Pause */}
                                <button
                                    onClick={togglePlay}
                                    className={`rounded-full text-white transition-all active:scale-95 flex items-center justify-center ${isEmbedded ? 'w-12 h-12 bg-white/10 hover:bg-white/20' : 'p-2 bg-white/10 hover:bg-white/20'}`}
                                >
                                    {isPaused ?
                                        <svg width={isEmbedded ? "20" : "12"} height={isEmbedded ? "20" : "12"} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg> :
                                        <svg width={isEmbedded ? "20" : "12"} height={isEmbedded ? "20" : "12"} fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                    }
                                </button>

                                {/* Next Track */}
                                <button
                                    type="button"
                                    onClick={onNext}
                                    disabled={!canGoNext}
                                    aria-label="Play next track"
                                    title={canGoNext ? 'Next track' : 'End of queue'}
                                    className={`rounded-full transition-all flex items-center justify-center ${isEmbedded ? 'w-10 h-10' : 'p-2'} ${canGoNext ? 'text-white bg-white/10 hover:bg-white/20 active:scale-95' : 'text-white/20 bg-white/5 cursor-not-allowed'}`}
                                >
                                    <SkipForward size={isEmbedded ? 19 : 13} fill="currentColor" />
                                </button>

                                {/* Volume Slider */}
                                <div className="flex-1 flex items-center gap-3 group max-w-[200px]">
                                    <Volume2 size={isEmbedded ? 18 : 14} className={`text-gray-400 ${volume > 0 ? 'group-hover:text-neon-cyan' : ''}`} />
                                    <div className="relative flex-1 h-6 flex items-center">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={volume}
                                            onChange={handleVolumeChange}
                                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                                        />
                                        <div className="absolute left-0 h-1 bg-neon-cyan rounded-l-lg pointer-events-none" style={{ width: `${volume}%` }} />
                                    </div>
                                </div>

                                {/* External Link (Embedded Only) */}
                                {isEmbedded && (
                                    <>
                                        {videoUrl && (
                                            <a href={videoUrl} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors" title="Open in YouTube">
                                                <Maximize2 size={16} />
                                            </a>
                                        )}
                                        <button onClick={onClose} className="text-gray-500 hover:text-neon-pink transition-colors ml-2" title="Close Player">
                                            <X size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
