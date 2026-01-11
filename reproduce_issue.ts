
// Types
type Player = 'RED' | 'BLUE';
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type MirrorType = 'MIRROR_A' | 'MIRROR_B';
type CellContent = MirrorType | 'BLOCK' | 'SOURCE' | 'EMPTY' | 'WALL' | 'BOMB';

interface Cell {
    x: number;
    y: number;
    content: CellContent;
    owner: Player | null;
    orientation?: Direction;
}

interface Point {
    x: number;
    y: number;
}

interface LaserPathResult {
    path: Point[];
    hit: boolean;
    hitType: 'WALL' | 'SOURCE' | 'SELF' | 'BOMB' | null;
}

const BOARD_SIZE = 10;

const createInitialGrid = (): Cell[][] => {
    const grid: Cell[][] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        const row: Cell[] = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            let content: CellContent = 'EMPTY';
            let owner: Player | null = null;

            if (x === 0 && y === 0) {
                content = 'SOURCE';
                owner = 'BLUE';
            } else if (x === BOARD_SIZE - 1 && y === BOARD_SIZE - 1) {
                content = 'SOURCE';
                owner = 'RED';
            }

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

// Logic Copy
const calculateLaserPath = (grid: Cell[][], firingPlayer: Player): LaserPathResult => {
    const path: Point[] = [];
    let startX = -1;
    let startY = -1;
    let direction: Direction = firingPlayer === 'BLUE' ? 'RIGHT' : 'LEFT';

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = grid[y][x];
            if (cell.content === 'SOURCE' && cell.owner === firingPlayer) {
                startX = x;
                startY = y;
                if (cell.orientation) {
                    direction = cell.orientation;
                }
                break;
            }
        }
        if (startX !== -1) break;
    }

    if (startX === -1) return { path: [], hit: false, hitType: null };

    let currentX = startX;
    let currentY = startY;
    path.push({ x: currentX, y: currentY });

    const MAX_STEPS = 100;

    for (let step = 0; step < MAX_STEPS; step++) {
        let nextX = currentX;
        let nextY = currentY;

        if (direction === 'UP') nextY--;
        else if (direction === 'DOWN') nextY++;
        else if (direction === 'LEFT') nextX--;
        else if (direction === 'RIGHT') nextX++;

        if (nextX < 0 || nextX >= BOARD_SIZE || nextY < 0 || nextY >= BOARD_SIZE) {
            path.push({ x: nextX, y: nextY });
            return { path, hit: false, hitType: 'WALL' };
        }

        const cell = grid[nextY][nextX];
        path.push({ x: nextX, y: nextY });

        currentX = nextX;
        currentY = nextY;

        if (cell.content === 'BLOCK' || cell.content === 'WALL') {
            return { path, hit: false, hitType: 'WALL' };
        } else if (cell.content === 'BOMB') {
            if (cell.owner === firingPlayer) {
                return { path, hit: true, hitType: 'BOMB' };
            } else {
                return { path, hit: false, hitType: 'WALL' };
            }
        } else if (cell.content === 'SOURCE') {
            if (cell.owner !== firingPlayer) {
                return { path, hit: true, hitType: 'SOURCE' };
            } else {
                return { path, hit: true, hitType: 'SELF' };
            }
        } else if (cell.content === 'MIRROR_A') {
            if (direction === 'RIGHT') direction = 'UP';
            else if (direction === 'LEFT') direction = 'DOWN';
            else if (direction === 'UP') direction = 'RIGHT';
            else if (direction === 'DOWN') direction = 'LEFT';
        } else if (cell.content === 'MIRROR_B') {
            if (direction === 'RIGHT') direction = 'DOWN';
            else if (direction === 'LEFT') direction = 'UP';
            else if (direction === 'UP') direction = 'LEFT';
            else if (direction === 'DOWN') direction = 'RIGHT';
        }
    }
    return { path, hit: false, hitType: null };
};

