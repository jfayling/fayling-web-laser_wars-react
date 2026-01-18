import type { Cell, Player, ToolType, Direction, RecordedMove } from '../types';
import { calculateLaserPath } from './laserLogic';
import AI_CONFIG from './aiConfig.json';
import { DebugState } from './debugState';

// AI Engine Version - increment this whenever AI logic changes
export const AI_ENGINE_VERSION = '1.3.0';

export interface AiMove {
    x: number;
    y: number;
    tool: ToolType;
    score?: number;
    details?: string;
    reasoning?: import('../types').AIDecisionReason;
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

    // If we've performed this action at this location 1+ times recently, it's a loop (for offensive moves)
    // We want to force variety, so even doing it ONCE recently is enough to ban it for a short time
    // UNLESS it's a critical defensive DEFUSE (handled above)
    if (aiActionCount >= 1) {
        console.log(`[AI-LOOP-DETECTION] Detected ${actionType} loop at (${x},${y}). Count: ${aiActionCount}`);
        return true;
    }

    return false;
};

/**
 * Detects if the AI is engaging in repetitive action types (e.g. constant bombing).
 * Returns true if the last 4 moves by this AI were all of actionType.
 */
const detectRepetitiveAction = (moveHistory: RecordedMove[], aiPlayer: Player, actionType: ToolType): boolean => {
    // Need at least 2 previous moves by me (implies at least 3-4 total moves) to detect a pattern of 3?
    // Let's settle on: If last 2 moves by ME were ACTION, and I'm about to do it again (total 3), that's repetitive.
    // Actually, user compliant was "always used a BOMB".
    // So if last move was BOMB, and I want to BOMB again?
    // Let's try: If last 2 AI moves were BOMB.

    let aiMoveCount = 0;
    let consecutiveMatch = 0;

    // Scan backwards
    for (let i = moveHistory.length - 1; i >= 0; i--) {
        const move = moveHistory[i];
        if (move.turn === aiPlayer) {
            aiMoveCount++;
            if (move.actionType === actionType) {
                consecutiveMatch++;
            } else {
                break; // Sequence broken
            }
        }
        if (aiMoveCount >= 2) break; // Check last 2 moves
    }

    // If last 2 moves were this action, we are entering repetitive territory
    return consecutiveMatch >= 2;
};

// --- Alpha-Beta Search ---

