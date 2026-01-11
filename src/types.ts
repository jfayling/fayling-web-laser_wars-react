export type Player = 'RED' | 'BLUE';
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type MirrorType = 'MIRROR_A' | 'MIRROR_B'; // A: / (Bottom-Left to Top-Right), B: \ (Top-Left to Bottom-Right)
export type CellContent = MirrorType | 'BLOCK' | 'SOURCE' | 'EMPTY' | 'WALL' | 'BOMB';

export interface Cell {
    x: number;
    y: number;
    content: CellContent;
    owner: Player | null; // Who placed it seems relevant for mirrors
    orientation?: Direction; // For SOURCE pieces
}

export interface Point {
    x: number;
    y: number;
}

export type WinReason = 'ELIMINATION' | 'SUICIDE' | 'BOMB';

export interface GameState {
    grid: Cell[][];
    turn: Player;
    isFiring: boolean;
    winner: Player | null;
    winReason?: WinReason | null;
    laserPath: Point[];
    activeCell: Point | null;
    validMoves?: Point[];
    moveStartPos?: Point | null;
    originalOrientation?: Direction | null;
    isNewPlacement?: boolean;
}

export type ToolType = 'MIRROR' | 'WALL' | 'BOMB' | 'ERASER' | 'DEFUSE' | 'MOVE' | 'ROTATE_LEFT' | 'ROTATE_RIGHT';

export interface RecordedMove {
    turn: Player;
    actionType: ToolType | 'PASS'; // PASS if they just fired without doing anything
    x: number; // -1 if not applicable (e.g. PASS)
    y: number; // -1 if not applicable
    details?: string; // e.g. "ROTATED_UP_TO_RIGHT" or specific mirror placed
    timestamp: number;
}

export interface GameSession {
    date: string;
    winner: Player | null;
    winReason?: WinReason | null;
    moves: RecordedMove[];
    mode: 'PVP' | 'PVE';
}
