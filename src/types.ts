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

export interface AIAlternativeMove {
    x: number;
    y: number;
    tool: ToolType;
    score: number;
    details?: string;
}

export interface AIEvaluationBreakdown {
    materialScore: number;
    laserPathScore: number;
    positionScore: number;
    threatScore: number;
    totalScore: number;
}

export interface AIDecisionReason {
    chosenMoveScore: number;
    alternativeMoves: AIAlternativeMove[]; // Top 5 alternatives
    evaluationBreakdown: AIEvaluationBreakdown;
    loopDetected: boolean;
    panicMode: boolean;
    searchDepth: number;
    totalMovesConsidered: number;
}

export interface RecordedMove {
    id: string; // Unique identifier for the move
    moveIndex: number; // Sequential move number (0-based)
    turn: Player;
    actionType: ToolType | 'PASS'; // PASS if they just fired without doing anything
    x: number; // -1 if not applicable (e.g. PASS)
    y: number; // -1 if not applicable
    details?: string; // e.g. "ROTATED_UP_TO_RIGHT" or specific mirror placed
    timestamp: number;
    aiReasoning?: AIDecisionReason; // Only present for AI moves
}

export type PlayerType = 'HUMAN' | 'AI';

export interface AIConfiguration {
    version: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    scores: {
        WIN: number;
        LOSS: number;
        DRAW: number;
        MATERIAL_MIRROR: number;
        MATERIAL_BOMB: number;
        THREAT_BOMB_NEAR_SOURCE: number;
        LASER_BLOCKED: number;
        LASER_CLEAR_PATH: number;
        LASER_NEAR_ENEMY: number;
        CENTER_CONTROL: number;
        MOBILITY_PER_CELL: number;
        EDGE_PENALTY: number;
    };
    depths: {
        Easy: number;
        Medium: number;
        Hard: number;
    };
}

export interface GameSession {
    date: string;
    winner: Player | null;
    winReason?: WinReason | null;
    moves: RecordedMove[];
    mode: 'PVP' | 'PVE';
    playerBlue: PlayerType;
    playerRed: PlayerType;
    aiConfig?: AIConfiguration; // Only present when AI is playing
}
