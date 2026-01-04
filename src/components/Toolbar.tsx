import React from 'react';
import { Sparkles, Square, Bomb as BombIcon, Eraser, ShieldOff, Move } from 'lucide-react';
import type { ToolType, Player } from '../types';
import clsx from 'clsx';

interface ToolbarProps {
    selectedTool: ToolType;
    onSelectTool: (tool: ToolType) => void;
    turn: Player;
    isLocked?: boolean;
    hasOpponentBombs?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ selectedTool, onSelectTool, turn, isLocked = false, hasOpponentBombs = false }) => {
    const isRed = turn === 'RED';

    // Theme colors
    const activeColor = isRed ? "bg-red-600 border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)]" : "bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.5)]";
    const inactiveColor = "bg-gray-800 border-gray-600 hover:bg-gray-700";
    const disabledColor = "bg-gray-900 border-gray-800 opacity-50 cursor-not-allowed grayscale";

    const ToolButton = ({ tool, icon: Icon, label, isDisabledOverride }: { tool: ToolType, icon: any, label: string, isDisabledOverride?: boolean }) => {
        const isActive = selectedTool === tool;
        const isDisabled = isLocked && !isActive || isDisabledOverride;

        return (
            <button
                onClick={() => !isDisabled && onSelectTool(tool)}
                disabled={isDisabled}
                className={clsx(
                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 w-24 h-24",
                    isActive ? activeColor : (isDisabled ? disabledColor : inactiveColor)
                )}
            >
                <Icon size={32} className="mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </button>
        );
    };

    return (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-900/50 rounded-2xl border border-gray-800 backdrop-blur-sm">
            <ToolButton tool="MIRROR" icon={Sparkles} label="Mirror" />
            <ToolButton tool="WALL" icon={Square} label="Wall" />
            <ToolButton tool="BOMB" icon={BombIcon} label="Bomb" />
            <ToolButton tool="ERASER" icon={Eraser} label="Eraser" />
            <ToolButton tool="DEFUSE" icon={ShieldOff} label="Defuse" isDisabledOverride={!hasOpponentBombs} />
            <ToolButton tool="MOVE" icon={Move} label="Move" />
        </div>
    );
};
