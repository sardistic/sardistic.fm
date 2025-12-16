import React, { useEffect, useRef } from 'react';
import { useAudioReactive } from './AudioReactiveContext';

function FluidBackground({ intensity = 0 }) {
    const canvasRef = useRef(null);
    const intensityRef = useRef(intensity);

    // Audio Context
    const { audioStateRef, isListening } = useAudioReactive();

    // Fix Stale Closure
    const listeningRef = useRef(isListening);
    useEffect(() => {
        listeningRef.current = isListening;
    }, [isListening]);

    useEffect(() => {
        intensityRef.current = intensity;
    }, [intensity]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        let width, height;
        let animationFrame;

        // Visual Config
        const STRING_COUNT = 15;
        const POINTS = 80;
        // Physics - "Silky" tuning
        const VISCOSITY = 0.15;
        const DAMPING = 0.95;
        const TENSION = 0.1;

        // State
        const strings = [];
        let mouse = { x: -1000, y: -1000, vx: 0, vy: 0 };
        let prevMouse = { x: 0, y: 0 };
        let time = 0;

        class StringLine {
            constructor(y, color, speed, index) {
                this.baseY = y;
                this.y = y;
                this.color = color;
                this.speed = speed * 0.3; // Very slow, graceful idle
                this.index = index;
                this.points = [];

                const totalWidth = window.innerWidth + 400; // Extra bleed

                for (let i = 0; i <= POINTS; i++) {
                    // FIX WOBBLE on LOAD: Initialize Y at the wave position!
                    // If we start at 'y' (flat), the springs instantly snap to the wave, creating wobble.
                    const initialWave = Math.sin(i * 0.2) * 10;

                    this.points.push({
                        x: (totalWidth / POINTS) * i - 200, // Center offset
                        y: y + initialWave, // Start exactly where we want to be
                        vx: 0,
                        vy: 0,
                    });
                }
            }

            update(mouse, time) {
                let currentIntensity = intensityRef.current || 0;
                let isAudio = false;
                let audioData = null;

                if (audioStateRef.current && listeningRef.current) {
                    currentIntensity = audioStateRef.current.energy * 3.0;
                    isAudio = true;
                    audioData = audioStateRef.current.data;
                }

                for (let i = 0; i < this.points.length; i++) {
                    const p = this.points[i];

                    // 1. Audio Displacement (Vibration, not Thickness)
                    let audioOffset = 0;
                    if (isAudio && audioData) {
                        const binIndex = (this.index * 3) + Math.floor((i / this.points.length) * 50);
                        const safeBin = Math.min(127, Math.max(0, binIndex));
                        const val = audioData[safeBin] || 0;

                        // Map energy to Amplitude
                        audioOffset = (val / 255) * 60 * currentIntensity;
                        if (i % 2 !== 0) audioOffset *= -1; // Zig-zag vibrate
                    }

                    // 2. Ambient Wave (Liquid)
                    const waveSpeed = this.speed + (currentIntensity * 0.1);
                    const waveY = Math.sin(i * 0.2 + time * waveSpeed) * (10 + currentIntensity * 20);

                    let targetY = this.baseY + waveY - audioOffset;

                    // 3. Mouse Interaction (Stronger Drag/Repel)
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 300) { // Bigger Radius (300px)
                        const force = (300 - dist) / 300;
                        // "Drag" - Transfer mouse velocity directly
                        p.vy += force * (mouse.vy * 0.8);
                        // "Repel" - Push away slightly to create Volume
                        if (Math.abs(dy) < 100) {
                            p.vy += (dy < 0 ? -1 : 1) * force * 15;
                        }
                    }

                    // 4. Physics Engine
                    const forceY = (targetY - p.y) * TENSION;
                    p.vy += forceY;
                    p.vx *= DAMPING;
                    p.vy *= DAMPING;

                    p.x += p.vx;
                    p.y += p.vy;
                }

                // 5. Smoothing (Silky Look)
                for (let k = 0; k < 2; k++) {
                    for (let i = 1; i < this.points.length - 1; i++) {
                        const prev = this.points[i - 1];
                        const curr = this.points[i];
                        const next = this.points[i + 1];
                        const smoothY = (prev.y + next.y) / 2;
                        curr.vy += (smoothY - curr.y) * VISCOSITY;
                    }
                }
            }

            draw(ctx, mouse) { // Added height param if needed, but using global access or passing it down is better. 
                // We'll calculate height-based fade using this.baseY relative to window.innerHeight

                let currentIntensity = intensityRef.current || 0;
                if (audioStateRef.current && listeningRef.current) {
                    currentIntensity = audioStateRef.current.energy * 3.0;
                }

                // GLOW LOGIC: Additive Blending handles the "Glow"
                // Audio controls OPACITY, not THICKNESS
                ctx.strokeStyle = this.color;

                // Base thin elegant line
                const baseWidth = 2;
                ctx.lineWidth = baseWidth;

                // --- FADE LOGIC (Aggressive) ---

                // 1. VERTICAL FADE
                const screenH = window.innerHeight;
                const normalizeY = this.baseY / screenH;
                const vertFade = Math.sin(normalizeY * Math.PI);

                // 2. MOUSE DISTANCE FADE (Flashlight Effect)
                let mouseFade = 0.02; // Practically invisible by default
                if (mouse.x > 0) {
                    const dy = Math.abs(mouse.y - this.baseY); // Use baseY for stable bands
                    const distFactor = Math.max(0, 1.0 - (dy / 600)); // 600px spread
                    mouseFade += distFactor * 0.98;
                }

                // Combine: Base Fade + Audio Boost (Audio lights up the room slightly)
                let opacity = mouseFade;
                // Add a bit of global light when music hits hard (optional, keeps it interactive)
                opacity += currentIntensity * 0.2;

                opacity *= vertFade;

                // Clamp
                opacity = Math.min(opacity, 1.0);
                opacity = Math.max(opacity, 0.0);

                ctx.globalAlpha = opacity;

                this.trace(ctx);
                ctx.stroke();

                // Double stroke for core (hot center) if loud
                if (currentIntensity > 0.5) {
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = opacity; // Match fade
                    ctx.strokeStyle = '#ffffff'; // White hot core
                    this.trace(ctx);
                    ctx.stroke();
                }
            }

            trace(ctx) {
                ctx.beginPath();
                ctx.moveTo(this.points[0].x, this.points[0].y);
                for (let i = 0; i < this.points.length - 1; i++) {
                    const p_curr = this.points[i];
                    const p_next = this.points[i + 1];
                    const xc = (p_curr.x + p_next.x) / 2;
                    const yc = (p_curr.y + p_next.y) / 2;
                    ctx.quadraticCurveTo(p_curr.x, p_curr.y, xc, yc);
                }
            }
        }

        const init = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;

            strings.length = 0;
            // "Aurora" Palette
            const colors = [
                '#00ffcc', // Cyan
                '#00ccff', // Sky
                '#0066ff', // Blue
                '#cc00ff', // Violet
                '#ff00cc', // Magenta
            ];

            for (let i = 0; i < STRING_COUNT; i++) {
                const y = (height / (STRING_COUNT + 1)) * (i + 1);
                const color = colors[i % colors.length];
                const speed = 0.8 + Math.random() * 0.5;
                strings.push(new StringLine(y, color, speed, i));
            }
        };

        const handleMouseMove = (e) => {
            mouse.vx = e.clientX - prevMouse.x;
            mouse.vy = e.clientY - prevMouse.y;
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            prevMouse = { x: e.clientX, y: e.clientY };
        };

        const draw = () => {
            time += 0.05;

            // Deep Fade Background (Trailing effect)
            ctx.fillStyle = '#050508'; // Very dark blue/black
            // Use lighter composite for lines
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillRect(0, 0, width, height);

            // AUTO-GLOW: Additive Blending
            ctx.globalCompositeOperation = 'lighter';

            strings.forEach(s => {
                s.update(mouse, time);
                s.draw(ctx, mouse); // PASS MOUSE HERE
            });

            mouse.vx *= 0.1;
            mouse.vy *= 0.1;

            animationFrame = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', init);
        window.addEventListener('mousemove', handleMouseMove);

        init();
        draw();

        return () => {
            window.removeEventListener('resize', init);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
        />
    );
}

export default FluidBackground;
