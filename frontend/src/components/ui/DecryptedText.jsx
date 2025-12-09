import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

/**
 * DecryptedText
 *
 * @param {string} text - The text to display
 * @param {number} speed - Speed in ms per iteration
 * @param {number} maxIterations - Max number of iterations before revealing a character
 * @param {boolean} sequential - Whether to reveal sequentially or all simultaneously (if false, it's random)
 * @param {string} revealDirection - "start" | "end" | "center" (only used if sequential is true)
 * @param {boolean} animateOn - "view" | "hover" | "always"
 * @param {string} className - Wrapper class
 * @param {string} encryptedClassName - Class for encrypted characters
 */
export default function DecryptedText({
    text = "",
    speed = 50,
    maxIterations = 10,
    sequential = false,
    revealDirection = "start",
    animateOn = "hover",
    className = "",
    encryptedClassName = "",
    ...props
}) {
    const [displayText, setDisplayText] = useState(text);
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef(null);

    // Determine if we should be checking for view visibility
    // If animateOn is 'view', we use once: true usually, but to allow flexibility we just track it.
    // However, the user asked for stability. If 'once: true' is set, it won't re-trigger. 
    // If the user wants re-triggering they might rely on component remounting or manual keys.
    const isInView = useInView(containerRef, { once: true, amount: 0.5 });

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";

    useEffect(() => {
        let interval;
        let iteration = 0;

        const shouldAnimate =
            (animateOn === 'view' && isInView) ||
            (animateOn === 'hover' && isHovering) ||
            (animateOn === 'always');

        if (shouldAnimate) {
            // Function to generate the next frame of text
            const updateText = () => {
                setDisplayText(current => {
                    return text
                        .split("")
                        .map((char, i) => {
                            if (char === " ") return " ";

                            let shouldReveal = false;
                            if (sequential) {
                                // For sequential, we use iteration count to reveal characters one by one
                                // We essentially start revealing index 0 at iteration 0 (or later if we want delay)
                                // Standard logical reveal:
                                if (iteration >= i) {
                                    shouldReveal = true;
                                }
                            } else {
                                // For non-sequential, reveal all after maxIterations
                                if (iteration >= maxIterations) {
                                    shouldReveal = true;
                                }
                            }

                            if (shouldReveal) return char;

                            // Return random character
                            return characters[Math.floor(Math.random() * characters.length)];
                        })
                        .join("");
                });
                iteration++;
            };

            // Run immediately once to start from encrypted state
            updateText();

            interval = setInterval(() => {
                updateText();

                // Cleanup/Stop condition
                if (sequential) {
                    if (iteration > text.length + 5) clearInterval(interval);
                } else {
                    if (iteration > maxIterations + 5) clearInterval(interval);
                }
            }, speed);

        } else {
            // Reset to original text when not animating
            setDisplayText(text);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [animateOn, isInView, isHovering, text, speed, maxIterations, sequential]);

    const handleMouseEnter = () => {
        if (animateOn === "hover") setIsHovering(true);
    };

    const handleMouseLeave = () => {
        if (animateOn === "hover") setIsHovering(false);
    };

    return (
        <span
            ref={containerRef}
            className={className}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
        >
            <span className="sr-only">{text}</span>
            <motion.span aria-hidden="true">
                {displayText.split("").map((char, index) => {
                    const isRevealed = char === text[index];
                    return (
                        <span key={index} className={!isRevealed ? encryptedClassName : ""}>
                            {char}
                        </span>
                    );
                })}
            </motion.span>
        </span>
    );
}
