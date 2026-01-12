
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

    // Setup Checkmate Scenario
    grid[9][8] = { x: 8, y: 9, content: 'WALL', owner: 'BLUE' };
    grid[0][8] = { x: 8, y: 0, content: 'MIRROR_B', owner: 'BLUE' };

    return grid;
};

const grid = createGrid();

console.log('--- Debugging Checkmate Trace ---');
console.log('Running AI (Hard) ... this will trigger the logs I am about to add.');

calculateAiMove(grid, 'RED', 'Hard');
