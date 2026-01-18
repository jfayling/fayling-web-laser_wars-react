
// Standalone reproduction script for bomb chain reaction

interface Cell {
    x: number;
    y: number;
    content: string; // Simplified type
    owner: string | null;
    orientation?: string;
}

const BOARD_SIZE = 10;

const createTestGrid = (): Cell[][] => {
    const grid: Cell[][] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        const row: Cell[] = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            row.push({
                x,
                y,
                content: 'EMPTY',
                owner: null,
                orientation: undefined
            });
        }
        grid.push(row);
    }

    // Setup BLUE source at (0,0) facing RIGHT
    grid[0][0].content = 'SOURCE';
    grid[0][0].owner = 'BLUE';
    grid[0][0].orientation = 'RIGHT';

    // Setup Bomb Chain
    // Bomb A at (4,0) - In direct line of fire
    grid[0][4].content = 'BOMB';
    grid[0][4].owner = 'RED';

    // Bomb B at (5,1) - Adjacent to Bomb A (diagonal)
    grid[1][5].content = 'BOMB';
    grid[1][5].owner = 'RED';

    // Bomb C at (6,2) - Adjacent to Bomb B (diagonal)
    grid[2][6].content = 'BOMB';
    grid[2][6].owner = 'RED';

    // Target beside Bomb C that should be destroyed
    grid[2][7].content = 'MIRROR_A';
    grid[2][7].owner = 'BLUE'; // Test Target

    // Isolated Bomb D at (9,9) - Should NOT explode
    grid[9][9].content = 'BOMB';
    grid[9][9].owner = 'RED';

    return grid;
};

const grid = createTestGrid();
console.log('--- Initial State ---');
console.log(`Bomb A at (4,0): ${grid[0][4].content}`);
console.log(`Bomb B at (5,1): ${grid[1][5].content}`);
console.log(`Bomb C at (6,2): ${grid[2][6].content}`);
console.log(`Target at (2,7): ${grid[2][7].content}`);
console.log(`Safe Bomb D at (9,9): ${grid[9][9].content}`);

// Simulate Laser Hit on Bomb A
console.log('\n--- Simulating Laser Hit on Bomb A (4,0) ---');

// Proposed Recursive Logic Implementation
const explodeBombRecursive = (grid: Cell[][], bombX: number, bombY: number, explodedBombs: Set<string> = new Set()) => {
    const key = `${bombX},${bombY}`;
    if (explodedBombs.has(key)) return;
    explodedBombs.add(key);

    console.log(`Exploding Bomb at (${bombX},${bombY})`);

    // Destroy 3x3 area
    for (let y = bombY - 1; y <= bombY + 1; y++) {
        for (let x = bombX - 1; x <= bombX + 1; x++) {
            if (y >= 0 && y < BOARD_SIZE && x >= 0 && x < BOARD_SIZE) {
                const cell = grid[y][x];

                // If we find another bomb, recurse!
                // NOTE: We must check if it's a BOMB content.
                if (cell.content === 'BOMB' && !explodedBombs.has(`${x},${y}`)) {
                    console.log(`Chain reaction triggered at (${x},${y})!`);
                    explodeBombRecursive(grid, x, y, explodedBombs);
                }

                // Destroy content (unless BLOCK or SOURCE special handling)
                // Assuming BLOCK is impervious as per plan note
                if (cell.content !== 'BLOCK' && cell.content !== 'SOURCE') {
                    // Note: logic in code preserves SOURCE owner for Win Check, but destroys content visually.
                    // Here we just clear it.
                    if (cell.content !== 'EMPTY') {
                        // console.log(`Destorying ${cell.content} at (${x},${y})`);
                        cell.content = 'EMPTY';
                        cell.owner = null;
                    }
                }
            }
        }
    }
};

// Run the logic
explodeBombRecursive(grid, 4, 0);

console.log('\n--- Final State ---');
console.log(`Bomb A (4,0): ${grid[0][4].content}`);
console.log(`Bomb B (5,1): ${grid[1][5].content}`);
console.log(`Bomb C (6,2): ${grid[2][6].content}`);
console.log(`Target (2,7): ${grid[2][7].content} (Should be EMPTY)`);
console.log(`Safe Bomb D (9,9): ${grid[9][9].content} (Should be BOMB)`);

if (grid[2][7].content === 'EMPTY' && grid[9][9].content === 'BOMB') {
    console.log('\nSUCCESS: Chain reaction verifyied!');
} else {
    console.log('\nFAILURE: Chain reaction did not work as expected.');
}
