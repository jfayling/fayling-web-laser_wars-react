import React, { useRef, useEffect } from 'react';
import type { RecordedMove } from '../types';
import { clsx } from 'clsx';

interface MoveListProps {
    moves: RecordedMove[];
    title: string;
    className?: string;
    isRed: boolean;
    fillHeight?: boolean;
}

export const MoveList: React.FC<MoveListProps> = ({ moves, title, className, isRed, fillHeight }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when moves update
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [moves]);

    return (
        <div className={clsx("flex flex-col w-full max-w-xs", fillHeight && "h-full min-h-0", className)}>
            <div className={clsx(
                "text-xs font-bold uppercase tracking-widest mb-2 px-1",
                isRed ? "text-red-400" : "text-blue-400"
            )}>
                {title}
            </div>

            <div
                ref={scrollRef}
                className={clsx(
                    "rounded-xl border overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1 shadow-inner",
                    "bg-gray-900/80 backdrop-blur-sm",
                    fillHeight ? "flex-1 min-h-0 h-full" : "h-32",
                    isRed
                        ? "border-red-900/30 scrollbar-track-red-950/50 scrollbar-thumb-red-900/50"
                        : "border-blue-900/30 scrollbar-track-blue-950/50 scrollbar-thumb-blue-900/50"
                )}
            >
                {moves.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-700 text-xs italic">
                        No moves yet
                    </div>
                ) : (
                    moves.map((move, index) => (
                        <div
                            key={move.id}
                            className={clsx(
                                "flex items-center justify-between p-2 rounded text-xs animate-in slide-in-from-left-2 duration-300",
                                "border border-transparent hover:border-white/5",
                                isRed ? "bg-red-950/20 text-red-100" : "bg-blue-950/20 text-blue-100",
                                // Highlight the most recent move significantly
                                index === moves.length - 1 && (isRed ? "bg-red-900/40 font-bold border-red-500/30" : "bg-blue-900/40 font-bold border-blue-500/30")
                            )}
                        >
                            <div className="flex flex-col">
                                <span className="opacity-90 tracking-wide font-mono">
                                    {move.actionType === 'PASS' ? 'SKIP' : move.actionType.replace('MIRROR_', 'MIRROR ')}
                                </span>
                                {move.details && move.details !== 'TERMINAL_ACTION' && !move.details.startsWith('FROM') && (
                                    <span className="text-[10px] opacity-60 truncate max-w-[120px]">{move.details}</span>
                                )}
                            </div>

                            <div className="flex flex-col items-end gap-0.5">
                                {move.x !== -1 && (
                                    <span className="font-mono opacity-60 bg-black/30 px-1 rounded">
                                        {move.x},{move.y}
                                    </span>
                                )}
                                <span className="text-[9px] opacity-40">
                                    #{move.moveIndex + 1}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
