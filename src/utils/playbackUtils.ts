import type { GameState, Cell, RecordedMove, GameSession, Player, Direction } from '../types';

const BOARD_SIZE = 10;

/**
 * Create the initial game grid
 */
export const createInitialGrid = (): Cell[][] => {
    const grid: Cell[][] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        const row: Cell[] = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            let content: import('../types').CellContent = 'EMPTY';
            let owner: Player | null = null;

            // Setup initial positions (same as useGameState)
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

            row.push({
                x,
                y,
                content,
                owner,
                orientation: (content === 'SOURCE' && owner === 'BLUE') ? 'RIGHT' :
                    (content === 'SOURCE' && owner === 'RED') ? 'LEFT' : undefined
            });
        }
        grid.push(row);
    }
    return grid;
};

/**
 * Validate that uploaded data matches GameSession schema
 */
export const validateTrainingFile = (data: unknown): GameSession => {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid training file: not an object');
    }

    const session = data as Partial<GameSession>;

    if (!session.moves || !Array.isArray(session.moves)) {
        throw new Error('Invalid training file: missing or invalid moves array');
    }

    if (!session.mode || (session.mode !== 'PVP' && session.mode !== 'PVE')) {
        throw new Error('Invalid training file: invalid game mode');
    }

    return session as GameSession;
};

/**
 * Apply a single recorded move to the game state
 */
export const applyMove = (gameState: GameState, move: RecordedMove): GameState => {
    const newGrid = gameState.grid.map(row => row.map(cell => ({ ...cell })));
    const { x, y, actionType } = move;

    // Handle PASS - no changes to grid
    if (actionType === 'PASS' || x === -1 || y === -1) {
        return {
            ...gameState,
            turn: gameState.turn === 'BLUE' ? 'RED' : 'BLUE'
        };
    }

    const cell = newGrid[y][x];
    const currentPlayer = move.turn;

    switch (actionType) {
        case 'MIRROR':
            // Determine which mirror type based on details
            if (move.details === 'MIRROR_A') {
                cell.content = 'MIRROR_A';
            } else if (move.details === 'MIRROR_B') {
                cell.content = 'MIRROR_B';
            } else {
                // Default to MIRROR_A if not specified
                cell.content = 'MIRROR_A';
            }
            cell.owner = currentPlayer;
            break;

        case 'WALL':
            cell.content = 'WALL';
            cell.owner = currentPlayer;
            break;

        case 'BOMB':
            // Check if it's an offensive bomb (terminal action)
            if (move.details === 'TERMINAL_ACTION') {
                // Offensive bomb - destroy opponent's piece
                cell.content = 'EMPTY';
                cell.owner = null;
            } else {
                // Defensive bomb
                cell.content = 'BOMB';
                cell.owner = currentPlayer;
            }
            break;

        case 'DEFUSE':
            // Remove opponent's bomb
            cell.content = 'EMPTY';
            cell.owner = null;
            break;

        case 'ERASER':
            cell.content = 'EMPTY';
            cell.owner = null;
            break;

        case 'MOVE':
            // Extract source coordinates from details if available
            if (move.details?.startsWith('FROM_')) {
                const parts = move.details.split('_');
                if (parts.length === 3) {
                    const fromX = parseInt(parts[1]);
                    const fromY = parseInt(parts[2]);
                    const sourceCell = newGrid[fromY][fromX];

                    // Move the source
                    cell.content = sourceCell.content;
                    cell.owner = sourceCell.owner;
                    cell.orientation = sourceCell.orientation;

                    sourceCell.content = 'EMPTY';
                    sourceCell.owner = null;
                    sourceCell.orientation = undefined;
                }
            }
            break;

        case 'ROTATE_LEFT':
        case 'ROTATE_RIGHT':
            // Find the source and rotate it
            for (let row of newGrid) {
                for (let c of row) {
                    if (c.content === 'SOURCE' && c.owner === currentPlayer) {
                        const dirs: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
                        const currentIdx = dirs.indexOf(c.orientation || (currentPlayer === 'BLUE' ? 'RIGHT' : 'LEFT'));

                        let newIdx;
                        if (actionType === 'ROTATE_RIGHT') {
                            newIdx = (currentIdx + 1) % 4;
                        } else {
                            newIdx = (currentIdx - 1 + 4) % 4;
                        }

                        c.orientation = dirs[newIdx];
                        break;
                    }
                }
            }
            break;
    }

    // Check if this is a terminal action that doesn't switch turns
    const isTerminalAction = move.details === 'TERMINAL_ACTION';

    return {
        ...gameState,
        grid: newGrid,
        turn: isTerminalAction ? (gameState.turn === 'BLUE' ? 'RED' : 'BLUE') : gameState.turn,
        activeCell: null,
        laserPath: []
    };
};

/**
 * Reconstruct game state at a specific move index by replaying all moves from the start
 */
export const reconstructGameState = (moves: RecordedMove[], targetIndex: number): GameState => {
    let gameState: GameState = {
        grid: createInitialGrid(),
        turn: 'BLUE',
        isFiring: false,
        winner: null,
        laserPath: [],
        activeCell: null
    };

    // Replay moves up to and including targetIndex
    for (let i = 0; i <= targetIndex && i < moves.length; i++) {
        gameState = applyMove(gameState, moves[i]);
    }

    return gameState;
};
