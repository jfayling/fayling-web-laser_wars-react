export type Player = 'RED' | 'BLUE';
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type MirrorType = 'MIRROR_A' | 'MIRROR_B'; // A: / (Bottom-Left to Top-Right), B: \ (Top-Left to Bottom-Right)
export type CellContent = MirrorType | 'BLOCK' | 'SOURCE' | 'EMPTY' | 'WALL' | 'BOMB';

export interface Cell {
    x: number;
    y: number;
    content: CellContent;
    owner: Player | null; // Who placed it seems relevant for mirrors
}

export interface Point {
    x: number;
    y: number;
}

export interface GameState {
    grid: Cell[][];
    turn: Player;
    isFiring: boolean;
    winner: Player | null;
    laserPath: Point[];
    activeCell: Point | null;
    validMoves?: Point[];
    moveStartPos?: Point | null;
}

export type ToolType = 'MIRROR' | 'WALL' | 'BOMB' | 'ERASER' | 'DEFUSE' | 'MOVE';