const findBestMoveAlphaBeta = (rootState: AIState, maxDepth: number, aiPlayer: Player, moveHistory: RecordedMove[] = []): AiMove | null => {
    const startTime = performance.now();
    const moves = generateMoves(rootState);
    if (moves.length === 0) return null;

    // Check for repetitive bombing
    const isRepetitiveBombing = detectRepetitiveAction(moveHistory, aiPlayer, 'BOMB');
    if (isRepetitiveBombing) {
        console.log(`[AI-LOOP-DETECTION] Repetitive BOMBing detected. Applying penalty.`);
    }

    let bestMoves: AiMove[] = [];
    let alpha = -Infinity;
    let beta = Infinity;
    let maxVal = -Infinity;

    // Track all moves with their scores for reasoning
    const allMovesWithScores: Array<{ move: AiMove; score: number }> = [];

    for (const move of moves) {
        const nextState = applyMoveAndResolve(rootState, move);

        let val = alphaBeta(nextState, maxDepth - 1, alpha, beta, false, aiPlayer);

        // Apply repetitive penalty at the root level logic
        if (move.tool === 'BOMB' && isRepetitiveBombing) {
            val += AI_CONFIG.scores.REPETITIVE_BOMB_PENALTY;
            if (DebugState.enabled) console.log(`[AI-TRACE] Applied Repetitive Bomb Penalty to move at (${move.x},${move.y}). New score: ${val}`);
        }

        // Store move with score
        allMovesWithScores.push({ move, score: val });
        if (val > maxVal) {
            maxVal = val;
            bestMoves = [move];
        } else if (val === maxVal) {
            bestMoves.push(move);
        }

        if (alpha < val) {
            alpha = val;
        }

        // Optimization: Early exit if we found the best possible outcome (Immediate Win)
        // Max possible score is WIN + (maxDepth - 1) because we are at root, examining immediate children (depth 1 away from root? No, moves result in depth maxDepth-1)
        // If maxDepth is 3. Child state is at depth 2 (passed to alphaBeta).
        // If Child returns WIN + 2. That is max possible.
        const maxPossibleScore = AI_CONFIG.scores.WIN + (maxDepth - 1);
        if (alpha >= maxPossibleScore) {
            console.log(`[AI-OPTIMIZATION] Found max possible score (${alpha}). Early exit.`);
            break;
        }

        // Debug Critical Moves

    }

    // Panic Mode: If we are threatened, and we didn't find a winning move, force DEFUSE if available.
    const rootScore = evaluateHeuristic(rootState, aiPlayer);
    // Updated threshold to catch both THREAT_BOMB_NEAR_SOURCE (-5000) and THREAT_LASER_BOMB_SUICIDE (-10000)
    const isThreatened = rootScore <= -2000;
    const isWinning = maxVal >= AI_CONFIG.scores.WIN - 1000;
    let panicMode = false;

    if (isThreatened && !isWinning) {
        const defuseMove = moves.find(m => m.tool === 'DEFUSE');
        if (defuseMove) {
            // Check if this would create a loop
            const wouldLoop = detectActionLoop(moveHistory, aiPlayer, 'DEFUSE', defuseMove.x, defuseMove.y, rootState.grid);
            if (!wouldLoop) {
                console.log(`[AI-PANIC] Threat detected! Defusing at (${defuseMove.x},${defuseMove.y})`);
                panicMode = true;

                // Build reasoning for panic mode defuse
                const evaluationBreakdown = getEvaluationBreakdown(rootState, aiPlayer);
                const topAlternatives = allMovesWithScores
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5)
                    .map(({ move, score }) => ({
                        x: move.x,
                        y: move.y,
                        tool: move.tool,
                        score,
                        details: move.details
                    }));

                defuseMove.reasoning = {
                    chosenMoveScore: maxVal,
                    alternativeMoves: topAlternatives,
                    evaluationBreakdown,
                    loopDetected: false,
                    panicMode: true,
                    searchDepth: maxDepth,
                    totalMovesConsidered: moves.length,
                    thinkingTime: performance.now() - startTime
                };

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
    let loopDetected = false;

    if (filteredBestMoves.length === 0) {
        console.log(`[AI-FILTER] All best moves were loops! Selecting from all non-looping moves instead.`);
        loopDetected = true;
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

    // Build reasoning for the selected move
    const evaluationBreakdown = getEvaluationBreakdown(rootState, aiPlayer);
    const topAlternatives = allMovesWithScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ move, score }) => ({
            x: move.x,
            y: move.y,
            tool: move.tool,
            score,
            details: move.details
        }));

    selectedMove.reasoning = {
        chosenMoveScore: maxVal,
        alternativeMoves: topAlternatives,
        evaluationBreakdown,
        loopDetected,
        panicMode,
        searchDepth: maxDepth,
        totalMovesConsidered: moves.length,
        thinkingTime: performance.now() - startTime
    };

    return selectedMove;
};

