import React from 'react';
import type { Point } from '../logic/laserLogic';

interface LaserOverlayProps {
    path: Point[];
    color: string; // e.g., 'red' or 'blue'
}

export const LaserOverlay: React.FC<LaserOverlayProps> = ({ path, color }) => {
    if (path.length === 0) return null;

    // Convert logical coordinates to SVG coordinates (center of cells)
    const pointsString = path.map(p => `${p.x + 0.5},${p.y + 0.5}`).join(' ');

    // Determine Stroke Color based on prop
    const strokeColor = color === 'BLUE' ? '#3b82f6' : '#ef4444'; // Tailwind blue-500 : red-500

    return (
        <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 10 10"
            xmlns="http://www.w3.org/2000/svg"
        >
            <polyline
                points={pointsString}
                fill="none"
                stroke={strokeColor}
                strokeWidth="0.12"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] filter"
            >
                <animate
                    attributeName="stroke-dasharray"
                    from="0, 100"
                    to="100, 0"
                    dur="1s"
                    fill="freeze"
                />
            </polyline>

            {/* Glow effect duplicate */}
            <polyline
                points={pointsString}
                fill="none"
                stroke={strokeColor}
                strokeWidth="0.05"
                strokeOpacity="0.5"
                className="blur-[0.5px]"
            />
        </svg>
    );
};
