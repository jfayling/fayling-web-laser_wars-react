# Laser Wars

> A turn-based strategy game built with React, Vite, and TypeScript.

**Laser Wars** is a tactical game where two players (or Player vs AI) compete to destroy the opponent's "Source" using lasers, mirrors, walls, and bombs.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd laser-wars
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running Locally

Start the development server:
```bash
npm run dev
```
Access the game at `http://localhost:5173`.

> **Note for WSL Users**: If hot reloading is not working, polling is enabled in `vite.config.ts` to support filesystem events in WSL.

---

## 🏗️ Project Architecture

The codebase is organized to separate UI, State, and Game Logic.

### Directory Structure
```
src/
├── components/      # React UI Components (Board, Cell, Modals)
├── contexts/        # Global Contexts (Settings)
├── hooks/           # Custom Hooks (Game State, Sound)
├── logic/           # Core Game Mechanics (Pure Functions)
└── types.ts         # Shared TypeScript interfaces
```

### Key Modules

#### 1. Game State (`src/hooks/useGameState.ts`)
The central nervous system of the game. It manages:
- **Grid State**: A 10x10 array of `Cell` objects.
- **Turn Logic**: Switches between RED and BLUE players.
- **Tool Handling**: Validates and applies moves (Place Mirror, Rotate, Fire, etc.).
- **Events**: Handles sound effects and win/loss conditions.

#### 2. Game Logic (`src/logic/`)
Core mechanics are isolated as pure functions for testability:
- **`laserLogic.ts`**: Calculates the precise path of the laser, including reflections and collisions. It returns the path array and hit result.
- **`aiLogic.ts`**: The AI engine. Uses an **Alpha-Beta Minimax** algorithm to calculate the best move. It simulates future turns, evaluating score based on material and threats (e.g., Offensive Bombing opportunities).
- **`aiConfig.json`**: Configurable weights and search depths for the AI.

#### 3. AI Engine
The AI supports 3 difficulty levels (Easy, Medium, Hard) which map to search depths. It is capable of:
- Placing Mirrors/Walls/Bombs.
- Rotating its Source.
- Moving its Source.
- Defusing Bombs.
- **Offensive Bombing**: Identifying and destroying opponent assets.

## 🎮 Game Mechanics (Developer Notes)

- **Grid System**: 0,0 is Top-Left. Blue starts at 0,0 (Top-Left), Red at 9,9 (Bottom-Right).
- **Orientation**: Sources have an `orientation` (UP, RIGHT, DOWN, LEFT) determining laser firing direction.
- **Bombs**:
    - **Defensive**: Explode only if hit by the *owner's* laser.
    - **Offensive**: Placing a bomb on an opponent's asset destroys it immediately and ends the turn.

## 🛠️ Scripts

- `npm run dev`: Start dev server.
- `npm run build`: Compile for production (`dist/`).
- `npm run lint`: Run ESLint.
- `npm run preview`: Preview the production build locally.

---

## 🤝 Contributing

- **Styling**: We use **TailwindCSS** for all styling.
- **Icons**: Provided by `lucide-react`.
- **State**: Prefer local state for UI, and `useGameState` for game logic. Avoid complex global stores unless necessary.

Happy Coding! 🚀
