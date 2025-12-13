import React, { useRef, useEffect } from 'react';

export default function LocalizedSwarm({ barPositions = [], isHovered = false, barScale = 1 }) {
    const canvasRef = useRef(null);
    const particleSystem = useRef([]);
    const mousePos = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleMouseMove = (e) => {
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            mousePos.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        window.addEventListener('mousemove', handleMouseMove);

        const ctx = canvas.getContext('2d');
        let frameId;

        const update = () => {
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();

            // Handle resizing of canvas resolution to match display size
            if (canvas.width !== rect.width || canvas.height !== rect.height) {
                canvas.width = rect.width;
                canvas.height = rect.height;
            }

            const W = canvas.width;
            const H = canvas.height;

            // Adjust mouse coordinates if canvas scale differs (usually 1:1 here but good practice)
            // Since we set width=rect.width, it's 1:1.

            const mx = mousePos.current.x;
            const my = mousePos.current.y;
            const isMouseInside = mx >= -50 && mx <= W + 50 && my >= -50 && my <= H + 50; // Tolerance

            ctx.clearRect(0, 0, W, H);

            // Use 'lighter' or 'screen' for glowing particle look
            ctx.globalCompositeOperation = 'screen';

            // --- SPAWN LOGIC ---
            if (isHovered && isMouseInside) {
                barPositions.forEach((bar) => {
                    const barX = (bar.x / 100) * W;
                    const barWidth = (bar.width / 100) * W;
                    const scaledHeight = (bar.height / 100) * H * barScale;
                    const barY = H - scaledHeight; // Bottom aligned

                    // Check if mouse is near this bar horizontally
                    // barScale for width? No, barScale usually height or generic. 
                    // Let's assume bar width doesn't scale much or handled by layout.
                    // The props passed barScale. 
                    // In previous code: `mx >= barX && mx <= barX + barWidth * barScale`
                    // Let's keep that logic.

                    const effectiveWidth = barWidth; // * barScale? usually width scales little.
                    const isOverBar = mx >= barX && mx <= barX + effectiveWidth;

                    const distToBar = Math.abs(my - barY);

                    // Emit chance
                    const proximity = Math.max(0, 1 - distToBar / 150); // Increased range 100->150
                    const emitChance = isOverBar ? 0.9 : proximity * 0.4;

                    if (Math.random() < emitChance) {
                        const startX = barX + Math.random() * effectiveWidth;
                        const startY = barY + Math.random() * 10 - 5; // Near top of bar

                        const dx = mx - startX;
                        const dy = my - startY;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                        particleSystem.current.push({
                            x: startX,
                            y: startY,
                            vx: (dx / dist) * (0.5 + Math.random() * 2.5),
                            vy: (dy / dist) * (0.5 + Math.random() * 2.5) - 1.0, // Upward bias
                            size: isOverBar ? (Math.random() * 2.5 + 1.0) : (Math.random() * 1.5 + 0.5),
                            color: bar.color,
                            opacity: isOverBar ? (0.8 + Math.random() * 0.2) : (0.4 + Math.random() * 0.3),
                            life: 1.0,
                            decay: 0.01 + Math.random() * 0.02
                        });
                    }
                });
            }

            // --- UPDATE & DRAW LOGIC ---
            // We iterate backwards or allow filter. Filter is newer JS, fine.
            // Using a plain loop might be faster for particles, but filter is okay for N < 1000.

            const activeParticles = [];

            for (let p of particleSystem.current) {
                p.vx *= 0.95; // Drag
                p.vy *= 0.95;
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay;

                if (p.life > 0) {
                    // Draw
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.opacity * p.life;

                    // Canvas Shadow for Glow
                    // This can be expensive. If laggy, remove shadowBlur.
                    // Given 20 instances, maybe keep it low or conditional?
                    // Let's try it.
                    ctx.shadowBlur = p.size * 2;
                    ctx.shadowColor = p.color;

                    ctx.fill();

                    activeParticles.push(p);
                }
            }

            // Reset shadow to avoid affecting other things? (Ctx cleared anyway)
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;

            particleSystem.current = activeParticles;

            frameId = requestAnimationFrame(update);
        };

        update();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(frameId);
        };
    }, [barPositions, isHovered, barScale]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none w-full h-full mix-blend-screen"
        />
    );
}
