import type { Cell, Player, ToolType } from '../types';
import { calculateLaserPath } from './laserLogic';

interface AiMove {
    x: number;
    y: number;
    tool: ToolType;
}

export const calculateAiMove = (grid: Cell[][], aiPlayer: Player): AiMove | null => {
    // 1. Identify valid moves
    const validMoves: AiMove[] = [];
    const boardSize = grid.length;

    let aiSourceX = -1;
    let aiSourceY = -1;

    // Find AI Source for defensive calculations
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            const cell = grid[y][x];
            if (cell.content === 'SOURCE' && cell.owner === aiPlayer) {
                aiSourceX = x;
                aiSourceY = y;
            }

            // Interaction: Place Mirror or Bomb in Empty
            if (cell.content === 'EMPTY') {
                validMoves.push({ x, y, tool: 'MIRROR' });
                validMoves.push({ x, y, tool: 'BOMB' });
                // Also could place Wall?
                // validMoves.push({ x, y, tool: 'WALL' });
            }
            // Interaction: Rotate Mirror
            else if (cell.owner === aiPlayer && (cell.content === 'MIRROR_A' || cell.content === 'MIRROR_B')) {
                validMoves.push({ x, y, tool: 'MIRROR' });
            }
            // Interaction: Defuse Enemy Bomb
            else if (cell.content === 'BOMB' && cell.owner !== aiPlayer) {
                validMoves.push({ x, y, tool: 'DEFUSE' });
            }
        }
    }

    // Interaction: Move Source
    if (aiSourceX !== -1 && aiSourceY !== -1) {
        const directions = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: -1, dy: -1 }, { dx: -1, dy: 1 },
            { dx: 1, dy: -1 }, { dx: 1, dy: 1 }
        ];

        for (const dir of directions) {
            const newX = aiSourceX + dir.dx;
            const newY = aiSourceY + dir.dy;

            if (newX >= 0 && newX < boardSize && newY >= 0 && newY < boardSize) {
                if (grid[newY][newX].content === 'EMPTY') {
                    validMoves.push({ x: newX, y: newY, tool: 'MOVE' });
                }
            }
        }
    }

    if (validMoves.length === 0) return null;

    // 2. Evaluate Moves
    // We need to simulate the move, fire the laser, and check the outcome.

    let bestMove: AiMove | null = null;
    let bestScore = -Infinity;

    for (const move of validMoves) {
        // Validation: Defuse logic is simple (no laser sim needed usually, but we need to weigh it)
        if (move.tool === 'DEFUSE') {
            // Heuristic: Defusing is generally good if we are not winning immediately.
            // It prevents potential future threats. 
            // Score: 50 (Better than neutral 0, worse than Win 1000)
            let score = 50;

            // Critical Threat Detection: Is this bomb near our Source?
            if (aiSourceX !== -1) {
                const distShapeX = Math.abs(move.x - aiSourceX);
                const distShapeY = Math.abs(move.y - aiSourceY);
                // Bomb radius is 1 (3x3 area). If dist <= 1, it hits us.
                if (distShapeX <= 1 && distShapeY <= 1) {
                    score = 900; // CRITICAL: Save the King!
                }
            }

            // Random jitter
            score += Math.random();

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
            continue;
        }

        // Clone grid
        const simulatedGrid = grid.map(row => row.map(c => ({ ...c })));
        const cell = simulatedGrid[move.y][move.x];

        // Apply Move Logic (Simplified version of useGameState logic)
        if (move.tool === 'MIRROR') {
            if (cell.content === 'EMPTY') {
                cell.content = 'MIRROR_A';
                cell.owner = aiPlayer;
            } else if (cell.content === 'MIRROR_A') {
                cell.content = 'MIRROR_B';
            } else if (cell.content === 'MIRROR_B') {
                // In simulation, let's assume we cycle to empty implies removing it, which is rarely good?
                // Or we just stick to rotating. 
                // If we rotate B -> Empty, that is a 'remove'.
                cell.content = 'EMPTY';
                cell.owner = null;
            }
        } else if (move.tool === 'BOMB') {
            cell.content = 'BOMB';
            cell.owner = aiPlayer;
        } else if (move.tool === 'MOVE') {
            // Simulate Move
            // We know AI source pos is aiSourceX, aiSourceY.
            // Target is move.x, move.y
            const sourceCell = simulatedGrid[aiSourceY][aiSourceX];
            const targetCell = simulatedGrid[move.y][move.x];

            targetCell.content = sourceCell.content;
            targetCell.owner = sourceCell.owner;

            sourceCell.content = 'EMPTY';
            sourceCell.owner = null;
        }

        // Fire Laser Simulation
        const { hit, hitType, path } = calculateLaserPath(simulatedGrid, aiPlayer);

        let score = 0;
        if (hit) {
            if (hitType === 'SOURCE') {
                score += 1000; // WIN
            } else if (hitType === 'SELF') {
                score -= 1000; // LOSE
            } else if (hitType === 'WALL') {
                // Hitting a wall is neutral/bad?
                score -= 10;
            } else if (hitType === 'BOMB') {
                // Bomb Exploded!
                // calculate impact
                // The hit position is the last point in the path
                const bombPos = path[path.length - 1]; // Should be the bomb location
                const blastScore = calculateBlastScore(simulatedGrid, bombPos.x, bombPos.y, aiPlayer);
                score += blastScore;
            }
        } else {
            // Miss. 
            // Maybe prefer moves that create longer paths? Or get closer to enemy source?
            // Distance heuristic?
            score += 0; // Neutral
        }

        // Penalize Moving if it doesn't improve score significantly (Laziness)
        if (move.tool === 'MOVE') {
            score -= 5; // Slight penalty to discourage random walking
        }

        // Random jitter to avoid predictable ties
        score += Math.random();

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
};

// Helper: Calculate score based on bomb explosion
const calculateBlastScore = (grid: Cell[][], bombX: number, bombY: number, aiPlayer: Player): number => {
    let score = 0;
    const boardSize = grid.length;

    // 3x3 blast area
    for (let by = bombY - 1; by <= bombY + 1; by++) {
        for (let bx = bombX - 1; bx <= bombX + 1; bx++) {
            if (bx >= 0 && bx < boardSize && by >= 0 && by < boardSize) {
                const target = grid[by][bx];
                if (target.content === 'SOURCE') {
                    if (target.owner !== aiPlayer) {
                        score += 1000; // Destroyed Enemy Source (WIN)
                    } else {
                        score -= 1000; // Destroyed Own Source (LOSE)
                    }
                } else if (target.content === 'MIRROR_A' || target.content === 'MIRROR_B' || target.content === 'WALL' || target.content === 'BOMB') {
                    if (target.owner === aiPlayer) {
                        score -= 10; // Lost own piece
                    } else if (target.owner) {
                        score += 10; // Destroyed enemy piece
                    }
                }
            }
        }
    }
    return score;
};