const alphaBeta = (state: AIState, depth: number, alpha: number, beta: number, isMaximizing: boolean, rootPlayer: Player): number => {
    // 1. Check Terminal Conditions / Leaf
    const terminalScore = evaluateTerminal(state, rootPlayer);
    if (terminalScore !== null) {
        // Prefer faster wins (higher remaining depth)
        if (terminalScore > 0) {
            return terminalScore + depth;
        }
        // Prefer slower losses (lower remaining depth for the loss means it's further away? No, depth decreases as we go down)
        // Root is maxDepth. Leaves are 0.
        // If we find a loss at depth 2 (close to root), we want to avoid it MORE than a loss at depth 0.
        // We want to MAXIMIZE the score.
        // Loss at depth 2: -1M - 2 = -1000002
        // Loss at depth 0: -1M - 0 = -1000000
        // -1000000 > -1000002, so we prefer the delayed loss.
        if (terminalScore < 0) {
            return terminalScore - depth;
        }
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
            if (beta < alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;

        for (const move of moves) {

            const nextState = applyMoveAndResolve(state, move);



            const evalScore = alphaBeta(nextState, depth - 1, alpha, beta, true, rootPlayer);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta < alpha) break;
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

    // Find Enemy Source for sorting
    const opponent = currentTurn === 'RED' ? 'BLUE' : 'RED';
    let enemySourceX = -1;
    let enemySourceY = -1;
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (grid[y][x].content === 'SOURCE' && grid[y][x].owner === opponent) {
                enemySourceX = x;
                enemySourceY = y;
                // Don't break here if we want to support multiple sources? 
                // AI currently assumes 1, so break is fine.
                break;
            }
        }
        if (enemySourceX !== -1) break;
    }

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
        // 1. DEFUSE is highest priority (Self-preservation)
        if (a.tool === 'DEFUSE' && b.tool !== 'DEFUSE') return -1;
        if (b.tool === 'DEFUSE' && a.tool !== 'DEFUSE') return 1;

        // 2. Offensive BOMB (High impact / Potential Win)
        // Offensive bomb targeting occupied cell? We don't have that info easily here without looking at grid again or checking details?
        // Actually generateMoves doesn't explicitly flag "offensive" in the Move object, but we can verify against grid if needed OR
        // just prioritize ALL Bombs over Mirrors?
        // Offensive bombs are critical. Random bombs are less so.
        // Let's refine: We can detect offensive by checking if the target cell is NOT empty in the current state.
        const aIsOffensive = grid[a.y][a.x].content !== 'EMPTY';
        const bIsOffensive = grid[b.y][b.x].content !== 'EMPTY';

        if (aIsOffensive && !bIsOffensive) return -1;
        if (bIsOffensive && !aIsOffensive) return 1;

        // 3. Prefer Actions over MOVE (usually)
        if (a.tool === 'MOVE' && b.tool !== 'MOVE') return 1;
        if (b.tool === 'MOVE' && a.tool !== 'MOVE') return -1;

        // 4. Sort by proximity to Enemy Source
        // We want to check moves closer to the enemy first (likely attacks)
        if (enemySourceX !== -1) {
            const distA = Math.abs(a.x - enemySourceX) + Math.abs(a.y - enemySourceY);
            const distB = Math.abs(b.x - enemySourceX) + Math.abs(b.y - enemySourceY);
            // If significant difference, sort by distance
            if (distA !== distB) return distA - distB;
        }

        // 5. Sort by coordinate (y, then x)
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

    // CRITICAL FIX: Check BOTH players' laser paths after the move
    // This ensures we detect when the opponent creates a configuration that causes
    // the AI's laser to hit its own source or other critical scenarios

    // Check if we should skip laser simulation for this move
    // No-fire actions: WALL, BOMB (Placement), ROTATE
    let skipLaser = false;

    // Check for specific tools that don't fire laser
    if (move.tool === 'WALL' || move.tool === 'ROTATE_LEFT' || move.tool === 'ROTATE_RIGHT' || move.tool === 'MOVE') {
        skipLaser = true;
    } else if (move.tool === 'BOMB') {
        // Only skip if it's a placement (checked by seeing if we returned early for offensive bomb above)
        // If we are here, it is a placement bomb (non-offensive) or we would have returned.
        // Wait, offensive bomb check is on lines 466-472 and returns early.
        // So if we are here and tool is BOMB, it's a placement.
        skipLaser = true;
    }

    if (!skipLaser) {
        // Check current player's laser
        const { hit, hitType, path } = calculateLaserPath(nextGrid, player);
        if (hit) {
            if (hitType === 'BOMB') {
                const bombPos = path[path.length - 1];
                applyBlast(nextGrid, bombPos.x, bombPos.y);
            } else if (hitType === 'SOURCE') {
                // Hit Enemy Source - Destroy it!
                const targetPos = path[path.length - 1];
                // Only destroy if it's actually a source (sanity check)
                if (nextGrid[targetPos.y][targetPos.x].content === 'SOURCE') {
                    if (DebugState.enabled) console.log(`[AI-TRACE] DIRECT HIT on ENEMY SOURCE at (${targetPos.x},${targetPos.y})`);
                    nextGrid[targetPos.y][targetPos.x].content = 'EMPTY';
                    nextGrid[targetPos.y][targetPos.x].owner = null;
                }
            } else if (hitType === 'SELF') {
                // Hit Own Source (Suicide) - Destroy it!
                const targetPos = path[path.length - 1];
                if (nextGrid[targetPos.y][targetPos.x].content === 'SOURCE') {
                    if (DebugState.enabled) console.log(`[AI-TRACE] SUICIDE HIT on OWN SOURCE at (${targetPos.x},${targetPos.y})`);
                    nextGrid[targetPos.y][targetPos.x].content = 'EMPTY';
                    nextGrid[targetPos.y][targetPos.x].owner = null;
                }
            }
        }
    }

    return {
        grid: nextGrid,
        currentTurn: opponent
    };
};

