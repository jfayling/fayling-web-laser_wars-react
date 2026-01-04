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
*   **Place Mirror**: In empty cells.
*   **Place Bomb**: In empty cells.
*   **Rotate Mirror**: For owned mirrors.
*   **Defuse Bomb**: For opponent bombs.
*   **Rotate Source**: 90 degrees Left or Right.
*   **Move Source**: To adjacent empty cells.

Moves are sorted by heuristic priority (e.g., Defuse > Mirror > Bomb > Move) to optimize Alpha-Beta pruning performance.

### 2.2 Simulation & Evaluation
For each move in the search tree, the AI:
1.  **Applies the Move**: Updates the grid (Planning Phase).
2.  **Resolves Action**: Simulates the laser fire (Action Phase).
    - If a bomb is hit by its owner, it explodes (clearing a 3x3 area).
3.  **Recursive Search**: Recursively evaluates the resulting state from the opponent's perspective (Minimizing player).

### 2.3 Evaluation Function (Leaf Nodes)
When the search reaches maximum depth or a terminal state, the board is scored:
*   **Terminal States**:
    *   **+1,000,000**: Opponent Source Destroyed (Win).
    *   **-1,000,000**: Own Source Destroyed (Loss).
*   **Heuristic Factors** (if non-terminal):
    *   **Material**: Points for owning Mirrors and Bombs.
    *   **Threat Avoidance**: Heavy penalty (-900) if an Enemy Bomb is adjacent to the Own Source (Critical Danger).

### 2.4 Selection
The AI selects the move that maximizes the minimum guaranteed score (Minimax). 
- Ties are broken deterministically by move type and coordinates.
- Randomness has been removed to ensure predictable, testable behavior.

## 3. Constraints & Limitations

*   **Move Set**: Supports Mirror, Bomb, Defuse, and Source Move. Block placement is currently not utilized by the AI.
*   **Performance**: Search depth is limited (Default 3) to ensure responsiveness.
*   **Rules Adherence**: The AI strictly follows game rules, including turn-ending mechanics for Defusing.
