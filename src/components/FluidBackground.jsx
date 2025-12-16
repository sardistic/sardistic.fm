import React, { useEffect, useRef } from 'react';
import { useAudioReactive } from './AudioReactiveContext';

function FluidBackground({ intensity = 0 }) {
    const canvasRef = useRef(null);
    const intensityRef = useRef(intensity);

    // Audio Hook
    const { audioStateRef, isListening } = useAudioReactive();
    const isListeningRef = useRef(isListening);

    // Update refs
    useEffect(() => {
        intensityRef.current = intensity;
    }, [intensity]);

    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        let width, height;
        let animationFrame;

        // Physics Config
        const STRING_COUNT = 15;
        const POINTS = 200;
        const VISCOSITY = 0.05;
        const DAMPING = 0.95;

        // State
        const strings = [];
        let mouse = { x: -1000, y: -1000, vx: 0, vy: 0 };
        let prevMouse = { x: 0, y: 0 };
        let time = 0;

        class StringLine {
            constructor(y, color, speed) {
                this.baseY = y;
                this.y = y;
                this.color = color;
                this.speed = speed * 0.5; // Slower speed
                this.points = [];

                // IMPORTANT: Extend width significantly to prevent right-side cut-off
                const totalWidth = window.innerWidth + 200;

                for (let i = 0; i <= POINTS; i++) {
                    this.points.push({
                        x: (totalWidth / POINTS) * i,
                        y: y,
                        vx: 0,
                        vy: 0,
                        baseX: (totalWidth / POINTS) * i
                    });
                }
            }

            update(mouse, time) {
                let currentIntensity = intensityRef.current || 0;
                let audioEnergy = 0;
                let bass = 0, mid = 0, treble = 0;

                // Override with Audio Energy if Active
                // USE REF TO AVOID STALE CLOSURE
                if (audioStateRef.current && isListeningRef.current) {
                    audioEnergy = audioStateRef.current.energy;
                    ({ bass, mid, treble } = audioStateRef.current.bands);

                    // Blend prop intensity with direct audio energy
                    // 'Goldilocks' Multiplier: 3.5
                    currentIntensity = Math.max(currentIntensity, audioEnergy * 3.5);
                }

                for (let i = 0; i < this.points.length; i++) {
                    const p = this.points[i];

                    // 1. Base Wave (Swooping)
                    // 'Goldilocks' Amp: 35
                    const amp = 8 + (currentIntensity * 35);
                    const waveY = Math.sin(i * 0.05 + time * this.speed) * amp;

                    // 2. High Frequency Audio Jitter (The "Reactivity")
                    let jitter = 0;
                    if (isListeningRef.current && audioEnergy > 0.01) {
                        const bassWave = Math.sin(i * 0.05 + time * 3.0) * (bass * 25);
                        const midWave = Math.sin(i * 0.3 + time * 5.0) * (mid * 20);
                        const trebleWave = Math.sin(i * 1.5 + time * 10.0) * (treble * 15);

                        jitter = bassWave + midWave + trebleWave;
                    }

                    const targetY = this.baseY + waveY + jitter;

                    // 3. Interaction
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        const force = (150 - dist) / 150;
                        p.vy += force * mouse.vy * 0.4;
                        if (Math.abs(dy) < 40) p.vy += (dy < 0 ? -1 : 1) * 2;
                    }

                    // 4. Elasticity & Damping
                    const forceY = (targetY - p.y) * 0.05;
                    p.vy += forceY;
                    p.vx *= DAMPING;
                    p.vy *= DAMPING;

                    p.x += p.vx;
                    p.y += p.vy;
                }

                // 5. Neighbor Smoothing
                for (let i = 1; i < this.points.length - 1; i++) {
                    const prev = this.points[i - 1];
                    const curr = this.points[i];
                    const next = this.points[i + 1];
                    const smoothY = (prev.y + next.y) / 2;
                    curr.vy += (smoothY - curr.y) * VISCOSITY;
                }
            }

            draw(ctx, mouse) {
                let currentIntensity = intensityRef.current || 0;
                // USE REF TO AVOID STALE CLOSURE
                if (audioStateRef.current && isListeningRef.current) {
                    currentIntensity = Math.max(currentIntensity, audioStateRef.current.energy * 2.0); // Boost for visual glow
                }

                ctx.strokeStyle = this.color;

                // Calculate distance from mouse Y to string Y (approx glow)
                const distY = Math.abs(mouse.y - this.y);

                // Dynamic Glow Intensity based on proximity OR music intensity
                let glowIntensity = currentIntensity * 0.5; // Base glow from music
                if (distY < 200) {
                    glowIntensity += (200 - distY) / 200;
                }

                // Base opacity + extra glow
                // Thinner lines to reduce "close up" feeling
                const alphaCore = 0.3 + (glowIntensity * 0.5);
                const lineWidth = 1.0 + (glowIntensity * 1.5); // Thicker peaks

                if (glowIntensity > 0.1) {
                    ctx.beginPath();
                    ctx.lineWidth = lineWidth * 3;
                    ctx.globalAlpha = 0.1 * glowIntensity;
                    this.trace(ctx);
                    ctx.stroke();
                }

                ctx.beginPath();
                ctx.lineWidth = lineWidth;
                ctx.globalAlpha = Math.min(1, alphaCore);
                this.trace(ctx);
                ctx.stroke();
            }

            trace(ctx) {
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
            const colors = ['#880044', '#008877', '#4400aa', '#886600'];

            for (let i = 0; i < STRING_COUNT; i++) {
                const y = (height / (STRING_COUNT + 1)) * (i + 1);
                const color = colors[i % colors.length];
                const speed = 0.5 + Math.random() * 1.5;
                strings.push(new StringLine(y, color, speed));
            }
        };

        const handleMouseMove = (e) => {
            mouse.vx = e.clientX - prevMouse.x;
            mouse.vy = e.clientY - prevMouse.y;
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            prevMouse = { x: e.clientX, y: e.clientY };
        };

        const handleClick = (e) => {
            const clickX = e.clientX;
            const clickY = e.clientY;

            strings.forEach(s => {
                s.points.forEach(p => {
                    const dx = clickX - p.x;
                    const dy = clickY - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 400) {
                        const force = (400 - dist) / 400;
                        p.vy += (dy < 0 ? -1 : 1) * force * 40;
                    }
                });
            });
        };

        const draw = () => {
            // Speed up time based on intensity OR audio energy
            let speedBoost = intensityRef.current || 0;
            // USE REF TO AVOID STALE CLOSURE
            if (audioStateRef.current && isListeningRef.current) {
                speedBoost = Math.max(speedBoost, audioStateRef.current.energy * 0.4);
            }
            // Base speed 0.05, max speed ~0.15
            time += 0.05 + speedBoost * 0.2;

            // Lighter background (less pure black, more dark grey-ish to show depth)
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, width, height);

            // Standard mixing
            ctx.globalCompositeOperation = 'source-over';

            strings.forEach(s => {
                s.update(mouse, time);
                s.draw(ctx, mouse);
            });

            mouse.vx *= 0.1;
            mouse.vy *= 0.1;

            animationFrame = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', init);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleClick);

        init();
        draw();

        return () => {
            window.removeEventListener('resize', init);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleClick);
            cancelAnimationFrame(animationFrame);
        };
    }, []); // Empty dependency array -> Init once. Logic uses ref.

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
        />
    );
}

export default FluidBackground;
