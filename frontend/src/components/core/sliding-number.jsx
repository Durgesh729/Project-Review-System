import React from 'react';

export function SlidingNumber({ value }) {
    return (
        <span>{Math.floor(value)}</span>
    );
}
