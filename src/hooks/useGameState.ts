import { useState, useCallback, useEffect } from 'react';
import type { GameState, Cell, Player, CellContent, ToolType } from '../types';
import { calculateLaserPath } from '../logic/laserLogic';

const BOARD_SIZE = 10;

const createInitialGrid = (): Cell[][] => {
    const grid: Cell[][] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        const row: Cell[] = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            let content: CellContent = 'EMPTY';
            let owner: Player | null = null;

            // Setup Scenarios (Basic)
            if (x === 0 && y === 0) {
                content = 'SOURCE';
                owner = 'BLUE';
            } else if (x === BOARD_SIZE - 1 && y === BOARD_SIZE - 1) {
                content = 'SOURCE';
                owner = 'RED';
            }

            // Initial Walls
            if (x === 0 && y === 1) {
                content = 'WALL';
                owner = 'BLUE';
            } else if (x === BOARD_SIZE - 1 && y === 8) {
                content = 'WALL';
                owner = 'RED';
            }

            row.push({ x, y, content, owner });
        }
        grid.push(row);
    }
    return grid;
};

export const useGameState = (
    playExplosionSound?: () => void,
    playWallHitSound?: () => void
) => {
    const [gameState, setGameState] = useState<GameState>({
        grid: createInitialGrid(),
        turn: 'BLUE', // Blue starts
        isFiring: false,
        winner: null,
        laserPath: [],
        activeCell: null
    });

    const [selectedTool, setSelectedTool] = useState<ToolType>('MIRROR');

    const calculateValidMoves = (grid: Cell[][], x: number, y: number, player: Player): { x: number, y: number }[] => {
        const moves: { x: number, y: number }[] = [];
        const directions = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: -1, dy: -1 }, { dx: -1, dy: 1 },
            { dx: 1, dy: -1 }, { dx: 1, dy: 1 }
        ];

        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;

            if (newX >= 0 && newX < BOARD_SIZE && newY >= 0 && newY < BOARD_SIZE) {
                const cell = grid[newY][newX];
                // Can move to EMPTY or owned territory if empty content?
                // Rule: "not blocked". Usually implies Empty.
                // Assuming can move to any Empty cell.
                // Also, typically can't move onto other pieces unless they are pickupable, but here we just check for blocking.
                if (cell.content === 'EMPTY') {
                    moves.push({ x: newX, y: newY });
                }
            }
        }
        return moves;
    };

    const handleCellClick = useCallback((x: number, y: number, toolOverride?: ToolType) => {
        setGameState(prev => {
            if (prev.winner || prev.isFiring) return prev;

            // If we have an active cell, we can ONLY interact with that cell.
            if (prev.activeCell && (prev.activeCell.x !== x || prev.activeCell.y !== y)) {
                // EXCEPTION: If we are in MOVE mode (moveStartPos set), we can click valid moves
                if (prev.moveStartPos) {
                    // Check if clicked cell is a valid move
                    const isValidMove = prev.validMoves?.some(m => m.x === x && m.y === y);
                    if (isValidMove) {
                        // Execute Move
                        const newGrid = prev.grid.map(row => row.map(c => ({ ...c })));
                        const oldPos = prev.moveStartPos;
                        const newPos = { x, y };

                        // Clear old pos
                        // Assuming Source was at oldPos. We need to find the Source for current player to be sure?
                        // Actually, better to just move the content from oldPos to newPos.
                        // But wait, if we are mid-move, the Source is STILL at old Pos visually?
                        // Or did we already move it?
                        // Use case:
                        // 1. Click Source with Move tool. -> Highlight moves. (Source still there)
                        // 2. Click target. -> Move Source to target.
                        //    - Set activeCell = target (so we can lock or undo).
                        //    - Set moveStartPos = oldPos.

                        // Wait, my logic below in "handleCellClick" was based on tool selection.

                        // Let's refine the flow in the main block.
                    } else {
                        // Clicked invalid move while moving?
                        // Maybe just return?
                        return prev;
                    }
                } else {
                    return prev;
                }
            }

            const newGrid = prev.grid.map(row => row.map(cell => ({ ...cell })));
            const cell = newGrid[y][x];

            const currentTool = toolOverride || selectedTool;
            let nextTurn = prev.turn;
            let newActiveCell = prev.activeCell;
            let newValidMoves: { x: number, y: number }[] | undefined = undefined;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            let newMoveStartPos = prev.moveStartPos;

            // If we are modifying a cell (creating a new active cell or editing existing active)
            const isModifyingActive = prev.activeCell && prev.activeCell.x === x && prev.activeCell.y === y;
            const isStartingNewMove = !prev.activeCell;

            // --- MOVE TOOL LOGIC ---
            if (currentTool === 'MOVE') {
                if (!prev.moveStartPos) {
                    if (cell.content === 'SOURCE' && cell.owner === prev.turn) {
                        newValidMoves = calculateValidMoves(newGrid, x, y, prev.turn);
                        return {
                            ...prev,
                            validMoves: newValidMoves,
                            moveStartPos: { x, y }
                        };
                    }
                }
                else {
                    const isTargetValid = prev.validMoves?.some(m => m.x === x && m.y === y);

                    if (prev.moveStartPos.x === x && prev.moveStartPos.y === y) {
                        return {
                            ...prev,
                            validMoves: undefined,
                            moveStartPos: null
                        };
                    }

                    if (isTargetValid) {
                        const sourceCell = newGrid[prev.moveStartPos.y][prev.moveStartPos.x];
                        const targetCell = newGrid[y][x];

                        targetCell.content = sourceCell.content;
                        targetCell.owner = sourceCell.owner;

                        sourceCell.content = 'EMPTY';
                        sourceCell.owner = null;

                        newActiveCell = { x, y };
                        newValidMoves = [prev.moveStartPos];

                        return {
                            ...prev,
                            grid: newGrid,
                            activeCell: newActiveCell,
                            validMoves: newValidMoves,
                            moveStartPos: prev.moveStartPos
                        };
                    }
                }

                // If attempting to click elsewhere while moving, do nothing (or return prev if strict)
                if (prev.moveStartPos) return prev;
            }

            // Normal Tool Logic
            if (prev.moveStartPos && currentTool !== 'MOVE') return prev;

            // Check ownership and modify
            if (cell.owner !== null && cell.owner !== prev.turn && currentTool !== 'DEFUSE') return prev;
            if (cell.content === 'SOURCE' || cell.content === 'BLOCK') return prev;

            if (currentTool === 'MIRROR') {
                if (cell.content === 'EMPTY') {
                    cell.content = 'MIRROR_A';
                    cell.owner = prev.turn;
                    if (isStartingNewMove) newActiveCell = { x, y };
                } else if (cell.content === 'MIRROR_A') {
                    cell.content = 'MIRROR_B';
                    if (isStartingNewMove) newActiveCell = { x, y };
                } else if (cell.content === 'MIRROR_B') {
                    cell.content = 'EMPTY';
                    cell.owner = null;
                    if (isModifyingActive) newActiveCell = null;
                } else if (cell.content === 'WALL' || cell.content === 'BOMB') {
                    cell.content = 'MIRROR_A';
                    cell.owner = prev.turn;
                    if (isStartingNewMove) newActiveCell = { x, y };
                }
            } else if (currentTool === 'WALL') {
                if (cell.content === 'WALL') {
                    cell.content = 'EMPTY';
                    cell.owner = null;
                    if (isModifyingActive) newActiveCell = null;
                } else {
                    cell.content = 'WALL';
                    cell.owner = prev.turn;
                    if (isStartingNewMove) newActiveCell = { x, y };
                }
            } else if (currentTool === 'BOMB') {
                if (cell.content === 'BOMB') {
                    cell.content = 'EMPTY';
                    cell.owner = null;
                    if (isModifyingActive) newActiveCell = null;
                } else {
                    cell.content = 'BOMB';
                    cell.owner = prev.turn;
                    if (isStartingNewMove) newActiveCell = { x, y };
                }
            } else if (currentTool === 'ERASER') {
                if (cell.owner === prev.turn) {
                    cell.content = 'EMPTY';
                    cell.owner = null;
                    if (isModifyingActive) newActiveCell = null;
                    else {
                        nextTurn = prev.turn === 'BLUE' ? 'RED' : 'BLUE';
                        newActiveCell = null;
                    }
                }
            } else if (currentTool === 'DEFUSE') {
                const opponent = prev.turn === 'BLUE' ? 'RED' : 'BLUE';
                if (cell.content === 'BOMB' && cell.owner === opponent) {
                    cell.content = 'EMPTY';
                    cell.owner = null;
                    nextTurn = prev.turn === 'BLUE' ? 'RED' : 'BLUE';
                    newActiveCell = null;
                }
            }

            return {
                ...prev,
                grid: newGrid,
                laserPath: [],
                turn: nextTurn,
                activeCell: newActiveCell
            };
        });
    }, [selectedTool]);

    const explodeBomb = (grid: Cell[][], bombX: number, bombY: number): Player | null => {
        let detectedWinner: Player | null = null;
        // Destroy 3x3 area
        for (let y = bombY - 1; y <= bombY + 1; y++) {
            for (let x = bombX - 1; x <= bombX + 1; x++) {
                if (y >= 0 && y < BOARD_SIZE && x >= 0 && x < BOARD_SIZE) {
                    const cell = grid[y][x];

                    if (cell.content === 'SOURCE') {
                        // If a source is hit, the OWNER of that source LOSES.
                        // So the OTHER player wins.
                        if (cell.owner === 'BLUE') detectedWinner = 'RED';
                        else if (cell.owner === 'RED') detectedWinner = 'BLUE';

                        // Destroy the source visually
                        cell.content = 'EMPTY';
                        cell.owner = null;
                    } else if (cell.content !== 'BLOCK') {
                        // Destroy everything else except impervious blocks
                        cell.content = 'EMPTY';
                        cell.owner = null;
                    }
                }
            }
        }
        return detectedWinner;
    };

    const fireLaser = useCallback(() => {
        setGameState(prev => {
            if (prev.isFiring || prev.winner) return prev;

            const { path, hit, hitType } = calculateLaserPath(prev.grid, prev.turn);

            let winner: Player | null = prev.winner;
            let newGrid = prev.grid;

            if (hit) {
                if (hitType === 'SOURCE') {
                    winner = prev.turn;
                } else if (hitType === 'SELF') {
                    winner = prev.turn === 'BLUE' ? 'RED' : 'BLUE';
                } else if (hitType === 'WALL') {
                    if (playWallHitSound) playWallHitSound();
                } else if (hitType === 'BOMB') {
                    // EXPLOSION LOGIC
                    if (playExplosionSound) playExplosionSound();

                    // Clone grid for mutation
                    newGrid = prev.grid.map(row => row.map(cell => ({ ...cell })));

                    // Find bomb coordinates (last point in path)
                    const hitPoint = path[path.length - 1];
                    const explosionWinner = explodeBomb(newGrid, hitPoint.x, hitPoint.y);

                    if (explosionWinner) {
                        winner = explosionWinner;
                    }
                }
            }

            return {
                ...prev,
                grid: newGrid,
                isFiring: true,
                laserPath: path,
                winner: winner
            };
        });

        setTimeout(() => {
            setGameState(current => {
                if (current.winner) return current;

                return {
                    ...current,
                    isFiring: false,
                    turn: current.turn === 'BLUE' ? 'RED' : 'BLUE',
                    laserPath: [],
                    activeCell: null,
                    validMoves: undefined,
                    moveStartPos: null
                };
            });
        }, 2000);

    }, [playExplosionSound, playWallHitSound]);

    // Auto-select Source when MOVe tool is active
    useEffect(() => {
        if (selectedTool === 'MOVE' && !gameState.moveStartPos && !gameState.winner && !gameState.isFiring) {
            // Find Source
            let sourceX = -1;
            let sourceY = -1;
            for (let y = 0; y < BOARD_SIZE; y++) {
                for (let x = 0; x < BOARD_SIZE; x++) {
                    const cell = gameState.grid[y][x];
                    if (cell.content === 'SOURCE' && cell.owner === gameState.turn) {
                        sourceX = x;
                        sourceY = y;
                        break;
                    }
                }
            }

            if (sourceX !== -1) {
                const moves = calculateValidMoves(gameState.grid, sourceX, sourceY, gameState.turn);
                setGameState(prev => ({
                    ...prev,
                    moveStartPos: { x: sourceX, y: sourceY },
                    validMoves: moves
                }));
            }
        } else if (selectedTool !== 'MOVE' && gameState.moveStartPos) {
            // If we switched tools (and haven't committed a move that locked the tool), clear move state.
            // Note: If we moved, activeCell is set. The top level logic prevents tool switching usually?
            // Actually Toolbar doesn't prevent switching, but handleCellClick checks tool.

            // If activeCell is set (meaning we moved), we might be locked.
            if (!gameState.activeCell) {
                setGameState(prev => ({
                    ...prev,
                    moveStartPos: null,
                    validMoves: undefined
                }));
            }
        }
    }, [selectedTool, gameState.turn, gameState.winner, gameState.isFiring /*, gameState.grid - careful with loops */]);
    // Note: We don't include gameState.grid in dependency to avoid loop if we set state inside.
    // However, if grid changes (e.g. removed source? unlikely), we might need to update.
    // But turn change handles reset.

    return {
        gameState,
        handleCellClick,
        fireLaser,
        selectedTool,
        setSelectedTool
    };
};
