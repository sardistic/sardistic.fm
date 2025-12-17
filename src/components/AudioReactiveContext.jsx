import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { TabAudioCapture } from '../utils/TabAudioCapture';

const AudioReactiveContext = createContext({
    isListening: false,
    toggleListening: () => { },
    audioSource: 'mic', // 'mic' or 'tab'
    setAudioSource: () => { },
    audioStateRef: { current: { energy: 0, bands: { bass: 0, mid: 0, treble: 0 }, data: new Uint8Array(0) } }
});

export const useAudioReactive = () => useContext(AudioReactiveContext);

export const AudioReactiveProvider = ({ children }) => {
    const [isListening, setIsListening] = useState(false);
    const [audioSource, setAudioSource] = useState('mic'); // 'mic' or 'tab'

    const volumeRef = useRef(50); // Default 50
    const updateVolume = (vol) => { volumeRef.current = vol; };

    // Use Ref for high-frequency data to avoid global re-renders
    const audioStateRef = useRef({
        energy: 0,
        bands: { bass: 0, mid: 0, treble: 0 },
        data: new Uint8Array(128)
    });

    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const requestRef = useRef(null);
    const tabCaptureRef = useRef(null); // For tab audio capture
    const streamRef = useRef(null); // For mic stream
    const audioSourceRef = useRef('mic'); // Track current source in ref for loop access

    const cleanupAudio = async () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);

        // Stop mic stream if active
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Stop tab capture if active
        if (tabCaptureRef.current) {
            await tabCaptureRef.current.stop();
            tabCaptureRef.current = null;
        }

        if (sourceRef.current) sourceRef.current.disconnect();
        if (analyserRef.current) analyserRef.current.disconnect();
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }

        audioContextRef.current = null;
        analyserRef.current = null;
        sourceRef.current = null;

        setIsListening(false);
        // Reset ref
        audioStateRef.current = {
            energy: 0,
            bands: { bass: 0, mid: 0, treble: 0 },
            data: new Uint8Array(128)
        };
    };

    const startAudio = async () => {
        console.log('[startAudio] Called with source:', audioSource);
        try {
            // Clean up any existing audio first
            console.log('[startAudio] Cleaning up existing audio...');
            await cleanupAudio();
            console.log('[startAudio] Cleanup complete');

            // Update the ref so loop() knows which source to use
            audioSourceRef.current = audioSource;
            console.log('[startAudio] Set audioSourceRef to:', audioSourceRef.current);

            if (audioSource === 'mic') {
                console.log('[startAudio] Starting microphone...');
                // Microphone input
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;

                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const ctx = new AudioContext();
                audioContextRef.current = ctx;

                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256; // 128 bins
                analyser.smoothingTimeConstant = 0.5; // Lower = Snappier
                analyserRef.current = analyser;

                const source = ctx.createMediaStreamSource(stream);
                source.connect(analyser);
                sourceRef.current = source;

                setIsListening(true);
                loop();
            } else if (audioSource === 'tab') {
                // Check browser support
                if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                    throw new Error('Your browser does not support screen/tab capture. Try Chrome or Edge.');
                }

                console.log('[TabAudio] Browser supports getDisplayMedia');
                console.log('[TabAudio] Starting tab audio capture...');

                const capture = new TabAudioCapture();
                console.log('[TabAudio] Created TabAudioCapture instance');
                tabCaptureRef.current = capture;

                console.log('[TabAudio] Calling capture.start()...');
                const nodes = await capture.start();
                console.log('[TabAudio] capture.start() returned:', nodes);

                if (!nodes) {
                    throw new Error('Failed to start tab audio capture - no nodes returned');
                }

                console.log('[TabAudio] Setting audio context and analyser...');
                audioContextRef.current = nodes.audioContext;
                analyserRef.current = nodes.analyser;

                console.log('[TabAudio] Audio context state:', nodes.audioContext.state);
                console.log('[TabAudio] Analyser frequency bin count:', nodes.analyser.frequencyBinCount);

                // Wait a bit for the stream to be ready
                await new Promise(resolve => setTimeout(resolve, 100));

                console.log('[TabAudio] Starting visualization loop...');
                setIsListening(true);
                loop();
                console.log('[TabAudio] Tab audio capture fully initialized!');
            }
        } catch (err) {
            console.error(`${audioSource === 'tab' ? 'Tab audio capture' : 'Audio permission'} denied or error:`, err);
            setIsListening(false);
            alert(err.message || `Failed to start ${audioSource === 'tab' ? 'tab audio capture' : 'microphone'}. ${audioSource === 'tab' ? 'Make sure to select "This tab" and enable "Share audio".' : ''}`);
        }
    };

    const loop = () => {
        if (!analyserRef.current) {
            console.warn('[Loop] No analyser, stopping loop');
            return;
        }

        // Use TabAudioCapture's method if available, otherwise use analyser directly
        let dataArray;
        if (audioSourceRef.current === 'tab' && tabCaptureRef.current) {
            try {
                const freqData = tabCaptureRef.current.getFrequencyData();
                if (!freqData) {
                    console.warn('[Loop] No frequency data from tab capture, retrying...');
                    requestRef.current = requestAnimationFrame(loop);
                    return;
                }
                dataArray = freqData;
            } catch (err) {
                console.error('[Loop] Error getting tab audio data:', err);
                requestRef.current = requestAnimationFrame(loop);
                return;
            }
        } else {
            dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
        }

        // Calculate Energy (Average Volume)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const avg = sum / dataArray.length;

        // SENSITIVITY BOOST (Normalized by Volume)
        // If volume is low, we boost sensitivity to keep visuals active.
        const currentVol = Math.max(volumeRef.current, 5); // Clamp bottom at 5%
        const normFactor = 50 / currentVol; // Reference volume 50%
        // Base sensitivity 2.5, scaled by sqrt of volume factor to be less aggressive than linear
        const SENSITIVITY = 2.5 * Math.pow(normFactor, 0.6);

        const normEnergy = Math.min((avg / 255) * SENSITIVITY, 1);

        // Calculate Bands
        const getAvg = (start, end) => {
            let s = 0;
            let count = 0;
            for (let i = start; i < end && i < dataArray.length; i++) {
                s += dataArray[i];
                count++;
            }
            if (count === 0) return 0;
            return Math.min(((s / count) / 255) * SENSITIVITY, 1);
        };

        const bass = getAvg(0, 10);
        const mid = getAvg(10, 40);
        const treble = getAvg(40, Math.min(128, dataArray.length));

        // UPDATE REF DIRECTLY (No React Render)
        audioStateRef.current = {
            energy: normEnergy,
            bands: { bass, mid, treble },
            data: dataArray
        };

        requestRef.current = requestAnimationFrame(loop);
    };

    const toggleListening = () => {
        if (isListening) {
            cleanupAudio();
        } else {
            startAudio();
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => cleanupAudio();
    }, []);

    const value = {
        isListening,
        toggleListening,
        audioSource,
        setAudioSource,
        audioStateRef, // Expose Ref
        updateVolume
    };

    return (
        <AudioReactiveContext.Provider value={value}>
            {children}
        </AudioReactiveContext.Provider>
    );
};
