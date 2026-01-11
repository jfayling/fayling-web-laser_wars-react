
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

    // Recreate Game 1 State right before Red's fatal move
    // Blue has placed Wall at 8,9
    grid[9][8] = { x: 8, y: 9, content: 'WALL', owner: 'BLUE' };

    // Blue has placed Bomb at 8,8
    grid[8][8] = { x: 8, y: 8, content: 'BOMB', owner: 'BLUE' };

    return grid;
};

const grid = createGrid();

console.log('--- Debugging AI Failure ---');
console.log('State: Red Source (9,9), Blue Wall (8,9), Blue Bomb (8,8)');
console.log('Threat: Bomb at (8,8) is adjacent to Source (9,9).');

// Verify Heuristic Detection
import AI_CONFIG from './src/logic/aiConfig.json';
console.log('Config Threat Penalty:', AI_CONFIG.scores.THREAT_BOMB_NEAR_SOURCE);

// Run AI at Hard (Depth 3)
console.log('\n--- Running AI (Hard) ---');
const moveHard = calculateAiMove(grid, 'RED', 'Hard');
console.log('Best Move (Hard):', moveHard);

// Run AI at Easy (Depth 1)
console.log('\n--- Running AI (Easy) ---');
const moveEasy = calculateAiMove(grid, 'RED', 'Easy');
console.log('Best Move (Easy):', moveEasy);

if (moveHard?.tool === 'DEFUSE' && moveHard.x === 8 && moveHard.y === 8) {
    console.log('SUCCESS: AI (Hard) chose to DEFUSE the bomb.');
} else {
    console.log('FAILURE: AI (Hard) ignored the bomb.');
}
