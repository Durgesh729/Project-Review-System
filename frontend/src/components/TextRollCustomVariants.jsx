import React from 'react';
import { TextRoll } from './core/text-roll';

export function TextRollCustomVariants() {
    const [key, setKey] = React.useState(0);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setKey(prev => prev + 1);
        }, 4000); // Loop every 4 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <TextRoll
            key={key}
            className='text-2xl md:text-3xl font-bold text-white mb-4'
            variants={{
                enter: {
                    initial: { rotateX: 90, filter: 'blur(4px)', opacity: 0, y: 20 },
                    animate: { rotateX: 0, filter: 'blur(0px)', opacity: 1, y: 0 },
                },
                exit: {
                    animate: { rotateX: -90, filter: 'blur(4px)', opacity: 0, y: -20 }
                }
            }}
        >
            Ready to Transform Your Projects?
        </TextRoll>
    );
}
