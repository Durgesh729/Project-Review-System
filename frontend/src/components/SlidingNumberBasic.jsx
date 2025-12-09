import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SlidingNumber } from './core/sliding-number';

export function SlidingNumberBasic({ target }) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (value === target) return;

        // Calculate interval to ensure animation takes ~2 seconds total, 
        // but clamped to be reasonable (not too fast for large numbers, not too slow for small).
        // Since the user said "too fast", we prioritize a slower tick.

        const duration = 2000; // 2 seconds target duration
        // stepTime = duration / steps needed. Steps = target - current(0) = target.
        const stepTime = Math.floor(duration / (target || 1));

        // Clamp: Minimum 50ms per step (max 20fps) to ensure it's not a blur.
        // Maximum 300ms per step for very small numbers (e.g. 1 or 2) so it doesn't take forever to start.
        const intervalTime = Math.max(50, Math.min(stepTime, 300));

        const interval = setInterval(() => {
            setValue((prev) => {
                if (prev >= target) {
                    clearInterval(interval);
                    return target;
                }
                return prev + 1;
            });
        }, intervalTime);

        return () => clearInterval(interval);
    }, [value, target]);

    return (
        <motion.div
            initial={{ y: 0, fontSize: `${30}px` }}
            animate={{ y: 0, fontSize: `${30}px` }}
            transition={{
                ease: [1, 0, 0.35, 0.95],
                duration: 1.5,
                delay: 0.3,
            }}
            className='leading-none'
        >
            <div className='inline-flex items-center gap-1 font-mono'>
                <SlidingNumber value={value} />
            </div>
        </motion.div>
    );
}