// Simulation
const moves = [
    { turn: "BLUE", actionType: "MIRROR", x: 8, y: 9, details: "MIRROR_B" },
    { turn: "RED", actionType: "MIRROR", x: 8, y: 8 },
    { turn: "BLUE", actionType: "MIRROR", x: 1, y: 0, details: "MIRROR_B" },
    { turn: "RED", actionType: "BOMB", x: 1, y: 0 },
    { turn: "RED", actionType: "MIRROR", x: 1, y: 0 },
    { turn: "BLUE", actionType: "MIRROR", x: 1, y: 9, details: "MIRROR_A" },
    { turn: "RED", actionType: "MIRROR", x: 2, y: 0 },
    { turn: "BLUE", actionType: "BOMB", x: 9, y: 7, details: "BOMB" },
    { turn: "RED", actionType: "MIRROR", x: 3, y: 0 },
    { turn: "RED", actionType: "MIRROR", x: 1, y: 0 },
    { turn: "BLUE", actionType: "MIRROR", x: 0, y: 9, details: "MIRROR_A" },
    { turn: "RED", actionType: "MIRROR", x: 4, y: 0 },
    { turn: "RED", actionType: "MIRROR", x: 5, y: 0 },
    { turn: "BLUE", actionType: "ROTATE_RIGHT", x: 0, y: 0, details: "" }, // Rotated Source
    { turn: "RED", actionType: "MIRROR", x: 6, y: 0 },
    { turn: "RED", actionType: "MIRROR", x: 8, y: 9 },
    { turn: "BLUE", actionType: "BOMB", x: 7, y: 9, details: "BOMB" },
    { turn: "RED", actionType: "MIRROR", x: 7, y: 0 },
    { turn: "RED", actionType: "MIRROR", x: 0, y: 1 },
    { turn: "BLUE", actionType: "PASS", x: -1, y: -1, details: "" },
    { turn: "RED", actionType: "MIRROR", x: 8, y: 0 },
    { turn: "RED", actionType: "MIRROR", x: 0, y: 1 },
    { turn: "BLUE", actionType: "MOVE", x: 1, y: 1, details: "FROM_0_0" }, // Moved Source
    { turn: "RED", actionType: "MIRROR", x: 0, y: 0 },
    { turn: "BLUE", actionType: "MIRROR", x: 1, y: 9, details: "MIRROR_A" },
    { turn: "RED", actionType: "MIRROR", x: 1, y: 2 },
    { turn: "BLUE", actionType: "MIRROR", x: 1, y: 9, details: "MIRROR_B" },
    { turn: "RED", actionType: "MIRROR", x: 9, y: 0 },
    { turn: "RED", actionType: "MIRROR", x: 1, y: 2 },
    { turn: "BLUE", actionType: "PASS", x: -1, y: -1, details: "" },
    { turn: "RED", actionType: "MIRROR", x: 2, y: 1 },
    { turn: "BLUE", actionType: "MIRROR", x: 1, y: 9, details: "MIRROR_A" },
    { turn: "RED", actionType: "MIRROR", x: 3, y: 1 },
    { turn: "BLUE", actionType: "MIRROR", x: 0, y: 2, details: "MIRROR_B" } // Last Action
];

const grid = createInitialGrid();

let winner = null;

const applyMove = (move: any) => {
    const { actionType, x, y, details, turn } = move;

    // Apply Action
    if (x !== -1 && y !== -1) {
        const cell = grid[y][x];
        if (actionType === 'MIRROR') {
            cell.content = details ? (details as MirrorType) : 'MIRROR_A'; // Default logic
            cell.owner = turn;
        } else if (actionType === 'BOMB') {
            cell.content = 'BOMB';
            cell.owner = turn;
        } else if (actionType === 'MOVE') {
            // Details: FROM_0_0
            // Simplified: We assume valid move
            const fromParts = details.split('_');
            const fromX = parseInt(fromParts[1]);
            const fromY = parseInt(fromParts[2]);
            const source = grid[fromY][fromX];

            cell.content = source.content;
            cell.owner = source.owner;
            cell.orientation = source.orientation;

            source.content = 'EMPTY';
            source.owner = null;
            source.orientation = undefined;
        } else if (actionType === 'ROTATE_RIGHT') {
            const dirs: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
            // Find source
            // Assuming x,y is the source
            const idx = dirs.indexOf(cell.orientation || 'RIGHT');
            cell.orientation = dirs[(idx + 1) % 4];
        }
    }
}

// Logic to replay
for (const move of moves) {
    applyMove(move);

    // Fire Laser
    const result = calculateLaserPath(grid, move.turn as Player);
    if (result.hit) {
        if (result.hitType === 'SOURCE') {
            console.log(`WINNER: ${move.turn} by hitting Enemy Source`);
            winner = move.turn;
        } else if (result.hitType === 'SELF') {
            console.log(`WINNER: ${move.turn === 'BLUE' ? 'RED' : 'BLUE'} by Self Hit`);
            winner = move.turn === 'BLUE' ? 'RED' : 'BLUE';
        } else if (result.hitType === 'BOMB') {
            console.log("Bomb Hit - logic skipped for brevity but might be relevant");
            // Assuming bomb logic doesn't trigger here based on log
        }
    }

    if (winner) break;
}

if (!winner) {
    console.log("No Winner Yet");
} else {
    console.log(`Final Winner: ${winner}`);
}
