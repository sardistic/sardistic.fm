import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

export default function TiltCard({ children, className }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const rotateX = useTransform(y, [-100, 100], [5, -5]); // Inverted for natural feel
    const rotateY = useTransform(x, [-100, 100], [-5, 5]);

    function handleMouseMove(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const xPct = (mouseX / width - 0.5) * 200; // -100 to 100
        const yPct = (mouseY / height - 0.5) * 200;
        x.set(xPct);
        y.set(yPct);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    return (
        <motion.div
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
                perspective: 1000
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`rounded-3xl border border-white/10 bg-gray-900/60 backdrop-blur-2xl transition-shadow duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden ${className ? className : ''}`}
        >
            {/* Gloss Reflection */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none z-50"
                style={{
                    x: useTransform(x, [-100, 100], [-20, 20]),
                    y: useTransform(y, [-100, 100], [-20, 20]),
                }}
            />
            {children}
        </motion.div>
    );
}
