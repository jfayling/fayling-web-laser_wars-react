import { calculateAiMove } from './src/logic/aiLogic';
import type { Cell, RecordedMove } from './src/types';

// Create a test grid matching the user's reported scenario
const createTestGrid = (): Cell[][] => {
    const grid: Cell[][] = [];
    for (let y = 0; y < 10; y++) {
        grid[y] = [];
        for (let x = 0; x < 10; x++) {
            grid[y][x] = {
                x,
                y,
                content: 'EMPTY',
                owner: null
            };
        }
    }

    // Set up sources
    grid[0][0].content = 'SOURCE';
    grid[0][0].owner = 'BLUE';
    grid[0][0].orientation = 'RIGHT';

    grid[9][9].content = 'SOURCE';
    grid[9][9].owner = 'RED';
    grid[9][9].orientation = 'LEFT';

    // Add the mirror that was placed in the game
    grid[0][8].content = 'MIRROR_B';
    grid[0][8].owner = 'BLUE';

    return grid;
};

// Simulate the move history from the user's bug report
const createMoveHistory = (): RecordedMove[] => {
    return [
        { turn: 'BLUE', actionType: 'MIRROR', x: 8, y: 0, details: 'MIRROR_B', timestamp: 1768252741422 },
        { turn: 'RED', actionType: 'BOMB', x: 1, y: 0, timestamp: 1768252744737 },
        { turn: 'BLUE', actionType: 'DEFUSE', x: 1, y: 0, timestamp: 1768252749406, details: 'TERMINAL_ACTION' },
        { turn: 'RED', actionType: 'BOMB', x: 1, y: 0, timestamp: 1768252750683 },
        { turn: 'BLUE', actionType: 'DEFUSE', x: 1, y: 0, timestamp: 1768252755326, details: 'TERMINAL_ACTION' },
        { turn: 'RED', actionType: 'BOMB', x: 1, y: 0, timestamp: 1768252756597 },
        { turn: 'BLUE', actionType: 'DEFUSE', x: 1, y: 0, timestamp: 1768252761758, details: 'TERMINAL_ACTION' },
        { turn: 'RED', actionType: 'BOMB', x: 1, y: 0, timestamp: 1768252763015 }
    ];
};

console.log('=== AI BOMB Loop Detection Test ===\n');

const grid = createTestGrid();
const moveHistory = createMoveHistory();

console.log('Testing scenario where RED (AI) has placed BOMB at (1,0) multiple times...');
console.log(`Move history length: ${moveHistory.length}`);
console.log('Last 8 moves:');
moveHistory.slice(-8).forEach(m => {
    console.log(`  ${m.turn}: ${m.actionType} at (${m.x},${m.y})`);
});

console.log('\nCalling AI (RED) with move history...');
const aiMove = calculateAiMove(grid, 'RED', 'Hard', moveHistory);

console.log('\n=== Result ===');
if (aiMove) {
    console.log(`AI chose: ${aiMove.tool} at (${aiMove.x},${aiMove.y})`);

    if (aiMove.tool === 'BOMB' && aiMove.x === 1 && aiMove.y === 0) {
        console.log('❌ TEST FAILED: AI is still stuck in the BOMB loop!');
        console.log('   The AI should NOT place a bomb at (1,0) again.');
    } else {
        console.log('✅ TEST PASSED: AI broke out of the loop!');
        console.log('   The AI chose a different move instead of repeating BOMB at (1,0).');
    }
} else {
    console.log('⚠️  AI returned no move');
}
