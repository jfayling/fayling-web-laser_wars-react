
import { calculateAiMove } from './src/logic/aiLogic';
import { Cell, Player } from './src/types';

// Mock Grid
const createGrid = (): Cell[][] => {
    const grid: Cell[][] = [];
    for (let y = 0; y < 10; y++) {
        const row: Cell[] = [];
        for (let x = 0; x < 10; x++) {
            row.push({ x, y, content: 'EMPTY', owner: null });
        }
        grid.push(row);
    }
    // Add Sources
    grid[0][0] = { x: 0, y: 0, content: 'SOURCE', owner: 'BLUE', orientation: 'RIGHT' };
    grid[9][9] = { x: 9, y: 9, content: 'SOURCE', owner: 'RED', orientation: 'LEFT' };

    // Setup Checkmate Scenario (Game 2 end state before Red's fatal move)
    // Blue has Wall at 8,9
    grid[9][8] = { x: 8, y: 9, content: 'WALL', owner: 'BLUE' };

    // Blue has MirrorB at 8,0 (\)
    // Laser (0,0) -> Right -> (8,0) Hit \ -> Down column 8
    grid[0][8] = { x: 8, y: 0, content: 'MIRROR_B', owner: 'BLUE' };

    // 8,8 is EMPTY. Red to move.
    // If Red does nothing, Blue plays BOMB at 8,8 -> BOOM.

    return grid;
};

const grid = createGrid();

console.log('--- Debugging Checkmate Detection ---');
console.log('State: Blue MirrorB (8,0), Blue Wall (8,9). Red Source (9,9).');
console.log('Threat: Next Blue turn, Blue places BOMB at (8,8) -> WIN.');

console.log('\n--- Running AI (Hard) ---');
// We expect Red to panic or find a counter (e.g. Block 8,8, Destroy Mirror 8,0)
const move = calculateAiMove(grid, 'RED', 'Hard');
console.log('Best Move:', move);

// Also verify what move AI would play for BLUE if it was Blue's turn
console.log('\n--- Checking Blue Killer Move ---');
const moveBlue = calculateAiMove(grid, 'BLUE', 'Medium'); // Medium (Depth 2) should find it
console.log('Blue Best Move:', moveBlue);
if (moveBlue?.tool === 'BOMB' && moveBlue.x === 8 && moveBlue.y === 8) {
    console.log('CONFIRMED: Blue sees the win.');
} else {
    console.log('FAILURE: Blue missed the win.');
}
