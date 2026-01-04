import type { Cell, Player, ToolType } from '../types';
import { calculateLaserPath } from './laserLogic';
import AI_CONFIG from './aiConfig.json';

// --- Types ---

export interface AiMove {
    x: number;
    y: number;
    tool: ToolType;
    score?: number;
}

interface AIState {
    grid: Cell[][];
    currentTurn: Player;
}

// --- Entry Point ---

export const calculateAiMove = (grid: Cell[][], aiPlayer: Player, difficulty: 'Easy' | 'Medium' | 'Hard' = 'Hard'): AiMove | null => {
    const maxDepth = AI_CONFIG.depths[difficulty];

    // Construct initial state
    const rootState: AIState = {
        grid: cloneGrid(grid),
        currentTurn: aiPlayer
    };

    return findBestMoveAlphaBeta(rootState, maxDepth, aiPlayer);
};

// --- Alpha-Beta Search ---

const findBestMoveAlphaBeta = (rootState: AIState, maxDepth: number, aiPlayer: Player): AiMove | null => {
    const moves = generateMoves(rootState);
    if (moves.length === 0) return null;

    let bestMove: AiMove | null = null;
    let alpha = -Infinity;
    let beta = Infinity;
    let maxVal = -Infinity;

    for (const move of moves) {
        const nextState = applyMoveAndResolve(rootState, move);
        const val = alphaBeta(nextState, maxDepth - 1, alpha, beta, false, aiPlayer);

        if (val > maxVal) {
            maxVal = val;
            bestMove = move;
        }

        alpha = Math.max(alpha, val);
    }

    return bestMove;
};

const alphaBeta = (state: AIState, depth: number, alpha: number, beta: number, isMaximizing: boolean, rootPlayer: Player): number => {
    // 1. Check Terminal Conditions / Leaf
    const terminalScore = evaluateTerminal(state, rootPlayer);
    if (terminalScore !== null) {
        return terminalScore;
    }

    if (depth === 0) {
        return evaluateHeuristic(state, rootPlayer);
    }

    const moves = generateMoves(state);
    if (moves.length === 0) {
        return evaluateHeuristic(state, rootPlayer);
    }

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const nextState = applyMoveAndResolve(state, move);
            const evalScore = alphaBeta(nextState, depth - 1, alpha, beta, false, rootPlayer);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const nextState = applyMoveAndResolve(state, move);
            const evalScore = alphaBeta(nextState, depth - 1, alpha, beta, true, rootPlayer);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
};

// --- Move Generation ---

const generateMoves = (state: AIState): AiMove[] => {
    const validMoves: AiMove[] = [];
    const { grid, currentTurn } = state;
    const boardSize = grid.length;

    let sourceX = -1;
    let sourceY = -1;

    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            const cell = grid[y][x];

            if (cell.content === 'SOURCE' && cell.owner === currentTurn) {
                sourceX = x;
                sourceY = y;
            }

            if (cell.content === 'EMPTY') {
                validMoves.push({ x, y, tool: 'MIRROR' });
                validMoves.push({ x, y, tool: 'BOMB' });
            }
            else if (cell.owner === currentTurn && (cell.content === 'MIRROR_A' || cell.content === 'MIRROR_B')) {
                validMoves.push({ x, y, tool: 'MIRROR' });
            }
            else if (cell.content === 'BOMB' && cell.owner !== currentTurn) {
                validMoves.push({ x, y, tool: 'DEFUSE' });
            }
        }
    }

    if (sourceX !== -1 && sourceY !== -1) {
        const directions = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: -1, dy: -1 }, { dx: -1, dy: 1 },
            { dx: 1, dy: -1 }, { dx: 1, dy: 1 }
        ];

        for (const dir of directions) {
            const newX = sourceX + dir.dx;
            const newY = sourceY + dir.dy;
            if (newX >= 0 && newX < boardSize && newY >= 0 && newY < boardSize) {
                if (grid[newY][newX].content === 'EMPTY') {
                    validMoves.push({ x: newX, y: newY, tool: 'MOVE' });
                }
            }
        }
    }

    return validMoves.sort((a, b) => {
        if (a.tool === 'DEFUSE' && b.tool !== 'DEFUSE') return -1;
        if (b.tool === 'DEFUSE' && a.tool !== 'DEFUSE') return 1;

        if (a.tool === 'MOVE' && b.tool !== 'MOVE') return 1;
        if (b.tool === 'MOVE' && a.tool !== 'MOVE') return -1;

        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
    });
};

// --- State Transition ---

