import React from 'react';
import type { Cell as CellType } from '../types';
import { Shield, Circle } from 'lucide-react';
import clsx from 'clsx';

interface CellProps {
    cell: CellType;
    isValidMove?: boolean;
    onClick: () => void;
    isTrainingMode?: boolean;
    x?: number;
    y?: number;
}

export const Cell: React.FC<CellProps> = ({ cell, onClick, isValidMove, isTrainingMode, x, y }) => {
    const isRed = cell.owner === 'RED';
    const isBlue = cell.owner === 'BLUE';

    return (
        <div
            onClick={onClick}
            className={clsx(
                "w-full h-full border border-gray-800 flex items-center justify-center cursor-pointer transition-colors duration-200 relative",
                "hover:bg-gray-800/50",
                {
                    "bg-red-900/20 border-red-800/50": isRed,
                    "bg-blue-900/20 border-blue-800/50": isBlue,
                    "bg-green-500/20 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]": isValidMove
                }
            )}
        >
            {/* Grid coordinates in training mode */}
            {isTrainingMode && x !== undefined && y !== undefined && (
                <div className="absolute top-0.5 left-0.5 text-[8px] font-mono text-gray-500 leading-none pointer-events-none z-10">
                    {x},{y}
                </div>
            )}
            {cell.content === 'MIRROR_A' && cell.owner && (
                // / Mirror (Bottom-Left to Top-Right)
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Main reflective surface */}
                    <div className={clsx(
                        "w-[85%] h-[6px] rounded-full rotate-45 relative",
                        isRed
                            ? "bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-[0_0_15px_rgba(239,68,68,0.9)]"
                            : "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.9)]"
                    )}>
                        {/* Highlight to show reflective surface */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-full" />
                    </div>

                    {/* Direction indicators - small arrows showing reflection path */}
                    <div className="absolute inset-0 rotate-45">
                        {/* Top-right arrow */}
                        <div className="absolute -top-1 -right-1">
                            <svg width="10" height="10" viewBox="0 0 10 10" className={clsx(isRed ? "text-red-400" : "text-blue-400")}>
                                <path d="M5 0 L8 3 L6 3 L6 7 L4 7 L4 3 L2 3 Z" fill="currentColor" opacity="0.6" />
                            </svg>
                        </div>
                        {/* Bottom-left arrow */}
                        <div className="absolute -bottom-1 -left-1 rotate-180">
                            <svg width="10" height="10" viewBox="0 0 10 10" className={clsx(isRed ? "text-red-400" : "text-blue-400")}>
                                <path d="M5 0 L8 3 L6 3 L6 7 L4 7 L4 3 L2 3 Z" fill="currentColor" opacity="0.6" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}
            {cell.content === 'MIRROR_B' && cell.owner && (
                // \ Mirror (Top-Left to Bottom-Right)
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Main reflective surface */}
                    <div className={clsx(
                        "w-[85%] h-[6px] rounded-full -rotate-45 relative",
                        isRed
                            ? "bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-[0_0_15px_rgba(239,68,68,0.9)]"
                            : "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.9)]"
                    )}>
                        {/* Highlight to show reflective surface */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-full" />
                    </div>

                    {/* Direction indicators - small arrows showing reflection path */}
                    <div className="absolute inset-0 -rotate-45">
                        {/* Top-right arrow */}
                        <div className="absolute -top-1 -right-1">
                            <svg width="10" height="10" viewBox="0 0 10 10" className={clsx(isRed ? "text-red-400" : "text-blue-400")}>
                                <path d="M5 0 L8 3 L6 3 L6 7 L4 7 L4 3 L2 3 Z" fill="currentColor" opacity="0.6" />
                            </svg>
                        </div>
                        {/* Bottom-left arrow */}
                        <div className="absolute -bottom-1 -left-1 rotate-180">
                            <svg width="10" height="10" viewBox="0 0 10 10" className={clsx(isRed ? "text-red-400" : "text-blue-400")}>
                                <path d="M5 0 L8 3 L6 3 L6 7 L4 7 L4 3 L2 3 Z" fill="currentColor" opacity="0.6" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}
            {cell.content === 'BLOCK' && (
                <Shield size={24} className="text-gray-500" />
            )}
            {cell.content === 'WALL' && (
                <div className={clsx("w-full h-full border-4", isRed ? "bg-red-900 border-red-500" : (isBlue ? "bg-blue-900 border-blue-500" : "bg-gray-700 border-gray-500"))} />
            )}
            {cell.content === 'BOMB' && (
                <div className={clsx("w-3/4 h-3/4 rounded-full flex items-center justify-center animate-pulse", isRed ? "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]" : "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]")}>
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                </div>
            )}
            {cell.content === 'SOURCE' && (
                <div className="relative flex items-center justify-center">
                    <Circle size={24} className={clsx("fill-current", isRed ? "text-red-500" : "text-blue-500")} />
                    {/* Direction Indicator */}
                    <div
                        className="absolute flex items-center justify-center transition-transform duration-300"
                        style={{
                            transform: `rotate(${cell.orientation === 'RIGHT' ? 90 :
                                cell.orientation === 'DOWN' ? 180 :
                                    cell.orientation === 'LEFT' ? 270 : 0
                                }deg) translateY(-8px)` // Push out from center
                        }}
                    >
                        {/* SVG Triangle */}
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 0L12 10H0L6 0Z" fill="white" />
                        </svg>
                    </div>
                </div>
            )}
        </div>
    );
};
