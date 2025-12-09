import React, { useEffect, useRef } from 'react';

function FluidBackground({ intensity = 0 }) {
    const canvasRef = useRef(null);
    const intensityRef = useRef(intensity);

    // Update ref when prop changes without re-triggering effect
    useEffect(() => {
        intensityRef.current = intensity;
    }, [intensity]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        let width, height;
        let animationFrame;

        // Physics Config
        const STRING_COUNT = 15;
        const POINTS = 30;
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
                const currentIntensity = intensityRef.current || 0;

                for (let i = 0; i < this.points.length; i++) {
                    const p = this.points[i];

                    // 1. Horizontal Traveling Wave (Subtle normally, wilder with intensity)
                    // Base Amp: 8, Max Amp addition: 30
                    const amp = 8 + (currentIntensity * 30);
                    const waveY = Math.sin(i * 0.2 + time * this.speed) * amp;
                    const targetY = this.baseY + waveY;

                    // 2. Interaction
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        const force = (150 - dist) / 150;
                        p.vy += force * mouse.vy * 0.4;

                        // Push away slightly
                        if (Math.abs(dy) < 40) {
                            p.vy += (dy < 0 ? -1 : 1) * 2;
                        }
                    }

                    // 3. Elasticity & Damping
                    const forceY = (targetY - p.y) * 0.05;
                    p.vy += forceY;
                    p.vx *= DAMPING;
                    p.vy *= DAMPING;

                    p.x += p.vx;
                    p.y += p.vy;
                }

                // 4. Neighbor Smoothing
                for (let i = 1; i < this.points.length - 1; i++) {
                    const prev = this.points[i - 1];
                    const curr = this.points[i];
                    const next = this.points[i + 1];
                    const smoothY = (prev.y + next.y) / 2;
                    curr.vy += (smoothY - curr.y) * VISCOSITY;
                }
            }

            draw(ctx, mouse) {
                const currentIntensity = intensityRef.current || 0;

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
                const lineWidth = 0.8 + (glowIntensity * 1.5);

                if (glowIntensity > 0.1) {
                    ctx.beginPath();
                    ctx.lineWidth = lineWidth * 3;
                    ctx.globalAlpha = 0.1 * glowIntensity;
                    this.trace(ctx);
                    ctx.stroke();
                }

                ctx.beginPath();
                ctx.lineWidth = lineWidth;
                ctx.globalAlpha = alphaCore;
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
            // Speed up time based on intensity
            const currentIntensity = intensityRef.current || 0;
            time += 0.05 + (currentIntensity * 0.1);

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
