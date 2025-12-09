import React from 'react';
import { motion } from 'framer-motion';

export default function SingleGlowingCard({
    children,
    glowColor = "#3b82f6",
    glowRadius = 120,
    glowOpacity = 0.9
}) {
    return (
        <div
            className="relative group rounded-lg overflow-hidden"
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
                e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
            }}
        >
            {/* Glow Effect Layer */}
            <motion.div
                className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(circle ${glowRadius}px at var(--mouse-x, 50%) var(--mouse-y, 50%), ${glowColor}, transparent)`
                }}
            />

            {/* Content Layer - wrapped in relative to sit above absolute glow */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
}
