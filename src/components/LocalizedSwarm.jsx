import React, { useRef, useEffect } from 'react';

export default function LocalizedSwarm({ barPositions = [], isHovered = false, barScale = 1 }) {
    const canvasRef = useRef(null);
    const particleSystem = useRef([]);
    const mousePos = useRef({ x: -1000, y: -1000 });

    // Optimized Mouse Tracking: Only listen when hovered to prevent 19x BoundingRect thrashing
    useEffect(() => {
        if (!isHovered) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mousePos.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isHovered]);

    // Animation Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let frameId;

        const update = () => {
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();

            if (canvas.width !== rect.width || canvas.height !== rect.height) {
                canvas.width = rect.width;
                canvas.height = rect.height;
            }

            const W = canvas.width;
            const H = canvas.height;
            const mx = mousePos.current.x;
            const my = mousePos.current.y;
            const isMouseInside = mx >= -50 && mx <= W + 50 && my >= -50 && my <= H + 50;

            ctx.clearRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'screen';

            // --- SPAWN LOGIC ---
            if (isHovered && isMouseInside) {
                barPositions.forEach((bar) => {
                    const barX = (bar.x / 100) * W;
                    const barWidth = (bar.width / 100) * W;
                    const scaledHeight = (bar.height / 100) * H * barScale;
                    const barY = H - scaledHeight;

                    const effectiveWidth = barWidth;
                    const isOverBar = mx >= barX && mx <= barX + effectiveWidth;
                    const distToBar = Math.abs(my - barY);

                    const proximity = Math.max(0, 1 - distToBar / 150);
                    const emitChance = isOverBar ? 0.9 : proximity * 0.4;

                    if (Math.random() < emitChance) {
                        const startX = barX + Math.random() * effectiveWidth;
                        const startY = barY + Math.random() * 10 - 5;
                        const dx = mx - startX;
                        const dy = my - startY;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                        particleSystem.current.push({
                            x: startX,
                            y: startY,
                            vx: (dx / dist) * (0.5 + Math.random() * 2.5),
                            vy: (dy / dist) * (0.5 + Math.random() * 2.5) - 1.0,
                            size: isOverBar ? (Math.random() * 2.5 + 1.0) : (Math.random() * 1.5 + 0.5),
                            color: bar.color,
                            opacity: isOverBar ? (0.8 + Math.random() * 0.2) : (0.4 + Math.random() * 0.3),
                            life: 1.0,
                            decay: 0.01 + Math.random() * 0.02
                        });
                    }
                });
            }

            // --- UPDATE & DRAW ---
            const activeParticles = [];
            for (let p of particleSystem.current) {
                p.vx *= 0.95;
                p.vy *= 0.95;
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay;

                if (p.life > 0) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.opacity * p.life;
                    // Note: Removed shadowBlur for performance
                    ctx.fill();
                    activeParticles.push(p);
                }
            }
            ctx.globalAlpha = 1.0;
            particleSystem.current = activeParticles;
            frameId = requestAnimationFrame(update);
        };

        update();
        return () => cancelAnimationFrame(frameId);
    }, [barPositions, isHovered, barScale]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none w-full h-full mix-blend-screen"
        />
    );
}
