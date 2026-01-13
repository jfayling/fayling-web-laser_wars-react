import React from 'react';
import { SkipBack, ChevronLeft, ChevronRight, SkipForward, Copy } from 'lucide-react';
import type { RecordedMove } from '../types';

interface PlaybackControlsProps {
    currentMoveIndex: number;
    totalMoves: number;
    canStepForward: boolean;
    canStepBackward: boolean;
    onStepForward: () => void;
    onStepBackward: () => void;
    onJumpToStart: () => void;
    onJumpToEnd: () => void;
    currentMove: RecordedMove | null;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
    currentMoveIndex,
    totalMoves,
    canStepForward,
    canStepBackward,
    onStepForward,
    onStepBackward,
    onJumpToStart,
    onJumpToEnd,
    currentMove
}) => {
    const formatActionType = (action: string) => {
        return action.replace(/_/g, ' ');
    };

    const formatCoordinates = (x: number, y: number) => {
        if (x === -1 || y === -1) return 'N/A';
        return `(${x}, ${y})`;
    };

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
            {/* Move Counter */}
            <div className="text-center">
                <div className="text-2xl font-bold text-white">
                    Move {currentMove ? currentMove.moveIndex + 1 : currentMoveIndex + 1} / {totalMoves}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                    {currentMoveIndex === -1 ? 'Initial State' : `Viewing move ${currentMove ? currentMove.moveIndex + 1 : currentMoveIndex + 1}`}
                </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-2">
                <button
                    onClick={onJumpToStart}
                    disabled={!canStepBackward}
                    className="p-3 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 hover:border-gray-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:border-gray-600"
                    title="Jump to Start"
                >
                    <SkipBack size={24} className="text-blue-400" />
                </button>

                <button
                    onClick={onStepBackward}
                    disabled={!canStepBackward}
                    className="p-3 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 hover:border-gray-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:border-gray-600"
                    title="Previous Move"
                >
                    <ChevronLeft size={24} className="text-blue-400" />
                </button>

                <button
                    onClick={onStepForward}
                    disabled={!canStepForward}
                    className="p-3 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 hover:border-gray-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:border-gray-600"
                    title="Next Move"
                >
                    <ChevronRight size={24} className="text-blue-400" />
                </button>

                <button
                    onClick={onJumpToEnd}
                    disabled={!canStepForward}
                    className="p-3 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 hover:border-gray-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:border-gray-600"
                    title="Jump to End"
                >
                    <SkipForward size={24} className="text-blue-400" />
                </button>
            </div>

            {/* Current Move Details */}
            {currentMove && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
                    <div className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                        Current Move Details
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-gray-500">Player:</span>
                            <span className={`ml-2 font-bold ${currentMove.turn === 'BLUE' ? 'text-blue-400' : 'text-red-500'}`}>
                                {currentMove.turn}
                            </span>
                        </div>

                        <div>
                            <span className="text-gray-500">ID:</span>
                            <button
                                onClick={() => currentMove.id && navigator.clipboard.writeText(currentMove.id)}
                                className="ml-2 flex items-center gap-1 text-gray-400 hover:text-white transition-colors group font-mono text-xs"
                                title="Click to copy ID"
                                disabled={!currentMove.id}
                            >
                                {currentMove.id ? currentMove.id.slice(0, 8) : 'N/A'}
                                {currentMove.id && <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </button>
                        </div>

                        <div>
                            <span className="text-gray-500">Action:</span>
                            <span className="ml-2 text-white font-semibold">
                                {formatActionType(currentMove.actionType)}
                            </span>
                        </div>

                        <div>
                            <span className="text-gray-500">Position:</span>
                            <span className="ml-2 text-white">
                                {formatCoordinates(currentMove.x, currentMove.y)}
                            </span>
                        </div>

                        {currentMove.details && (
                            <div className="col-span-2">
                                <span className="text-gray-500">Details:</span>
                                <span className="ml-2 text-white">
                                    {currentMove.details}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* AI Reasoning */}
                    {currentMove.aiReasoning && (
                        <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                            <div className="text-sm font-semibold text-purple-400 uppercase tracking-wide">
                                AI Reasoning
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-500">Chosen Score:</span>
                                    <span className="ml-2 text-white font-mono">
                                        {currentMove.aiReasoning.chosenMoveScore.toFixed(2)}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-gray-500">Search Depth:</span>
                                    <span className="ml-2 text-white">
                                        {currentMove.aiReasoning.searchDepth}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-gray-500">Moves Considered:</span>
                                    <span className="ml-2 text-white">
                                        {currentMove.aiReasoning.totalMovesConsidered}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-gray-500">Loop Detected:</span>
                                    <span className={`ml-2 font-semibold ${currentMove.aiReasoning.loopDetected ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {currentMove.aiReasoning.loopDetected ? 'YES' : 'NO'}
                                    </span>
                                </div>

                                {currentMove.aiReasoning.panicMode && (
                                    <div className="col-span-2">
                                        <span className="text-yellow-400 font-semibold">⚠ PANIC MODE ACTIVE</span>
                                    </div>
                                )}
                            </div>

                            {/* Evaluation Breakdown */}
                            {currentMove.aiReasoning.evaluationBreakdown && (
                                <div className="mt-2 pt-2 border-t border-gray-700">
                                    <div className="text-xs text-gray-500 mb-1">Evaluation Breakdown:</div>
                                    <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                                        <div>Material: <span className="text-white">{currentMove.aiReasoning.evaluationBreakdown.materialScore}</span></div>
                                        <div>Laser Path: <span className="text-white">{currentMove.aiReasoning.evaluationBreakdown.laserPathScore}</span></div>
                                        <div>Position: <span className="text-white">{currentMove.aiReasoning.evaluationBreakdown.positionScore}</span></div>
                                        <div>Threat: <span className="text-white">{currentMove.aiReasoning.evaluationBreakdown.threatScore}</span></div>
                                        <div className="col-span-2 font-bold">Total: <span className="text-blue-400">{currentMove.aiReasoning.evaluationBreakdown.totalScore}</span></div>
                                    </div>
                                </div>
                            )}

                            {/* Alternative Moves */}
                            {currentMove.aiReasoning.alternativeMoves && currentMove.aiReasoning.alternativeMoves.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-700">
                                    <div className="text-xs text-gray-500 mb-1">Top Alternatives:</div>
                                    <div className="space-y-1">
                                        {currentMove.aiReasoning.alternativeMoves.slice(0, 3).map((alt, idx) => (
                                            <div key={idx} className="text-xs">
                                                <span className="text-gray-400">#{idx + 1}:</span>
                                                <span className="ml-1 text-white">{formatActionType(alt.tool)}</span>
                                                <span className="ml-1 text-gray-500">at ({alt.x}, {alt.y})</span>
                                                <span className="ml-1 text-blue-400 font-mono">score: {alt.score.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
