import React, { useState, useEffect } from 'react';

const TextType = ({
    text,
    typingSpeed = 100,
    deletingSpeed = 50,
    pauseDuration = 1000,
    showCursor = true,
    cursorCharacter = '|',
    className = ''
}) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [loopNum, setLoopNum] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        const handleTyping = () => {
            const i = loopNum % text.length;
            const fullText = text[i];

            if (isPaused) {
                if (!isDeleting && displayedText === fullText) {
                    setTimeout(() => {
                        setIsPaused(false);
                        setIsDeleting(true);
                    }, pauseDuration);
                    return;
                } else if (isDeleting && displayedText === '') {
                    setIsPaused(false);
                    setIsDeleting(false);
                    setLoopNum(loopNum + 1);
                    return;
                }
            }

            setDisplayedText(prev =>
                isDeleting
                    ? fullText.substring(0, prev.length - 1)
                    : fullText.substring(0, prev.length + 1)
            );

            if (!isDeleting && displayedText === fullText) {
                setIsPaused(true);
            } else if (isDeleting && displayedText === '') {
                setIsPaused(true); // Short pause before typing next
            }
        };

        const timer = setTimeout(handleTyping, isPaused ? 100 : (isDeleting ? deletingSpeed : typingSpeed));
        return () => clearTimeout(timer);
    }, [displayedText, isDeleting, isPaused, loopNum, text, typingSpeed, deletingSpeed, pauseDuration]);

    return (
        <span className={className}>
            {displayedText}
            {showCursor && <span className="animate-pulse text-indigo-600">{cursorCharacter}</span>}
        </span>
    );
};

export default TextType;
