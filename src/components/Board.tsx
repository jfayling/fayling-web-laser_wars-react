import React from 'react';
import type { GameState } from '../types';
import { Cell } from './Cell';
import { LaserOverlay } from './LaserOverlay';

interface BoardProps {
    gameState: GameState;
    onCellClick: (x: number, y: number) => void;
}

export const Board: React.FC<BoardProps> = ({ gameState, onCellClick }) => {
    return (
        <div className="relative p-4 bg-gray-900 rounded-xl shadow-2xl border border-gray-700">
            <div
                className="grid gap-1 relative z-0"
                style={{
                    gridTemplateColumns: `repeat(10, minmax(0, 1fr))`,
                    width: 'min(80vw, 600px)',
                    aspectRatio: '1/1',
                }}
            >
                {gameState.grid.flatMap((row, y) =>
                    row.map((cell, x) => {
                        const isValidMove = gameState.validMoves?.some(m => m.x === x && m.y === y);
                        return (
                            <Cell
                                key={`${x}-${y}`}
                                cell={cell}
                                onClick={() => onCellClick(x, y)}
                                isValidMove={isValidMove}
                            />
                        );
                    })
                )}

                {/* Laser Overlay */}
                <div className="absolute inset-0 pointer-events-none z-20">
                    <LaserOverlay path={gameState.laserPath} color={gameState.turn} />
                </div>
            </div>
        </div>
    );
};
