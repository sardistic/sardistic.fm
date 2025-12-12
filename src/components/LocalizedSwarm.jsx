import React, { useRef, useEffect } from 'react';
import { motion, motionValue } from 'framer-motion';

export default function LocalizedSwarm({ barPositions = [], isHovered = false, barScale = 1 }) {
    const containerRef = useRef(null);
    const particleSystem = useRef([]);
    const mousePos = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        if (!containerRef.current || barPositions.length === 0) return;

        const handleMouseMove = (e) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            mousePos.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        window.addEventListener('mousemove', handleMouseMove);

        let frameId;
        const update = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const W = rect.width;
            const H = rect.height;

            const mx = mousePos.current.x;
            const my = mousePos.current.y;
            const isMouseInside = mx >= 0 && mx <= W && my >= 0 && my <= H;

            // Emit particles from bars near mouse cursor
            if (isHovered && isMouseInside) {
                barPositions.forEach((bar, index) => {
                    const barX = (bar.x / 100) * W;
                    const barWidth = (bar.width / 100) * W;
                    const scaledHeight = (bar.height / 100) * H * barScale;
                    const barY = H - scaledHeight;

                    // Check if mouse is over this bar (horizontally)
                    const isOverBar = mx >= barX && mx <= barX + barWidth * barScale;

                    // Distance from mouse to bar top
                    const distToBar = Math.abs(my - barY);

                    // Emit more particles when mouse is directly over or near bar
                    const proximity = Math.max(0, 1 - distToBar / 100);
                    const emitChance = isOverBar ? 0.9 : proximity * 0.5;

                    if (Math.random() < emitChance) {
                        // Emit from bar position, towards mouse
                        const startX = barX + Math.random() * barWidth * barScale;
                        const startY = barY + Math.random() * 10;

                        const dx = mx - startX;
                        const dy = my - startY;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        const particle = {
                            x: startX,
                            y: startY,
                            valX: motionValue(startX),
                            valY: motionValue(startY),
                            vx: (dx / dist) * (0.5 + Math.random() * 1.5),
                            vy: (dy / dist) * (0.5 + Math.random() * 1.5) - 0.5, // Slight upward bias
                            size: isOverBar ? (Math.random() * 2.5 + 1.5) : (Math.random() * 1.5 + 0.5),
                            color: bar.color,
                            opacity: isOverBar ? (0.7 + Math.random() * 0.3) : (0.3 + Math.random() * 0.3),
                            life: 1.0,
                            decay: 0.02
                        };
                        particleSystem.current.push(particle);
                    }
                });
            }

            // Update particles
            particleSystem.current = particleSystem.current.filter(p => {
                p.vx *= 0.96;
                p.vy *= 0.96;
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay;

                if (p.life <= 0 || p.y < -30 || p.y > H + 30 || p.x < -30 || p.x > W + 30) {
                    return false;
                }

                p.valX.set(p.x);
                p.valY.set(p.y);
                return true;
            });

            frameId = requestAnimationFrame(update);
        };

        update();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(frameId);
        };
    }, [barPositions, isHovered, barScale]);

    return (
        <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-visible">
            {particleSystem.current.map((p, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        opacity: p.opacity * p.life,
                        x: p.valX,
                        y: p.valY,
                        boxShadow: `0 0 ${p.size * 4}px ${p.color}`
                    }}
                />
            ))}
        </div>
    );
}
