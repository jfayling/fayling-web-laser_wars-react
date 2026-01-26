# Project Specification: Modern Laser Wars (Web App)

## 1. Project Overview
**Goal:** Build a modern, web-based version of the DOS shareware game "Lazer Beam Wars" (Laser Duel).
**Core Mechanic:** Two players (Red vs. Blue) take turns placing or rotating mirrors on a grid to bounce their laser beam into the opponent's "Laser Source" to destroy it.
**Platform:** Web Application (Responsive Desktop/Tablet).
**Vibe:** Retro-futuristic (Neon/Dark Mode).

## 2. Tech Stack
* **Framework:** React (Vite)
* **Backend:** Supabase (Auth & Realtime)
* **Language:** TypeScript
* **Styling:** Tailwind CSS (Crucial for grid layouts and neon effects)
* **Icons:** Lucide-React (For UI controls)
* **Rendering:**
    * **Grid:** HTML/CSS Grid
    * **Laser Beam:** SVG Overlay (allows for precise diagonal lines and glow effects)

## 3. Game Rules & Mechanics

### The Board
* **Grid Size:** 10x10.
* **Players:**
    * **Player 1 (Blue):** Starts Top-Left. Owns Top Row spawn area.
    * **Player 2 (Red):** Starts Bottom-Right. Owns Bottom Row spawn area.
* **Objective:** Bounce your laser to hit the opponent's Source.
* **Lose Condition:** Hitting your own Source or getting hit by the opponent.

### The Pieces
1.  **Source (King):** Fixed position. Emits the laser. Vulnerable target.
2.  **Mirror `/`:** Reflects beam 90° (Bottom-Left to Top-Right).
3.  **Mirror `\`:** Reflects beam 90° (Top-Left to Bottom-Right).
4.  **Block (Wall):** Absorbs the beam (stops it).
5.  **Empty:** Beam passes through.

### The Core Loop (Hidden Information)
1.  **Planning Phase (Laser OFF):**
    * Players take turns.
    * Action: Place a new piece OR Rotate an existing piece.
    * *Note:* The laser is NOT visible during placement. This forces players to visualize the geometry.
2.  **Execution Phase (Laser ON):**
    * Player clicks "FIRE".
    * The laser renders, bouncing off all current mirrors.
    * Animation plays for ~2 seconds.
    * Resolution: Hit (Win/Loss) or Miss (Turn ends).

## 4. Architecture

### Data Structure: `GameState`
```typescript
type Player = 'RED' | 'BLUE';
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Cell {
  x: number;
  y: number;
  content: 'MIRROR_A' | 'MIRROR_B' | 'BLOCK' | 'SOURCE' | 'EMPTY';
  owner: Player | null; // Who placed it
}

interface GameState {
  grid: Cell[][];
  turn: Player;
  isFiring: boolean;
  winner: Player | null;
}
```

## 5. Implementation Steps for Cursor

### Phase 1: The "Skeleton"
1.  Initialize Vite + React + TS + Tailwind.
2.  Create `Board.tsx`: Render a 10x10 grid using CSS Grid.
3.  Create `Cell.tsx`: Render the individual square.
4.  Setup basic state to track whose turn it is.

### Phase 2: Piece Logic
1.  Implement "Place Piece": Clicking an empty cell places a Mirror.
2.  Implement "Rotate Piece": Clicking an existing mirror swaps its orientation.
3.  Add visual distinctions for Player 1 (Blue pieces) vs Player 2 (Red pieces).

### Phase 3: The Laser Engine (Algorithm)
1.  Create `laserLogic.ts`.
2.  Function `calculatePath(grid, startX, startY, startDir)`:
    * Iterate step-by-step.
    * Check cell content.
    * Update direction based on mirror type.
    * Return array of coordinates: `[{x,y}, {x,y}, ...]`.

### Phase 4: Visualization
1.  Create `LaserOverlay.tsx`.
2.  Use the coordinate array to draw an SVG `<polyline>`.
3.  Add CSS drop-shadow/filter for the "Neon Glow" effect.
4.  Animate the `stroke-dashoffset` to make the laser look like it's "shooting".

### Phase 5: Online Multiplayer (Supabase)
1.  **Authentication**: Anonymous login + Nickname system using Supabase Auth.
2.  **Lobby**: Realtime presence to see online players.
3.  **Matchmaking**:
    -   **Quick Match**: Join 'pending' matches automatically.
    -   **Direct Challenge**: Send/Receive invites via Realtime channels.
4.  **Game Sync**:
    -   Sync turns and board state via `matches` table subscription.
    -   Handle disconnects and forfeits.