# Game AI Engine Mechanics

This document outlines the current play mechanics, decision-making process, and constraints of the Game AI Engine, as implemented in `src/logic/aiLogic.ts` and `src/logic/laserLogic.ts`.

## 1. Overview

The AI Engine operates on a **greedy, simulation-based approach**. For each turn, it evaluates all legally available moves, simulates the outcome of firing the laser for each, assigns a score, and selects the move with the highest score. It does not look ahead to the opponent's future turns (Depth = 1).

## 2. Decision Making Process

The AI follows a three-step process: **Identify Valid Moves**, **Evaluate Moves (Simulation)**, and **Select Best Move**.

### 2.1 Identify Valid Moves
The AI iterates through every cell of the 10x10 grid to find potential actions.
*   **Place Mirror**: If a cell is `EMPTY`, the AI considers placing a Mirror (defaulting to `MIRROR_A` type `/`).
*   **Place Bomb**: If a cell is `EMPTY`, the AI considers placing a Bomb.
*   **Rotate Mirror**: If the AI **owns** the cell and it contains a Mirror (`MIRROR_A` or `MIRROR_B`), the AI considers rotating it.
*   **Defuse Bomb**: If a cell contains an **Opponent's Bomb**, the AI considers using the Defuse tool.

### 2.2 Evaluate Moves (Simulation)
For each valid move, the AI:
1.  **Clones the Grid**: Creates a temporary copy of the current game state.
2.  **Applies the Move**:
    *   **Placement**: If the cell was empty, it places the selected tool (Mirror or Bomb).
    *   **Rotation**: Cycles the Mirror orientation.
    *   **Defuse**: Removes the Enemy Bomb.
        *   **Heuristic**:
            *   **Critical Threat (Score 900)**: If the bomb is adjacent to the AI Source (within blast radius), defusing it allows the AI to survive. This is prioritized over almost everything except an immediate win.
            *   **Standard Threat (Score 50)**: If the bomb is elsewhere, defusing it is treated as a preventative measure.
3.  **Simulates Laser Fire** (if not Defusing): It runs the `calculateLaserPath` logic.
4.  **Calculates Score**:
    *   **+1000** (Win Condition): The laser hits the opponent's **Source**.
    *   **-1000** (Lose Condition): The laser hits the AI's **own Source** (Friendly Fire).
    *   **Blast Impact** (If Friendly Bomb Hit): A `calculateBlastScore` helper sums the value of destroyed targets in the 3x3 radius:
        *   Enemy Source: +1000 (Win)
        *   Own Source: -1000 (Lose)
        *   Enemy Piece: +10
        *   Friendly Piece: -10
    *   **-10**: The laser hits a Wall or stops at a Bomb (without exploding).
    *   **0**: The laser misses.
    *   **+ Random Jitter**: A small random value is added to break ties.

### 2.3 Select Best Move
The AI selects the move with the highest score. It balances the immediate chance of winning (Score > 1000) against survival (Score 900) and minor advantages.

### 2.4 Move Logic
- The AI evaluates moving its Source as a valid strategic option.
- **Process**:
  1. Identifies all valid adjacent empty cells.
  2. Simulates moving the Source to each cell.
  3. Simulates the laser fire from the new position.
  4. Scores the result based on:
     - Hitting Enemy Source (Win).
     - Hitting Self (Loss).
     - Blast Damage.
  5. Applies a slight penalty to moving to avoid unnecessary random walks.
- **Priority**: Moving is chosen if it leads to an immediate Win or helps in avoiding self-inflicted damage (or gaining positional advantage).

## 3. Constraints & Limitations

The AI currently imposes the following constraints on itself:

*   **Limited Move Set**: It knows how to use Mirrors, Bombs, and Defuse. It still ignores the strategic placement of Blocks (Walls).
*   **Greedy Algorithm**: It only optimizes for the current turn's result (Depth = 1).
*   **Immediate Detonation Only**: The AI will only place a bomb if it can detonate it *immediately* in the same turn to gain points.
*   **Defensive Heuristic**: It only recognizes direct threats to its Source from existing bombs. It does not predict future enemy moves (e.g., "The enemy *could* place a mirror here to hit me").
*   **Rotation Cycle**: The rotation logic is hardcoded.
