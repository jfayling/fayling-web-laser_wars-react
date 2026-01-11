
// Analyzing logic to prevent Double Turn

// Logic in useGameState.ts:
// DEFUSE -> Ends Turn
// BOMB on Enemy -> Ends Turn
// ERASER on Own (committed) -> Ends Turn

// Implementation Plan:
// 1. Create helper `isTerminalAction(gameState, move)` in `App.tsx` (or `aiLogic` but it needs game state).
// 2. Use it in the AI useEffect.

/*
const isTerminalAction = (grid: Cell[][], move: AiMove, turn: Player): boolean => {
    const cell = grid[move.y][move.x];

    if (move.tool === 'DEFUSE') {
        const opponent = turn === 'BLUE' ? 'RED' : 'BLUE';
        if (cell.content === 'BOMB' && cell.owner === opponent) return true;
    }

    if (move.tool === 'BOMB') {
         if (cell.owner && cell.owner !== turn) {
             // Offensive
             return true;
         }
    }

    // Eraser not used by AI usually?
    // In aiLogic.ts: generateMoves...
    // AI does NOT generate ERASER moves.
    // It generates 'DEFUSE', 'BOMB', 'MIRROR', 'ROTATE', 'MOVE'.

    return false;
}
*/

// So if `isTerminalAction` is true, we perform `handleCellClick` but skip `setTimeout(fireLaser)`.