const applyMoveAndResolve = (state: AIState, move: AiMove): AIState => {
    const nextGrid = cloneGrid(state.grid);
    const player = state.currentTurn;
    const opponent: Player = player === 'RED' ? 'BLUE' : 'RED';

    if (move.tool === 'MIRROR') {
        const cell = nextGrid[move.y][move.x];
        if (cell.content === 'EMPTY') {
            cell.content = 'MIRROR_A';
            cell.owner = player;
        } else if (cell.content === 'MIRROR_A') {
            cell.content = 'MIRROR_B';
        } else if (cell.content === 'MIRROR_B') {
            cell.content = 'EMPTY';
            cell.owner = null;
        }
    } else if (move.tool === 'BOMB') {
        const cell = nextGrid[move.y][move.x];
        cell.content = 'BOMB';
        cell.owner = player;
    } else if (move.tool === 'DEFUSE') {
        const cell = nextGrid[move.y][move.x];
        if (cell.content === 'BOMB') {
            cell.content = 'EMPTY';
            cell.owner = null;
        }
        return {
            grid: nextGrid,
            currentTurn: opponent
        };
    } else if (move.tool === 'MOVE') {
        let sX = -1, sY = -1;
        for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
            if (nextGrid[y][x].content === 'SOURCE' && nextGrid[y][x].owner === player) {
                sX = x; sY = y; break;
            }
        }
        if (sX !== -1) {
            const sCell = nextGrid[sY][sX];
            const tCell = nextGrid[move.y][move.x];
            tCell.content = sCell.content;
            tCell.owner = sCell.owner;
            sCell.content = 'EMPTY';
            sCell.owner = null;
        }
    }

    const { hit, hitType, path } = calculateLaserPath(nextGrid, player);

    if (hit) {
        if (hitType === 'BOMB') {
            const bombPos = path[path.length - 1];
            applyBlast(nextGrid, bombPos.x, bombPos.y);
        }
    }

    return {
        grid: nextGrid,
        currentTurn: opponent
    };
};

const applyBlast = (grid: Cell[][], bombX: number, bombY: number) => {
    const boardSize = grid.length;
    for (let by = bombY - 1; by <= bombY + 1; by++) {
        for (let bx = bombX - 1; bx <= bombX + 1; bx++) {
            if (bx >= 0 && bx < boardSize && by >= 0 && by < boardSize) {
                const cell = grid[by][bx];
                if (cell.content !== 'EMPTY') {
                    cell.content = 'EMPTY';
                    cell.owner = null;
                }
            }
        }
    }
};

// --- Evaluation ---

const evaluateTerminal = (state: AIState, rootPlayer: Player): number | null => {
    const { grid } = state;
    let redSource = false;
    let blueSource = false;

    for (let row of grid) {
        for (let cell of row) {
            if (cell.content === 'SOURCE') {
                if (cell.owner === 'RED') redSource = true;
                if (cell.owner === 'BLUE') blueSource = true;
            }
        }
    }

    const amRed = rootPlayer === 'RED';
    const mySource = amRed ? redSource : blueSource;
    const enemySource = amRed ? blueSource : redSource;

    if (!mySource && !enemySource) return AI_CONFIG.scores.DRAW;
    if (!mySource) return AI_CONFIG.scores.LOSS;
    if (!enemySource) return AI_CONFIG.scores.WIN;

    return null;
};

const evaluateHeuristic = (state: AIState, rootPlayer: Player): number => {
    let score = 0;
    const { grid } = state;
    const boardSize = grid.length;

    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            const cell = grid[y][x];
            if (cell.content === 'EMPTY') continue;

            const isMe = cell.owner === rootPlayer;
            const value = isMe ? 1 : -1;

            if (cell.content === 'MIRROR_A' || cell.content === 'MIRROR_B') {
                score += (AI_CONFIG.scores.MATERIAL_MIRROR * value);
            } else if (cell.content === 'BOMB') {
                score += (AI_CONFIG.scores.MATERIAL_BOMB * value);
            }
        }
    }

    let mySourcePos = { x: -1, y: -1 };

    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            const c = grid[y][x];
            if (c.content === 'SOURCE') {
                if (c.owner === rootPlayer) mySourcePos = { x, y };
            }
        }
    }

    if (mySourcePos.x !== -1) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = mySourcePos.x + dx;
                const ny = mySourcePos.y + dy;
                if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
                    const c = grid[ny][nx];
                    if (c.content === 'BOMB' && c.owner !== rootPlayer) {
                        score += AI_CONFIG.scores.THREAT_BOMB_NEAR_SOURCE;
                    }
                }
            }
        }
    }

    return score;
};

// --- Helpers ---

const cloneGrid = (grid: Cell[][]): Cell[][] => {
    return grid.map(row => row.map(cell => ({ ...cell })));
};