const applyBlast = (grid: Cell[][], bombX: number, bombY: number, explodedBombs: Set<string> = new Set()) => {
    const key = `${bombX},${bombY}`;
    if (explodedBombs.has(key)) return;
    explodedBombs.add(key);

    if (DebugState.enabled) console.log(`[AI-TRACE] applyBlast called at ${bombX},${bombY}`);
    const boardSize = grid.length;

    for (let by = bombY - 1; by <= bombY + 1; by++) {
        for (let bx = bombX - 1; bx <= bombX + 1; bx++) {
            if (bx >= 0 && bx < boardSize && by >= 0 && by < boardSize) {
                const cell = grid[by][bx];

                if (cell.content === 'BOMB' && !explodedBombs.has(`${bx},${by}`)) {
                    applyBlast(grid, bx, by, explodedBombs);
                }

                if (cell.content !== 'EMPTY' && cell.content !== 'BLOCK') {
                    if (bx === 9 && by === 9) {
                        // console.log(`[AI-TRACE] BLAST HIT (9,9)! Destroying ${cell.content}`);
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
const evaluateLaserPath = (grid: Cell[][], player: Player, laserResult: any): number => {
    let score = 0;

    // Use pre-calculated laser path
    const { hit, hitType, path } = laserResult;

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

    // HIT SOURCE check removed - handled by evaluateTerminal (Winning is the ultimate reward)
    // If we add points here, we risk overvaluing "hitting" without "destroying".

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

/**
 * Detects if the AI's laser will hit an opponent's bomb that could destroy its source.
 * This is a critical defensive check - if the AI's laser hits an opponent's bomb,
 * the bomb explodes in a 3x3 area, potentially destroying the AI's source.
 * 
 * Returns a large negative score if such a threat is detected.
 */
const detectLaserBombThreat = (grid: Cell[][], player: Player, laserResult: any): number => {
    let score = 0;

    // Use pre-calculated laser path
    const { hit, hitType, path } = laserResult;

    // If the laser doesn't hit a bomb, no threat
    if (!hit || hitType !== 'BOMB') {
        return 0;
    }

    // Get the bomb position (last point in the path)
    const bombPos = path[path.length - 1];

    // Find the AI's source position INITIALLY to see if we even have one
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

    if (sourceX === -1) {
        return 0; // No source found (shouldn't happen)
    }

    // SIMULATE THE EXPLOSION
    // We must clone the grid to not affect the actual AI state analysis
    const simGrid = cloneGrid(grid);

    // Apply the blast (recursive)
    applyBlast(simGrid, bombPos.x, bombPos.y);

    // Check if our source survived
    const sourceCell = simGrid[sourceY][sourceX];
    if (sourceCell.content !== 'SOURCE' || sourceCell.owner !== player) {
        if (DebugState.enabled) {
            console.log(`[AI-THREAT] CRITICAL: Laser hit on bomb at (${bombPos.x},${bombPos.y}) triggers chain reaction destroying source at (${sourceX},${sourceY})!`);
        }
        score += AI_CONFIG.scores.THREAT_LASER_BOMB_SUICIDE;
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

const getEvaluationBreakdown = (state: AIState, rootPlayer: Player): import('../types').AIEvaluationBreakdown => {
    const { grid } = state;
    const boardSize = grid.length;

    let materialScore = 0;
    let threatScore = 0;

    // Calculate material score
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            const cell = grid[y][x];
            if (cell.content === 'EMPTY') continue;

            const isMe = cell.owner === rootPlayer;
            const value = isMe ? 1 : -1;

            if (cell.content === 'MIRROR_A' || cell.content === 'MIRROR_B') {
                materialScore += (AI_CONFIG.scores.MATERIAL_MIRROR * value);
            } else if (cell.content === 'BOMB') {
                materialScore += (AI_CONFIG.scores.MATERIAL_BOMB * value);
            }
        }
    }

    // Count AI's bombs and apply spam penalty
    let myBombCount = 0;
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            const cell = grid[y][x];
            if (cell.content === 'BOMB' && cell.owner === rootPlayer) {
                myBombCount++;
            }
        }
    }

    if (myBombCount >= 3) {
        const excessBombs = myBombCount - 2;
        materialScore += AI_CONFIG.scores.BOMB_SPAM_PENALTY * excessBombs;
    }

    // Calculate threat score
    let mySourcePos = { x: -1, y: -1 };
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            const c = grid[y][x];
            if (c.content === 'SOURCE' && c.owner === rootPlayer) {
                mySourcePos = { x, y };
                break;
            }
        }
        if (mySourcePos.x !== -1) break;
    }

    if (mySourcePos.x !== -1) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = mySourcePos.x + dx;
                const ny = mySourcePos.y + dy;
                if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
                    const c = grid[ny][nx];
                    if (c.content === 'BOMB' && c.owner !== rootPlayer) {
                        threatScore += AI_CONFIG.scores.THREAT_BOMB_NEAR_SOURCE;
                    }
                }
            }
        }
    }


    // Calculate laser path once
    const laserResult = calculateLaserPath(grid, rootPlayer);

    const laserPathScore = evaluateLaserPath(grid, rootPlayer, laserResult);
    const positionScore = evaluatePosition(grid, rootPlayer);

    // Add laser-bomb threat detection to threat score
    const laserBombThreatScore = detectLaserBombThreat(grid, rootPlayer, laserResult);
    threatScore += laserBombThreatScore;

    const totalScore = materialScore + threatScore + laserPathScore + positionScore;

    return {
        materialScore,
        laserPathScore,
        positionScore,
        threatScore,
        totalScore
    };
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

    // Count AI's bombs and apply spam penalty
    let myBombCount = 0;
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            const cell = grid[y][x];
            if (cell.content === 'BOMB' && cell.owner === rootPlayer) {
                myBombCount++;
            }
        }
    }

    // Apply escalating penalty for having too many bombs (3+)
    if (myBombCount >= 3) {
        const excessBombs = myBombCount - 2; // Allow 2 bombs without penalty
        score += AI_CONFIG.scores.BOMB_SPAM_PENALTY * excessBombs;
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

    // Calculate laser path once
    const laserResult = calculateLaserPath(grid, rootPlayer);

    // Add laser path effectiveness scoring
    score += evaluateLaserPath(grid, rootPlayer, laserResult);

    // Add positional advantage scoring
    score += evaluatePosition(grid, rootPlayer);

    // CRITICAL: Check if our laser will hit an opponent's bomb that could destroy our source
    score += detectLaserBombThreat(grid, rootPlayer, laserResult);

    return score;
};

// --- Helpers ---

const cloneGrid = (grid: Cell[][]): Cell[][] => {
    return grid.map(row => row.map(cell => ({ ...cell })));
};
