import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

export default function MagneticText({ content, className = '', color = '#ffffff', isActive = false, externalMouseX = null, externalMouseY = null }) {
    const internalMouseX = useMotionValue(Infinity);
    const internalMouseY = useMotionValue(Infinity);

    const mouseX = externalMouseX || internalMouseX;
    const mouseY = externalMouseY || internalMouseY;

    return (
        <motion.div
            onMouseMove={(e) => {
                if (!externalMouseX) {
                    internalMouseX.set(e.clientX);
                    internalMouseY.set(e.clientY);
                }
            }}
            onMouseLeave={() => {
                if (!externalMouseX) {
                    internalMouseX.set(Infinity);
                    internalMouseY.set(Infinity);
                }
            }}
            className={`flex ${className}`}
            style={{ cursor: 'default' }}
        >
            {content.split('').map((char, i) => (
                <MagneticLetter
                    key={i}
                    mouseX={mouseX}
                    mouseY={mouseY}
                    char={char}
                    color={color}
                    isActive={isActive}
                />
            ))}
        </motion.div>
    );
}

function MagneticLetter({ mouseX, mouseY, char, color, isActive }) {
    const ref = useRef(null);

    const distance = useTransform(mouseX, (val) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - (bounds.x + bounds.width / 2);
    });

    // "Glass Magnifying" Effect
    // 1. Magnify (Scale 2x)
    // 2. Displace neighbors (Margin) so they don't overlap
    // 3. Keep it stable (No Y-wave, No Rotation)

    // Lens Range: -120px to 120px
    const scale = useTransform(distance, [-120, 0, 120], [1, 1.5, 1]);

    // Spacing: Push letters apart to make room for the 2x scale
    // At center (0), add 12px margin. At edges, 0px.
    const marginSync = useTransform(distance, [-120, 0, 120], [0, 6, 0]);
    const margin = useTransform(marginSync, (val) => val < 0 ? 0 : val);

    const activeColor = isActive ? '#00ffcc' : color;
    const colorSync = useTransform(distance, [-60, 0, 60], [color, '#ffffff', color]);

    return (
        <motion.span
            ref={ref}
            style={{
                scale,
                marginRight: margin, // Physical displacement
                marginLeft: margin,
                color: isActive ? '#00ffcc' : colorSync,
                zIndex: useTransform(distance, [-50, 0, 50], [0, 10, 0]), // Pop above neighbors
                display: 'inline-block',
            }}
            className="font-bold relative transition-colors duration-75 origin-bottom"
        >
            {char === ' ' ? '\u00A0' : char}
        </motion.span>
    );
}
