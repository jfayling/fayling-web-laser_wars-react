import type { Cell, Player, ToolType, Direction, RecordedMove } from '../types';
import { calculateLaserPath } from './laserLogic';
import AI_CONFIG from './aiConfig.json';
import { DebugState } from './debugState';

// AI Engine Version - increment this whenever AI logic changes
export const AI_ENGINE_VERSION = '1.0.0';

export interface AiMove {
    x: number;
    y: number;
    tool: ToolType;
    score?: number;
    details?: string;
}

interface AIState {
    grid: Cell[][];
    currentTurn: Player;
}

// --- Entry Point ---

export const calculateAiMove = (grid: Cell[][], aiPlayer: Player, difficulty: 'Easy' | 'Medium' | 'Hard' = 'Hard', moveHistory: RecordedMove[] = []): AiMove | null => {
    const maxDepth = AI_CONFIG.depths[difficulty];
    console.log(`[AI-TRACE] Initial Grid (1,0): ${grid[0][1].content}`);

    // Construct initial state
    const rootState: AIState = {
        grid: cloneGrid(grid),
        currentTurn: aiPlayer
    };

    return findBestMoveAlphaBeta(rootState, maxDepth, aiPlayer, moveHistory);
};

/**
 * Detects if the AI is stuck in an action loop at a specific location.
 * Returns true if the AI has performed the same action at the same location 2+ times recently
 * with the opponent performing a counter-action in between.
 * 
 * EXCEPTION: DEFUSE actions are allowed to repeat if the bomb is adjacent to the AI's source,
 * as this represents a critical defensive action that should override loop detection.
 * 
 * Examples:
 * - AI places BOMB at (x,y), opponent DEFUSES, AI places BOMB again at (x,y) = loop
 * - AI DEFUSES at (x,y), opponent places BOMB, AI DEFUSES again at (x,y) = loop (unless critical threat)
 */
const detectActionLoop = (moveHistory: RecordedMove[], aiPlayer: Player, actionType: ToolType | 'PASS', x: number, y: number, grid?: Cell[][]): boolean => {
    if (moveHistory.length < 4) return false; // Need at least 4 moves to detect a loop

    // Special handling for DEFUSE: allow if it's a critical defensive action
    if (actionType === 'DEFUSE' && grid) {
        // Check if the bomb at (x,y) is adjacent to the AI's source
        const boardSize = grid.length;
        let sourceX = -1;
        let sourceY = -1;

        // Find AI's source
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                if (grid[y][x].content === 'SOURCE' && grid[y][x].owner === aiPlayer) {
                    sourceX = x;
                    sourceY = y;
                    break;
                }
            }
            if (sourceX !== -1) break;
        }

        // If bomb is adjacent to source (within 1 cell), allow repeated defuse
        if (sourceX !== -1) {
            const distance = Math.max(Math.abs(x - sourceX), Math.abs(y - sourceY));
            if (distance <= 1) {
                console.log(`[AI-LOOP-DETECTION] DEFUSE at (${x},${y}) is adjacent to source at (${sourceX},${sourceY}). Allowing repeated defuse.`);
                return false; // Not a loop - it's a critical defensive action
            }
        }
    }

    // Look at the last 8 moves (4 turns worth)
    const recentMoves = moveHistory.slice(-8);

    // Count how many times AI performed this action at this location
    let aiActionCount = 0;

    for (const move of recentMoves) {
        if (move.turn === aiPlayer && move.actionType === actionType && move.x === x && move.y === y) {
            aiActionCount++;
        }
    }

    // If we've performed this action at this location 2+ times recently, it's likely a loop
    if (aiActionCount >= 2) {
        console.log(`[AI-LOOP-DETECTION] Detected ${actionType} loop at (${x},${y}). Count: ${aiActionCount}`);
        return true;
    }

    return false;
};

// --- Alpha-Beta Search ---

