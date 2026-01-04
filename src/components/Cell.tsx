import React from 'react';
import type { Cell as CellType } from '../types';
import { Shield, Circle } from 'lucide-react';
import clsx from 'clsx';

interface CellProps {
    cell: CellType;
    isValidMove?: boolean;
    onClick: () => void;
}

export const Cell: React.FC<CellProps> = ({ cell, onClick, isValidMove }) => {
    const isRed = cell.owner === 'RED';
    const isBlue = cell.owner === 'BLUE';

    return (
        <div
            onClick={onClick}
            className={clsx(
                "w-full h-full border border-gray-800 flex items-center justify-center cursor-pointer transition-colors duration-200",
                "hover:bg-gray-800/50",
                {
                    "bg-red-900/20 border-red-800/50": isRed,
                    "bg-blue-900/20 border-blue-800/50": isBlue,
                    "bg-green-500/20 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]": isValidMove
                }
            )}
        >
            {cell.content === 'MIRROR_A' && (
                // / Mirror (Bottom-Left to Top-Right)
                <div className={clsx("w-3/4 h-1 rounded-full rotate-45", isRed ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]")} />
            )}
            {cell.content === 'MIRROR_B' && (
                // \ Mirror (Top-Left to Bottom-Right)
                <div className={clsx("w-3/4 h-1 rounded-full -rotate-45", isRed ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]")} />
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
                <Circle size={24} className={clsx("fill-current", isRed ? "text-red-500" : "text-blue-500")} />
            )}
        </div>
    );
};
