import { calculateAiMove } from './src/logic/aiLogic';
import type { Cell, RecordedMove } from './src/types';

// Test case: Simulate the exact scenario from training data
// BLUE places bomb at (8,9) three times, RED defuses twice, then on third time should defuse again

const createTestGrid = (): Cell[][] => {
    const grid: Cell[][] = [];
    for (let y = 0; y < 10; y++) {
        const row: Cell[] = [];
        for (let x = 0; x < 10; x++) {
            let content: any = 'EMPTY';
            let owner: any = null;
            let orientation: any = undefined;

            // BLUE source at (0,0)
            if (x === 0 && y === 0) {
                content = 'SOURCE';
                owner = 'BLUE';
                orientation = 'RIGHT';
            }
            // RED source at (9,9)
            else if (x === 9 && y === 9) {
                content = 'SOURCE';
                owner = 'RED';
                orientation = 'LEFT';
            }
            // BLUE bomb at (8,9) - directly left of RED source
            else if (x === 8 && y === 9) {
                content = 'BOMB';
                owner = 'BLUE';
            }

            row.push({ x, y, content, owner, orientation });
        }
        grid.push(row);
    }
    return grid;
};

// Simulate move history: BLUE bombs, RED defuses, BLUE bombs, RED defuses
const moveHistory: RecordedMove[] = [
    { turn: 'BLUE', actionType: 'BOMB', x: 8, y: 9, details: 'BOMB', timestamp: 1 },
    { turn: 'RED', actionType: 'DEFUSE', x: 8, y: 9, details: 'TERMINAL_ACTION', timestamp: 2 },
    { turn: 'BLUE', actionType: 'BOMB', x: 8, y: 9, details: 'BOMB', timestamp: 3 },
    { turn: 'RED', actionType: 'DEFUSE', x: 8, y: 9, details: 'TERMINAL_ACTION', timestamp: 4 },
    { turn: 'BLUE', actionType: 'BOMB', x: 8, y: 9, details: 'BOMB', timestamp: 5 },
];

console.log('=== Testing AI Loop Detection Fix ===');
console.log('Scenario: BLUE placed bomb at (8,9) three times, RED defused twice');
console.log('Move history shows RED defused at (8,9) twice already');
console.log('Expected: RED should STILL defuse (not place a mirror) because bomb is adjacent to source');
console.log('');

const testGrid = createTestGrid();
const aiMove = calculateAiMove(testGrid, 'RED', 'Hard', moveHistory);

console.log('');
console.log('=== AI Decision ===');
if (aiMove) {
    console.log(`AI chose: ${aiMove.tool} at (${aiMove.x}, ${aiMove.y})`);

    if (aiMove.tool === 'DEFUSE' && aiMove.x === 8 && aiMove.y === 9) {
        console.log('✓ SUCCESS: AI chose to defuse despite loop detection!');
        console.log('✓ The fix is working - critical defensive actions override loop detection');
    } else if (aiMove.tool === 'MIRROR' || aiMove.tool === 'WALL' || aiMove.tool === 'BOMB') {
        console.log('✗ FAILURE: AI placed an object instead of defusing');
        console.log('✗ This could lead to self-damage');
    } else {
        console.log(`? AI chose ${aiMove.tool} - verify this is safe`);
    }
} else {
    console.log('AI returned no move (will just fire laser)');
    console.log('✗ FAILURE: AI should defuse the bomb');
}
