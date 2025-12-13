import React, { useRef } from 'react';
import { motion, useTransform } from 'framer-motion';

export default function MagneticBar({ mouseX, height, dayPercent, nightPercent, isActive, color = '#00ffcc' }) {
    const ref = useRef(null);
    const distance = useTransform(mouseX, (val) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - (bounds.x + bounds.width / 2);
    });

    const scaleX = useTransform(distance, [-60, 0, 60], [1, 2.5, 1]);
    const scaleY = useTransform(distance, [-60, 0, 60], [1, 1.3, 1]);
    const zIndex = useTransform(distance, [-60, 0, 60], [1, 50, 1]);

    return (
        <motion.div
            ref={ref}
            className="flex-1 mx-[1px] min-w-[2px] flex flex-col justify-end rounded-t-sm overflow-hidden"
            style={{
                height: `${height}%`,
                scaleX: isActive ? scaleX : 1,
                scaleY: isActive ? scaleY : 1,
                zIndex: isActive ? zIndex : 1,
                transformOrigin: 'bottom center',
                boxShadow: isActive ? `0 0 8px ${color}90` : 'none'
            }}
        >
            <div
                className={`w-full ${isActive ? 'bg-yellow-400' : 'bg-white'}`}
                style={{ height: `${dayPercent * 100}%` }}
            />
            <div
                className={`w-full ${isActive ? 'bg-purple-400' : 'bg-white'}`}
                style={{ height: `${nightPercent * 100}%` }}
            />
        </motion.div>
    );
}
