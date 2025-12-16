import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const AudioReactiveContext = createContext({
    isListening: false,
    toggleListening: () => { },
    audioStateRef: { current: { energy: 0, bands: { bass: 0, mid: 0, treble: 0 }, data: new Uint8Array(0) } }
});

export const useAudioReactive = () => useContext(AudioReactiveContext);

export const AudioReactiveProvider = ({ children }) => {
    const [isListening, setIsListening] = useState(false);

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

    const cleanupAudio = () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (sourceRef.current) sourceRef.current.disconnect();
        if (analyserRef.current) analyserRef.current.disconnect();
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        setIsListening(false);
        // Reset ref
        audioStateRef.current = {
            energy: 0,
            bands: { bass: 0, mid: 0, treble: 0 },
            data: new Uint8Array(128)
        };
    };

    const startAudio = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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
        } catch (err) {
            console.error("Audio permission denied or error:", err);
            setIsListening(false);
        }
    };

    const loop = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount); // 128
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate Energy (Average Volume)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const avg = sum / dataArray.length;

        // SENSITIVITY BOOST
        const SENSITIVITY = 2.5;
        const normEnergy = Math.min((avg / 255) * SENSITIVITY, 1);

        // Calculate Bands
        // Bass: ~20Hz - 250Hz (Bins 0-10 approx with 44.1k/256fft)
        // Mid: ~250Hz - 2kHz
        // Treble: ~2kHz+

        const getAvg = (start, end) => {
            let s = 0;
            let count = 0;
            for (let i = start; i < end && i < dataArray.length; i++) {
                s += dataArray[i];
                count++;
            }
            if (count === 0) return 0;
            // Apply sensitivity capability to bands too
            return Math.min(((s / count) / 255) * SENSITIVITY, 1);
        };

        const bass = getAvg(0, 10);
        const mid = getAvg(10, 40);
        const treble = getAvg(40, 128);

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
        audioStateRef // Expose Ref
    };

    return (
        <AudioReactiveContext.Provider value={value}>
            {children}
        </AudioReactiveContext.Provider>
    );
};
