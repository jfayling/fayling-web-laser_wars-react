# Game AI Engine Mechanics

This document outlines the current play mechanics, decision-making process, and constraints of the Game AI Engine, as implemented in `src/logic/aiLogic.ts` and `src/logic/laserLogic.ts`.

## 1. Overview

The AI Engine operates on a **deterministic Alpha-Beta Minimax approach**. It simulates future turns to find the best move, balancing potential gains against the risk of opponent counter-attacks. AI strength can be configured via depth:
- **Default/Hard**: Depth 3 (Looks ahead: AI Move -> Opponent Reply -> AI Move).
- **Medium**: Depth 2.
- **Easy**: Depth 1 (Greedy).

## 2. Decision Making Process

The AI follows a standard Minimax search with Alpha-Beta pruning:

### 2.1 Identify Valid Moves
The AI generates all legal moves for the current board state:
*   **Place Mirror**: In empty cells. Considers both **Mirror A (/)** and **Mirror B (\)** variations.
*   **Place Bomb**: In empty cells (Defensive) or on Opponent's Wall/Mirror (Offensive).
*   **Rotate Mirror**: For owned mirrors.
*   **Defuse Bomb**: For opponent bombs.
*   **Rotate Source**: 90 degrees Left or Right.
*   **Move Source**: To adjacent empty cells.

Moves are sorted by heuristic priority (e.g., Defuse > Move > Mirror > Bomb) to optimize Alpha-Beta pruning performance.

### 2.2 Simulation & Evaluation
For each move in the search tree, the AI:
1.  **Applies the Move**: Updates the grid (Planning Phase).
    - *Mirror B Logic*: AI simulates the "double-click" required to place a Type B mirror.
2.  **Resolves Action**: Simulates the laser fire (Action Phase).
    - If a bomb is hit by **ANY** laser (friendly or enemy), it explodes (clearing a 3x3 area).
3.  **Recursive Search**: Recursively evaluates the resulting state from the opponent's perspective (Minimizing player).

### 2.3 Evaluation Function (Leaf Nodes)
When the search reaches maximum depth or a terminal state, the board is scored:
*   **Terminal States**:
    *   **+1,000,000**: Opponent Source Destroyed (Win).
    *   **-1,000,000**: Own Source Destroyed (Loss).
*   **Heuristic Factors** (if non-terminal):
    *   **Material**: Points for owning Mirrors and Bombs.
    *   **Threat Avoidance**: 
        *   Heavy penalty if an Enemy Bomb is adjacent to the Own Source.
        *   **Laser Bomb Threat**: Critical penalty (-10,000) if the AI's own laser hits a bomb that would explode its own Source (Suicide prevention).


### 2.5 Advanced Tactics
- **Loop Detection**: The AI tracks recent moves to detect repetitive patterns (e.g., repeatedly placing a bomb that gets defused). If a loop is detected, the AI forces a different move to break the stalemate.
- **Panic Mode**: If the AI detects a critical threat (score < -2000) and cannot find a winning move, it overrides normal logic to force a **DEFUSE** action on the threatening bomb, ensuring self-preservation.

### 2.6 Selection
The AI selects the move that maximizes the minimum guaranteed score (Minimax). 
- **Randomness**: If multiple moves share the exact same top score, the AI **randomly selects one**. This prevents infinite loops and repetitive behavior.

## 3. Constraints & Limitations

*   **Move Set**: Supports Mirror, Bomb, Defuse, and Source Move. Block placement is currently not utilized by the AI.
*   **Performance**: Search depth is limited (Default 3) to ensure responsiveness.
*   **Rules Adherence**: The AI strictly follows game rules, including turn-ending mechanics for Defusing.

## 4. Training Data Collection
The engine supports a **Training Mode** to facilitate Machine Learning research.
- **Recording**: Captures every move (Turn, Action, Coordinates, Timestamp).
- **Format**: Data is exported as JSON sessions.
- **Usage**: This data is intended to train future iterations of the AI (e.g., Nueral Networks) to replace or augment the Alpha-Beta engine.
