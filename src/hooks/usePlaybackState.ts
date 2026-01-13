import { useState, useCallback } from 'react';
import type { GameState, RecordedMove, GameSession } from '../types';
import { validateTrainingFile, reconstructGameState, createInitialGrid } from '../utils/playbackUtils';

export interface PlaybackState {
    session: GameSession | null;
    currentMoveIndex: number;
    gameState: GameState;
    isPlaying: boolean;
    playbackSpeed: number; // milliseconds between moves
}

export const usePlaybackState = () => {
    const [playbackState, setPlaybackState] = useState<PlaybackState>({
        session: null,
        currentMoveIndex: -1, // -1 means initial state (before any moves)
        gameState: {
            grid: createInitialGrid(),
            turn: 'BLUE',
            isFiring: false,
            winner: null,
            laserPath: [],
            activeCell: null
        },
        isPlaying: false,
        playbackSpeed: 1000
    });

    const [error, setError] = useState<string | null>(null);

    /**
     * Load a training file from uploaded JSON
     */
    const loadTrainingFile = useCallback((file: File) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);
                const session = validateTrainingFile(data);

                setPlaybackState({
                    session,
                    currentMoveIndex: -1,
                    gameState: {
                        grid: createInitialGrid(),
                        turn: 'BLUE',
                        isFiring: false,
                        winner: null,
                        laserPath: [],
                        activeCell: null
                    },
                    isPlaying: false,
                    playbackSpeed: 1000
                });
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load training file');
            }
        };

        reader.onerror = () => {
            setError('Failed to read file');
        };

        reader.readAsText(file);
    }, []);

    /**
     * Step forward one move
     */
    const stepForward = useCallback(() => {
        setPlaybackState(prev => {
            if (!prev.session || prev.currentMoveIndex >= prev.session.moves.length - 1) {
                return prev;
            }

            const newIndex = prev.currentMoveIndex + 1;
            const newGameState = reconstructGameState(prev.session.moves, newIndex);

            return {
                ...prev,
                currentMoveIndex: newIndex,
                gameState: newGameState
            };
        });
    }, []);

    /**
     * Step backward one move
     */
    const stepBackward = useCallback(() => {
        setPlaybackState(prev => {
            if (!prev.session || prev.currentMoveIndex < 0) {
                return prev;
            }

            const newIndex = prev.currentMoveIndex - 1;
            const newGameState: GameState = newIndex < 0
                ? {
                    grid: createInitialGrid(),
                    turn: 'BLUE' as const,
                    isFiring: false,
                    winner: null,
                    laserPath: [],
                    activeCell: null
                }
                : reconstructGameState(prev.session.moves, newIndex);

            return {
                ...prev,
                currentMoveIndex: newIndex,
                gameState: newGameState
            };
        });
    }, []);

    /**
     * Jump to a specific move index
     */
    const jumpToMove = useCallback((index: number) => {
        setPlaybackState(prev => {
            if (!prev.session) return prev;

            // Clamp index to valid range
            const clampedIndex = Math.max(-1, Math.min(index, prev.session.moves.length - 1));

            const newGameState: GameState = clampedIndex < 0
                ? {
                    grid: createInitialGrid(),
                    turn: 'BLUE' as const,
                    isFiring: false,
                    winner: null,
                    laserPath: [],
                    activeCell: null
                }
                : reconstructGameState(prev.session.moves, clampedIndex);

            return {
                ...prev,
                currentMoveIndex: clampedIndex,
                gameState: newGameState
            };
        });
    }, []);

    /**
     * Jump to the start (initial state)
     */
    const jumpToStart = useCallback(() => {
        jumpToMove(-1);
    }, [jumpToMove]);

    /**
     * Jump to the end (last move)
     */
    const jumpToEnd = useCallback(() => {
        if (playbackState.session) {
            jumpToMove(playbackState.session.moves.length - 1);
        }
    }, [playbackState.session, jumpToMove]);

    /**
     * Toggle auto-play
     */
    const togglePlay = useCallback(() => {
        setPlaybackState(prev => ({
            ...prev,
            isPlaying: !prev.isPlaying
        }));
    }, []);

    /**
     * Set playback speed
     */
    const setPlaybackSpeed = useCallback((speed: number) => {
        setPlaybackState(prev => ({
            ...prev,
            playbackSpeed: speed
        }));
    }, []);

    /**
     * Reset playback state
     */
    const reset = useCallback(() => {
        setPlaybackState({
            session: null,
            currentMoveIndex: -1,
            gameState: {
                grid: createInitialGrid(),
                turn: 'BLUE',
                isFiring: false,
                winner: null,
                laserPath: [],
                activeCell: null
            },
            isPlaying: false,
            playbackSpeed: 1000
        });
        setError(null);
    }, []);

    /**
     * Get current move details
     */
    const getCurrentMove = useCallback((): RecordedMove | null => {
        if (!playbackState.session || playbackState.currentMoveIndex < 0) {
            return null;
        }
        return playbackState.session.moves[playbackState.currentMoveIndex] || null;
    }, [playbackState.session, playbackState.currentMoveIndex]);

    return {
        playbackState,
        error,
        loadTrainingFile,
        stepForward,
        stepBackward,
        jumpToMove,
        jumpToStart,
        jumpToEnd,
        togglePlay,
        setPlaybackSpeed,
        reset,
        getCurrentMove,
        canStepForward: playbackState.session ? playbackState.currentMoveIndex < playbackState.session.moves.length - 1 : false,
        canStepBackward: playbackState.currentMoveIndex >= 0,
        totalMoves: playbackState.session?.moves.length || 0
    };
};
