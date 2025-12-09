import React from 'react';

const Star = ({ fillPercent }) => {
    return (
        <div className="relative inline-block w-4 h-4 mr-0.5">
            {/* Background/Empty Star - Light Gray */}
            <svg
                className="w-full h-full text-gray-300 absolute inset-0" // slightly lighter gray for empty state
                fill="currentColor"
                viewBox="0 0 24 24"
            >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>

            {/* Filled Star - Accent Color (Amber/Yellow) */}
            <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercent}%` }}
            >
                <svg
                    className="w-full h-full text-amber-400" // Nice star color
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            </div>
        </div>
    );
};

const ReviewSummary = ({ avg = 0, count = 0 }) => {
    // Ensure we have valid numbers
    const safeAvg = Number(avg) || 0;
    const safeCount = Number(count) || 0;

    return (
        <div className="flex items-center mt-2 group cursor-help" title={`Average rating: ${safeAvg.toFixed(1)} / 5 — ${safeCount} reviewers`}>
            <div className="flex items-center" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => {
                    // compute fill for star i: fully filled if (i+1) <= avg, else 0, else partial
                    // Logic:
                    // if rating is 3.5:
                    // i=0 (star 1): 3.5 - 0 = 3.5 -> min(100, 350) -> 100%
                    // i=1 (star 2): 3.5 - 1 = 2.5 -> min(100, 250) -> 100%
                    // i=2 (star 3): 3.5 - 2 = 1.5 -> min(100, 150) -> 100% -- WAIT, this logic is slightly off usually.
                    // Correct logic:
                    // Star 1 (index 0) represents 0-1 range. Fill is (avg - 0) clamped 0-1.

                    const fillVal = Math.max(0, Math.min(1, safeAvg - i));
                    const fillPercent = fillVal * 100;

                    return (
                        <Star key={i} fillPercent={fillPercent} />
                    );
                })}
            </div>

            <span className="ml-2 text-xs font-semibold text-white/90">
                {safeAvg > 0 ? safeAvg.toFixed(1) : '—'}
            </span>
            <span className="ml-1.5 text-xs text-white/70">
                • {safeCount} {safeCount === 1 ? 'reviewer' : 'reviewers'}
            </span>
        </div>
    );
};

export default ReviewSummary;
