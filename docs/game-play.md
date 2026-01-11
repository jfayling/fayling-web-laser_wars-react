# Game Play Mechanics

## 1. Game Overview
**Laser Wars** is a turn-based strategy game played on a 10x10 grid. Two players (Red and Blue) compete to destroy the opponent's "Source" while defending their own.

- **Board**: A 10x10 grid where pieces can be placed.
- **Players**: 
  - **Player 1 (Blue)**: Starts at (0,0). Direction of fire: Right.
  - **Player 2 (Red)**: Starts at (9,9). Direction of fire: Left.

## 2. Objective
**Win Condition**: 
- A player wins if their laser hits the **Enemy Source**.
- A player wins if the opponent destroys their own Source (e.g., by a generic bomb explosion or friendly fire, though direct friendly fire counts as a loss for the firer).

**Loss Condition**:
- Hitting your own Source with your laser results in a loss.
- Having your Source destroyed by an explosion results in a loss.

## 3. Turn Structure
Each turn consists of two phases: **Planning/Modification** and **Action**.

### Phase 1: Planning & Modification
The active player selects a tool and interacts with the board.
- **Place Piece**: Click an Empty cell to place the selected tool (Mirror, Wall, Bomb).
- **Edit Active Move**: The piece placed *this turn* is "active". You can click it again to rotate (for Mirrors) or remove it (effectively undoing the move).
- **Modify Existing Board**: You generally cannot move opponents' pieces or your own old pieces, **except** with the Eraser.

### Phase 2: Action (Fire)
Once the move is set, the player clicks **"FIRE LASER"**.
- The Source emits a laser beam.
- The beam travels through the grid, interacting with pieces.
- If no game-ending event occurs, the turn passes to the other player.

> **Note**: If the **Eraser** is used on a piece from a *previous* turn, the turn ends **immediately** without firing the laser.

## 4. Entities & Interactions

### The Source
- The "King" piece.
- Emits the laser.
- **Vulnerable**: If hit by a laser or destroyed by a bomb, the owner loses.

### Laser Beam
- Travels in a straight line until it hits an object or the board boundary.
- **Walls/Blocks**: Stops the laser.
- **Mirrors**: Reflects 90 degrees.
- **Bombs**: Triggers an explosion.
- **Units/Empty**: Passes through empty space.

### Mirrors
- Reflect the laser 90 degrees.
- **Type A ( / )**: Reflects (Bottom ↔ Left) and (Top ↔ Right).
- **Type B ( \ )**: Reflects (Top ↔ Left) and (Bottom ↔ Right).
- **Interaction**: Clicking a just-placed mirror rotates it between Type A and Type B.

### Walls
- Blocks the laser completely.
- Useful for defense.

### Bombs
- **Defensive Usage**: Place on an empty cell.
    - **Trigger**: Hit by **ANY Laser** (Yours or Opponent's).
    - If hit by a laser, it explodes immediately.
    - The laser **stops** at the bomb (it does not pass through).
    - **Strategy**: You can intentionally shoot enemy bombs to detonate them!
- **Offensive Usage**: Click on an **Opponent's Wall or Mirror** with the Bomb tool.
    - **Effect**: Immediately destroys the target piece (sets it to Empty).
    - **Cost**: Your turn ends immediately (skips firing).
    - A sound effect plays to confirm the destruction.
- **Explosion Effect** (Defensive Trigger): Explodes a **3x3 area** centered on the bomb.
- **Destruction**:
  - Destroys **Mirrors**, **Walls**, **Bombs**.
  - Destroys **Sources** (Causes immediate loss for the Source owner).
  - Does **not** destroy **Blocks** (impervious map obstacles).

### Eraser
- **Function**: Removes a piece owned by the current player.
- **Tactical Rule**: 
  - Erasing the *current* move allows you to place something else.
  - Erasing an *old* piece ends the turn immediately (skips firing).

### Defuse Tool
- **Function**: Remove an **Opponent's Bomb**.
- **Availability**: Enabled only if the opponent has at least one bomb on the board.
- **Effect**:
  - Removes the target bomb.
  - Removes the target bomb.
  - Ends the turn immediately (skips firing).

### Rotate Action
- **Function**: Rotate your **Source** 90 degrees Left or Right.
- **Rules**:
  - Counts as your turn's action (cannot place pieces or move).
  - Changes the firing direction of the laser.

### Move Action
- **Function**: Move your **Source** to an adjacent, non-blocked square (Horizontal, Vertical, Diagonal).
- **Execution**: 
  1. Select the **Move** tool.
  2. Click your Source to see valid destinations.
  3. Click a valid destination to move.
- **Rules**:
  - You can move back to the original square to undo the choice.
  - If you commit to a move (stay in a new position), you **cannot** perform any other action (like placing mirrors) in the same turn.
  - You **MUST** fire the laser after moving.
  - Moving is a strategic way to dodge lasers or get a better firing angle.

## 5. Controls
- **Click**: Place or interact with a cell.
- **Toolbar**: Select piece type (Mirror, Wall, Bomb, Eraser, Defuse, Rotate Left, Rotate Right).
- **Fire Button**: Ends turn and fires laser.

## 6. Training Mode & Logs
**Training Mode** allows you to record game sessions for AI analysis or debugging.
- **Enable**:
    - Add `?features=ALLOW_TRAINING` to see the toggle.
    - Add `?features=AUTO_START_TRAINING` to auto-enable it on load.
- **Live Logs**: Click the **Logs** button (file icon) during gameplay to view a real-time table of moves.
- **Export**:
    - **Copy to Clipboard**: Copy JSON data directly from the Log Viewer.
    - **View Logs**: After a game ends, click "VIEW LOGS" to inspect and save the match data.
