import type { Cell, Direction, Player } from '../types';

export interface Point {
    x: number;
    y: number;
}

export interface LaserPathResult {
    path: Point[];
    hit: boolean;
    hitType: 'WALL' | 'SOURCE' | 'SELF' | 'BOMB' | null;
}

const BOARD_SIZE = 10;

export const calculateLaserPath = (grid: Cell[][], firingPlayer: Player): LaserPathResult => {
    const path: Point[] = [];

    // 1. Find Start
    let startX = -1;
    let startY = -1;
    let direction: Direction = firingPlayer === 'BLUE' ? 'RIGHT' : 'LEFT';

    // Search for the source of the firing player
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = grid[y][x];
            if (cell.content === 'SOURCE' && cell.owner === firingPlayer) {
                startX = x;
                startY = y;
                break;
            }
        }
        if (startX !== -1) break;
    }

    if (startX === -1) return { path: [], hit: false, hitType: null }; // Should not happen

    // Start point (center of cell)
    // We use 0.5 offset to be in center of cell. Grid is 0..9.
    // Visualization usage: x * cellSize + cellSize/2
    // Logic usage: Integer coordinates

    let currentX = startX;
    let currentY = startY;

    // Add initial point
    path.push({ x: currentX, y: currentY });

    // Move loop (limit to avoid infinite loops if mirrors cycle, though simpler mirrors cycle is common)
    const MAX_STEPS = 100;

    for (let step = 0; step < MAX_STEPS; step++) {
        // 2. Move in Direction
        let nextX = currentX;
        let nextY = currentY;

        if (direction === 'UP') nextY--;
        else if (direction === 'DOWN') nextY++;
        else if (direction === 'LEFT') nextX--;
        else if (direction === 'RIGHT') nextX++;

        // 3. Check Bounds
        if (nextX < 0 || nextX >= BOARD_SIZE || nextY < 0 || nextY >= BOARD_SIZE) {
            // Hit Wall (boundary)
            path.push({ x: nextX, y: nextY }); // Add point slightly outside or at edge effectively
            return { path, hit: false, hitType: 'WALL' };
        }

        // 4. Check Content
        const cell = grid[nextY][nextX];
        path.push({ x: nextX, y: nextY });

        currentX = nextX;
        currentY = nextY;

        if (cell.content === 'BLOCK' || cell.content === 'WALL') {
            return { path, hit: false, hitType: 'WALL' };
        } else if (cell.content === 'BOMB') {
            if (cell.owner === firingPlayer) {
                // Friendly Bomb: Hit & Explode (Triggered by own laser)
                return { path, hit: true, hitType: 'BOMB' };
            } else {
                // Enemy Bomb: Hit & Stop (Acts like Wall)
                return { path, hit: false, hitType: 'WALL' };
            }
        } else if (cell.content === 'SOURCE') {
            if (cell.owner !== firingPlayer) {
                return { path, hit: true, hitType: 'SOURCE' }; // WIN
            } else {
                return { path, hit: true, hitType: 'SELF' }; // LOSE (Friendly Fire)
            }
        } else if (cell.content === 'MIRROR_A') {
            // / Mirror
            if (direction === 'RIGHT') direction = 'UP';
            else if (direction === 'LEFT') direction = 'DOWN';
            else if (direction === 'UP') direction = 'RIGHT';
            else if (direction === 'DOWN') direction = 'LEFT';
        } else if (cell.content === 'MIRROR_B') {
            // \ Mirror
            if (direction === 'RIGHT') direction = 'DOWN';
            else if (direction === 'LEFT') direction = 'UP';
            else if (direction === 'UP') direction = 'LEFT';
            else if (direction === 'DOWN') direction = 'RIGHT';
        }
        // EMPTY passes through
    }

    return { path, hit: false, hitType: null };
};
