import { calculateAiMove } from './src/logic/aiLogic';
import type { Cell } from './src/types';

// Test case: RED source at (9,9), BLUE bomb at (8,9)
// RED should NOT place a mirror that causes laser to hit the bomb

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

console.log('=== Testing AI Self-Damage Scenario ===');
console.log('Setup: RED source at (9,9) facing LEFT, BLUE bomb at (8,9)');
console.log('Expected: RED should NOT place mirrors that cause laser to hit bomb');
console.log('');

const testGrid = createTestGrid();
const aiMove = calculateAiMove(testGrid, 'RED', 'Hard', []);

console.log('');
console.log('=== AI Decision ===');
if (aiMove) {
    console.log(`AI chose: ${aiMove.tool} at (${aiMove.x}, ${aiMove.y})`);
    console.log(`Score: ${aiMove.score}`);

    // Check if this is a dangerous move
    if (aiMove.tool === 'MIRROR' || aiMove.tool === 'WALL' || aiMove.tool === 'BOMB') {
        console.log('WARNING: AI placed an object. Verify this does not cause self-damage!');
    }

    if (aiMove.tool === 'DEFUSE' && aiMove.x === 8 && aiMove.y === 9) {
        console.log('✓ GOOD: AI chose to defuse the threatening bomb');
    }
} else {
    console.log('AI returned no move (will just fire laser)');
}
