import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function TextRoll({
    children,
    className,
    variants,
    transition = { duration: 0.5, ease: "easeInOut" }
}) {
    const text = typeof children === 'string' ? children : '';
    const letters = text.split('');

    const containerVariants = {
        initial: {},
        animate: {
            transition: {
                staggerChildren: 0.05,
            },
        },
        exit: {
            transition: {
                staggerChildren: 0.05,
                staggerDirection: -1
            }
        }
    };

    const letterVariants = {
        initial: variants?.enter?.initial || { y: 0 },
        animate: variants?.enter?.animate || { y: 0 },
        exit: variants?.exit?.animate || { y: 0 }
    };

    // Helper to merge transitions if needed, or just use default
    const itemTransition = {
        ...transition
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                className={className}
                variants={containerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{ display: 'inline-block', overflow: 'hidden' }}
            >
                {letters.map((letter, index) => (
                    <motion.span
                        key={index}
                        variants={letterVariants}
                        transition={itemTransition}
                        style={{ display: 'inline-block', whiteSpace: 'pre' }}
                    >
                        {letter}
                    </motion.span>
                ))}
            </motion.div>
        </AnimatePresence>
    );
}