const findBestMoveAlphaBeta = (rootState: AIState, maxDepth: number, aiPlayer: Player, moveHistory: RecordedMove[] = []): AiMove | null => {
    const moves = generateMoves(rootState);
    if (moves.length === 0) return null;

    let bestMoves: AiMove[] = [];
    let alpha = -Infinity;
    let beta = Infinity;
    let maxVal = -Infinity;

    for (const move of moves) {
        if (rootState.grid[0][1].content !== 'EMPTY' && rootState.grid[0][1].content !== undefined) {
            console.log(`[AI-TRACE] CRITICAL: rootState polluted at (1,0)! Content: ${rootState.grid[0][1].content}`);
        }

        if (move.x === 3 && move.y === 9 && move.tool === 'MIRROR') {
            DebugState.enabled = true;
            console.log('--- ENTERING DEBUG MODE FOR MIRROR(3,9) ---');
        }

        const nextState = applyMoveAndResolve(rootState, move);
        const val = alphaBeta(nextState, maxDepth - 1, alpha, beta, false, aiPlayer);

        if (DebugState.enabled && move.x === 3 && move.y === 9) {
            DebugState.enabled = false;
            console.log('--- EXITING DEBUG MODE ---');
        }

        if (val > maxVal) {
            maxVal = val;
            bestMoves = [move];
        } else if (val === maxVal) {
            bestMoves.push(move);
        }

        if (alpha < val) {
            alpha = val;
        }

        // Debug Critical Moves
        if ((move.x === 8 && move.y === 8) || (move.x === 8 && move.y === 0) || (move.x === 3 && move.y === 9)) {
            console.log(`[AI-TRACE] Move ${move.tool}(${move.x},${move.y}) -> Score: ${val}`);
        }
    }

    // Panic Mode: If we are threatened, and we didn't find a winning move, force DEFUSE if available.
    const rootScore = evaluateHeuristic(rootState, aiPlayer);
    const isThreatened = rootScore <= -2000; // Threshold for THREAT_BOMB_NEAR_SOURCE
    const isWinning = maxVal >= AI_CONFIG.scores.WIN - 1000;

    if (isThreatened && !isWinning) {
        const defuseMove = moves.find(m => m.tool === 'DEFUSE');
        if (defuseMove) {
            // Check if this would create a loop
            const wouldLoop = detectActionLoop(moveHistory, aiPlayer, 'DEFUSE', defuseMove.x, defuseMove.y, rootState.grid);
            if (!wouldLoop) {
                console.log(`[AI-PANIC] Threat detected! Defusing at (${defuseMove.x},${defuseMove.y})`);
                return defuseMove;
            } else {
                console.log(`[AI-PANIC] Loop detected! Skipping DEFUSE at (${defuseMove.x},${defuseMove.y}), using alpha-beta result instead.`);
                // Fall through to use the best move from alpha-beta search
            }
        }
    }

    // Filter out any moves that would create a loop from bestMoves
    const filteredBestMoves = bestMoves.filter(move => {
        const wouldLoop = detectActionLoop(moveHistory, aiPlayer, move.tool, move.x, move.y, rootState.grid);
        if (wouldLoop) {
            console.log(`[AI-FILTER] Removing looping ${move.tool} at (${move.x},${move.y}) from best moves`);
            return false;
        }
        return true;
    });

    console.log(`[AI-FILTER] bestMoves count: ${bestMoves.length}, filteredBestMoves count: ${filteredBestMoves.length}`);

    // If we filtered out all best moves (they were all looping moves)
    // Select from ALL available moves, excluding the looping ones
    let finalMoves = filteredBestMoves;
    if (filteredBestMoves.length === 0) {
        console.log(`[AI-FILTER] All best moves were loops! Selecting from all non-looping moves instead.`);
        finalMoves = moves.filter(move => {
            const wouldLoop = detectActionLoop(moveHistory, aiPlayer, move.tool, move.x, move.y, rootState.grid);
            return !wouldLoop;
        });
    }

    if (finalMoves.length > 0) {
        console.log(`[AI-FILTER] Using ${finalMoves.length} moves. First move: ${finalMoves[0].tool} at (${finalMoves[0].x},${finalMoves[0].y})`);
    }

    if (finalMoves.length === 0) return null;
    const selectedMove = finalMoves[Math.floor(Math.random() * finalMoves.length)];
    console.log(`[AI-FILTER] Final selection: ${selectedMove.tool} at (${selectedMove.x},${selectedMove.y})`);
    return selectedMove;
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

            // Debug BOMB 8,8 execution
            if (DebugState.enabled && move.tool === 'BOMB' && move.x === 8 && move.y === 8) {
                const term = evaluateTerminal(nextState, rootPlayer);
                if (term !== null) {
                    console.log(`[AI-TRACE] Executed BOMB(8,8). Terminal Score: ${term}`);
                } else {
                    console.log(`[AI-TRACE] Executed BOMB(8,8). NOT TERMINAL! Heuristic: ${evaluateHeuristic(nextState, rootPlayer)}`);
                }
            }

            const evalScore = alphaBeta(nextState, depth - 1, alpha, beta, false, rootPlayer);

            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta < alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        let blueMoveCount = 0;
        if (DebugState.enabled) {
            console.log(`[AI-TRACE-BLUE] Loop Start. Moves length: ${moves.length}`);
        }
        for (const move of moves) {

            if (DebugState.enabled) {
                console.log(`[AI-TRACE-BLUE] Loop ${blueMoveCount}: ${move.tool}(${move.x},${move.y})`);
                if (move.tool === 'BOMB' && move.x === 8 && move.y === 8) {
                    console.log(`[AI-TRACE-BLUE] !!! FOUND BOMB(8,8) IN LOOP at index ${blueMoveCount} !!!`);
                }
                blueMoveCount++;
            }

            const nextState = applyMoveAndResolve(state, move);

            // Debug BOMB 8,8 execution (Minimizer/Blue)
            if (DebugState.enabled && move.tool === 'BOMB' && move.x === 8 && move.y === 8) {
                const term = evaluateTerminal(nextState, rootPlayer);
                if (term !== null) {
                    console.log(`[AI-TRACE-BLUE] Executed BOMB(8,8). Terminal Score: ${term}`);
                } else {
                    console.log(`[AI-TRACE-BLUE] Executed BOMB(8,8). NOT TERMINAL! Heuristic: ${evaluateHeuristic(nextState, rootPlayer)}`);
                }
            }

            const evalScore = alphaBeta(nextState, depth - 1, alpha, beta, true, rootPlayer);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta < alpha) break;
        }
        if (depth === 2 && DebugState.enabled) {
            console.log(`[AI-TRACE-BLUE] Depth 2 Best Score: ${minEval}`);
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
                validMoves.push({ x, y, tool: 'ROTATE_LEFT' });
                validMoves.push({ x, y, tool: 'ROTATE_RIGHT' });
            }

            if (cell.content === 'EMPTY') {
                validMoves.push({ x, y, tool: 'MIRROR', details: 'MIRROR_A' });
                validMoves.push({ x, y, tool: 'MIRROR', details: 'MIRROR_B' });
                validMoves.push({ x, y, tool: 'BOMB' });
            }
            else if (cell.owner && cell.owner !== currentTurn && (cell.content === 'WALL' || cell.content === 'MIRROR_A' || cell.content === 'MIRROR_B')) {
                validMoves.push({ x, y, tool: 'BOMB' });
            }
            else if (cell.owner === currentTurn && (cell.content === 'MIRROR_A' || cell.content === 'MIRROR_B')) {
                // If we own a mirror, we can rotate it to the OTHER type
                const otherType = cell.content === 'MIRROR_A' ? 'MIRROR_B' : 'MIRROR_A';
                validMoves.push({ x, y, tool: 'MIRROR', details: otherType });
            }
            else if (cell.content === 'BOMB' && cell.owner !== currentTurn) {
                validMoves.push({ x, y, tool: 'DEFUSE' });
            }
        }
    }

    // Debug: Check if BOMB 8,8 is generated
    if (DebugState.enabled && state.currentTurn === 'BLUE') {
        console.log(`[AI-TRACE-GEN] Generating moves for BLUE. Total generated: ${validMoves.length}`);
        const hasBomb88 = validMoves.some(m => m.tool === 'BOMB' && m.x === 8 && m.y === 8);
        if (hasBomb88) {
            console.log(`[AI-TRACE-GEN] BOMB(8,8) IS PRESENT in generated moves.`);
        } else {
            const c88 = grid[8][8];
            console.log(`[AI-TRACE-GEN] BOMB(8,8) NOT PRESENT! Cell(8,8): ${c88.content}, Owner: ${c88.owner}`);
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
    if (DebugState.enabled && (nextGrid[0][1].content !== 'EMPTY' || nextGrid[9][3].content !== 'EMPTY')) {
        console.log(`[AI-TRACE] applyMoveAndResolve START. (1,0): ${nextGrid[0][1].content}, (3,9): ${nextGrid[9][3].content}`);
    }
    const player = state.currentTurn;
    const opponent: Player = player === 'RED' ? 'BLUE' : 'RED';

    if (move.tool === 'MIRROR') {
        const cell = nextGrid[move.y][move.x];
        if (move.details) {
            cell.content = move.details as any;
            cell.owner = player;
        } else {
            // Fallback for safety using simple toggle logic
            if (cell.content === 'EMPTY') {
                cell.content = 'MIRROR_A';
                cell.owner = player;
            } else if (cell.content === 'MIRROR_A') {
                cell.content = 'MIRROR_B';
            } else if (cell.content === 'MIRROR_B') {
                cell.content = 'EMPTY';
                cell.owner = null;
            }
        }
    } else if (move.tool === 'BOMB') {
        const cell = nextGrid[move.y][move.x];
        // Offensive Bomb
        if (cell.owner && cell.owner !== player && (cell.content === 'WALL' || cell.content === 'MIRROR_A' || cell.content === 'MIRROR_B')) {
            cell.content = 'EMPTY';
            cell.owner = null;
            return {
                grid: nextGrid,
                currentTurn: opponent
            };
        }
        // Normal Placement
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
    } else if (move.tool === 'ROTATE_LEFT' || move.tool === 'ROTATE_RIGHT') {
        const cell = nextGrid[move.y][move.x];
        const dirs: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
        const currentIdx = dirs.indexOf(cell.orientation || (player === 'BLUE' ? 'RIGHT' : 'LEFT'));
        let newIdx;
        if (move.tool === 'ROTATE_RIGHT') {
            newIdx = (currentIdx + 1) % 4;
        } else {
            newIdx = (currentIdx - 1 + 4) % 4;
        }
        cell.orientation = dirs[newIdx];
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

    if (DebugState.enabled && nextGrid[0][1].content !== 'EMPTY' && state.grid[0][1].content === 'EMPTY') {
        console.log(`[AI-TRACE] MUTATION DETECTED! (1,0) changed to ${nextGrid[0][1].content}. Move: ${move.tool}(${move.x},${move.y})`);
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
    if (DebugState.enabled) console.log(`[AI-TRACE] applyBlast called at ${bombX},${bombY}`);
    const boardSize = grid.length;
    for (let by = bombY - 1; by <= bombY + 1; by++) {
        for (let bx = bombX - 1; bx <= bombX + 1; bx++) {
            if (bx >= 0 && bx < boardSize && by >= 0 && by < boardSize) {
                const cell = grid[by][bx];
                if (cell.content !== 'EMPTY') {
                    if (bx === 9 && by === 9) {
                        console.log(`[AI-TRACE] BLAST HIT (9,9)! Destroying ${cell.content}`);
                    }
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

// --- Laser Path Evaluation ---

/**
 * Evaluates the effectiveness of the AI's laser path.
 * Returns a score based on:
 * - Whether the laser is blocked
 * - How close the laser gets to the enemy source
 * - Whether the laser has a clear path
 */
const evaluateLaserPath = (grid: Cell[][], player: Player): number => {
    let score = 0;

    // Calculate the laser path for this player
    const { hit, hitType, path } = calculateLaserPath(grid, player);

    // Find enemy source position
    const opponent = player === 'RED' ? 'BLUE' : 'RED';
    let enemySourceX = -1;
    let enemySourceY = -1;

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            if (grid[y][x].content === 'SOURCE' && grid[y][x].owner === opponent) {
                enemySourceX = x;
                enemySourceY = y;
                break;
            }
        }
        if (enemySourceX !== -1) break;
    }

    // Penalize blocked lasers (hits wall or goes off-board)
    if (!hit && hitType === 'WALL') {
        score += AI_CONFIG.scores.LASER_BLOCKED;
    }

    // Reward hitting the enemy source (should be caught by terminal evaluation, but good to reinforce)
    if (hit && hitType === 'SOURCE') {
        score += AI_CONFIG.scores.LASER_NEAR_ENEMY * 5; // Very high bonus
    }

    // Reward laser paths that get close to the enemy source
    if (enemySourceX !== -1 && path.length > 0) {
        const lastPoint = path[path.length - 1];
        const distance = Math.abs(lastPoint.x - enemySourceX) + Math.abs(lastPoint.y - enemySourceY);

        // Closer is better - reward inversely proportional to distance
        if (distance < 5) {
            score += AI_CONFIG.scores.LASER_NEAR_ENEMY * (5 - distance) / 5;
        }

        // Reward longer laser paths (more board coverage)
        if (path.length > 3) {
            score += AI_CONFIG.scores.LASER_CLEAR_PATH;
        }
    }

    return score;
};

// --- Positional Evaluation ---

/**
 * Evaluates the quality of the source position.
 * Returns a score based on:
 * - Distance from center (center control)
 * - Number of adjacent empty cells (mobility)
 * - Distance from edges (safety)
 */
const evaluatePosition = (grid: Cell[][], player: Player): number => {
    let score = 0;

    // Find player's source
    let sourceX = -1;
    let sourceY = -1;

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            if (grid[y][x].content === 'SOURCE' && grid[y][x].owner === player) {
                sourceX = x;
                sourceY = y;
                break;
            }
        }
        if (sourceX !== -1) break;
    }

    if (sourceX === -1) return 0; // No source found

    const boardSize = grid.length;
    const center = boardSize / 2;

    // Center control: reward positions closer to center
    const distanceFromCenter = Math.abs(sourceX - center) + Math.abs(sourceY - center);
    score += AI_CONFIG.scores.CENTER_CONTROL * (1 - distanceFromCenter / (boardSize * 2));

    // Mobility: count adjacent empty cells
    let emptyAdjacent = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = sourceX + dx;
            const ny = sourceY + dy;
            if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
                if (grid[ny][nx].content === 'EMPTY') {
                    emptyAdjacent++;
                }
            }
        }
    }
    score += AI_CONFIG.scores.MOBILITY_PER_CELL * emptyAdjacent;

    // Edge penalty: penalize positions on the edge
    if (sourceX === 0 || sourceX === boardSize - 1 || sourceY === 0 || sourceY === boardSize - 1) {
        score += AI_CONFIG.scores.EDGE_PENALTY;
    }

    return score;
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

    // Add laser path effectiveness scoring
    score += evaluateLaserPath(grid, rootPlayer);

    // Add positional advantage scoring
    score += evaluatePosition(grid, rootPlayer);

    return score;
};

// --- Helpers ---

const cloneGrid = (grid: Cell[][]): Cell[][] => {
    return grid.map(row => row.map(cell => ({ ...cell })));
};
