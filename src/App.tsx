import { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { Board } from './components/Board';
import { StartScreen } from './components/StartScreen';
import { PlaybackScreen } from './components/PlaybackScreen';
import { useGameState } from './hooks/useGameState';
import { useSound } from './hooks/useSound';
import { calculateAiMove } from './logic/aiLogic';
import { Zap } from 'lucide-react';
import { MusicControls } from './components/MusicControls';
import clsx from 'clsx';
import { Settings as SettingsIcon } from 'lucide-react';
import { useSettings } from './contexts/SettingsContext';
import { SettingsModal } from './components/SettingsModal';
import { LogViewerModal } from './components/LogViewerModal';
import { MoveList } from './components/MoveList';
import { FileText, Pause, Play, LogOut } from 'lucide-react';
import type { RecordedMove, GameSession, AIConfiguration } from './types';
import { AI_ENGINE_VERSION } from './logic/aiLogic';
import AI_CONFIG from './logic/aiConfig.json';
import { MultiplayerMenu } from './components/MultiplayerMenu';
import { ConfirmationModal } from './components/ConfirmationModal';
import { supabase } from './lib/supabase';
import { useMultiplayer } from './contexts/MultiplayerContext';

export type GameMode = 'PVP' | 'PVE' | 'SPECTATOR' | 'PLAYBACK' | 'MULTIPLAYER_LOBBY' | 'MULTIPLAYER' | null;

function App() {
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { playPlaceSound, playRotateSound, playFireSound, playWinSound, playExplosionSound, playWallHitSound } = useSound();
  const { gameState, handleCellClick, fireLaser, selectedTool, setSelectedTool, resetGame } = useGameState(playExplosionSound, playWallHitSound);
  const { activeMatchId, matchDetails, playerRole, user, opponentStatus, leaveMatch } = useMultiplayer();
  const { aiDifficulty } = useSettings();
  const [activeAiDifficulty, setActiveAiDifficulty] = useState<import('./types').Difficulty>('Medium');

  const [isTrainingMode, setIsTrainingMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const features = params.get('features')?.split(',') || [];
    return features.includes('AUTO_START_TRAINING');
  });
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [moveHistory, setMoveHistory] = useState<RecordedMove[]>([]);
  const [playbackSession, setPlaybackSession] = useState<GameSession | null>(null);
  const [isWinModalVisible, setIsWinModalVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [matchEndedAlert, setMatchEndedAlert] = useState<{ isOpen: boolean, message: string }>({ isOpen: false, message: '' });
  const [isConnectionGracePeriod, setIsConnectionGracePeriod] = useState(false);
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);

  useEffect(() => {
    if (gameState.winner) {
      setIsWinModalVisible(true);
    } else {
      setIsWinModalVisible(false);
    }
  }, [gameState.winner]);

  const captureMove = (currentGameState: import('./types').GameState, actionType: import('./types').ToolType | 'PASS' = 'PASS'): RecordedMove => {
    // If we have an active cell, that's where the action happened. 
    // If not, and it's a pass, we use -1, -1.
    // NOTE: This captures state BEFORE the fire/turn end.

    let x = -1;
    let y = -1;
    let details = '';
    const id = crypto.randomUUID();

    if (currentGameState.activeCell) {
      x = currentGameState.activeCell.x;
      y = currentGameState.activeCell.y;

      const cell = currentGameState.grid[y][x];
      // Capture details about what was placed/changed
      if (cell.content.startsWith('MIRROR')) details = cell.content;
      else if (cell.content === 'WALL') details = 'WALL';
      else if (cell.content === 'BOMB') details = 'BOMB';
      // For move and rotate, we trust the actionType passed in, but could add more info from cell
    }

    if (actionType === 'MOVE' && currentGameState.moveStartPos) {
      // If we moved, the active cell is the DESTINATION. 
      // We might want to record source too in details?
      // For now, simpler is better.
      details = `FROM_${currentGameState.moveStartPos.x}_${currentGameState.moveStartPos.y}`;
    }

    return {
      id,
      moveIndex: moveHistory.length,
      turn: currentGameState.turn,
      actionType,
      x,
      y,
      details,
      timestamp: Date.now()
    };
  };

  const handleRestart = () => {
    resetGame();
    setMoveHistory([]); // Clear history
    setIsSettingsOpen(false);
    setIsLogViewerOpen(false);
    playPlaceSound();
  };

  const handleQuit = async () => {
    if (gameMode === 'MULTIPLAYER') {
      // Create a separate performQuit to call after confirmation
      setIsQuitModalOpen(true);
      return;
    }
    // For other modes, quit immediately
    performQuit();
  };

  const performQuit = async () => {
    if (gameMode === 'MULTIPLAYER' && activeMatchId) {
      // 1. Update DB to notify opponent
      const { error } = await supabase.from('matches').update({
        status: 'forfeited',
        winner_id: playerRole === 'BLUE' ? matchDetails?.player2_id : matchDetails?.player1_id
      }).eq('id', activeMatchId);

      if (error) console.error("Error forfeiting match:", error);

      // 2. Clear local multiplayer state so we don't auto-rejoin
      leaveMatch();
    }

    resetGame();
    setMoveHistory([]); // Clear history

    if (gameMode === 'MULTIPLAYER') {
      setGameMode('MULTIPLAYER_LOBBY');
    } else {
      setGameMode(null);
    }

    setIsSettingsOpen(false);
    setIsLogViewerOpen(false);
    setIsQuitModalOpen(false);
  };

  const generateSessionData = (): GameSession => {
    const isPVE = gameMode === 'PVE';
    const isSpectator = gameMode === 'SPECTATOR';

    // Determine player types based on game mode
    const playerBlue = isSpectator ? 'AI' : 'HUMAN';
    const playerRed = (isPVE || isSpectator) ? 'AI' : 'HUMAN';

    // Build AI configuration if AI is playing
    const aiConfig: AIConfiguration | undefined = (isPVE || isSpectator) ? {
      version: AI_ENGINE_VERSION,
      difficulty: activeAiDifficulty,
      scores: AI_CONFIG.scores as AIConfiguration['scores'],
      depths: AI_CONFIG.depths as AIConfiguration['depths']
    } : undefined;

    return {
      date: new Date().toISOString(),
      mode: (gameMode === 'PVP' || gameMode === 'PVE' || gameMode === 'SPECTATOR') ? gameMode : 'PVP',
      winner: gameState.winner,
      winReason: gameState.winReason,
      moves: moveHistory,
      playerBlue,
      playerRed,
      aiConfig
    };
  };

  const downloadTrainingData = () => {
    if (moveHistory.length === 0) return;
    const session = generateSessionData();
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laser-wars-training-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePlayback = () => {
    const session = generateSessionData();
    setPlaybackSession(session);
    setIsLogViewerOpen(false);
    setGameMode('PLAYBACK');
  };

  // AI Logic
  useEffect(() => {
    const isAiTurn = (gameMode === 'PVE' && gameState.turn === 'RED') ||
      (gameMode === 'SPECTATOR');

    if (isAiTurn && !gameState.winner && !gameState.isFiring) {
      if (isPaused) return;

      // AI Turn
      const timeout = setTimeout(() => {
        const move = calculateAiMove(gameState.grid, gameState.turn, activeAiDifficulty, moveHistory);
        if (move) {
          // Apply Move
          playPlaceSound(); // AI placed something

          if (move.tool === 'MOVE') {
            // Find Source to click first
            let sourceX = -1;
            let sourceY = -1;
            for (let y = 0; y < gameState.grid.length; y++) {
              for (let x = 0; x < gameState.grid[0].length; x++) {
                if (gameState.grid[y][x].content === 'SOURCE' && gameState.grid[y][x].owner === gameState.turn) {
                  sourceX = x;
                  sourceY = y;
                  break;
                }
              }
            }
            if (sourceX !== -1) {
              handleCellClick(sourceX, sourceY, 'MOVE');
              handleCellClick(move.x, move.y, 'MOVE');
            }
          } else {
            handleCellClick(move.x, move.y, move.tool);

            // If the AI wants MIRROR_B, we need to click again to rotate it from A to B
            if (move.tool === 'MIRROR' && move.details === 'MIRROR_B') {
              // Small delay not needed for logic, but might be safer for state update or just immediate call
              // Since handleCellClick uses a functional state update, immediate call should be fine if logic permits
              // or we just trust the state update queue. 
              // Actually, handleCellClick logic for MIRROR is: Empty -> A -> B -> Empty.
              // So calling it twice results in B.
              handleCellClick(move.x, move.y, 'MIRROR');
            }
          }

          // Check if this move ends the turn immediately (Defuse, Offensive Bomb)
          let isTerminal = false;
          if (move.tool === 'DEFUSE') {
            const cell = gameState.grid[move.y][move.x];
            // If defusing opponent bomb, it's terminal
            if (cell.content === 'BOMB' && cell.owner === 'BLUE') isTerminal = true;
          } else if (move.tool === 'BOMB') {
            // Only Offensive Bomb (destroying asset) is terminal
            const cell = gameState.grid[move.y][move.x];
            if (cell.owner && cell.owner !== gameState.turn) isTerminal = true;
          }

          // Record AI Move Immediately (before async delay/state updates)
          setMoveHistory(prev => [...prev, {
            id: crypto.randomUUID(),
            moveIndex: prev.length,
            turn: gameState.turn,
            actionType: move.tool,
            x: move.x,
            y: move.y,
            timestamp: Date.now(),
            details: move.tool === 'MOVE' ? 'AI_MOVE' : (isTerminal ? 'TERMINAL_ACTION' : undefined),
            aiReasoning: move.reasoning
          }]);

          if (isTerminal) {
            // Turn ends immediately, NO LASER PHASE.
            // handleCellClick has already toggled the turn in state.
            // We just stop here.
            return;
          }

          // Fire after short delay
          setTimeout(() => {
            // For AI, if it's a "No Fire" action, we simulate clicking DONE by skipping laser.
            // But we need to check move tool.
            const isNoFire = move.tool === 'WALL' || move.tool === 'MOVE' || move.tool === 'ROTATE_LEFT' || move.tool === 'ROTATE_RIGHT' || (move.tool === 'BOMB' && !isTerminal);

            if (isNoFire) {
              playFireSound();
              fireLaser(true);
            } else {
              playFireSound();
              fireLaser();
            }
          }, 500);
        } else {
          // No move? Just fire.
          setMoveHistory(prev => [...prev, {
            id: crypto.randomUUID(),
            moveIndex: prev.length,
            turn: gameState.turn,
            actionType: 'PASS',
            x: -1,
            y: -1,
            timestamp: Date.now()
          }]);
          playFireSound();
          fireLaser();
        }
      }, 1000); // 1s thinking time

      return () => clearTimeout(timeout);
    }
  }, [gameMode, gameState.turn, gameState.winner, gameState.isFiring, gameState.grid, playPlaceSound, handleCellClick, playFireSound, fireLaser, activeAiDifficulty, isPaused]);


  // Multiplayer Logic
  useEffect(() => {
    if (activeMatchId && matchDetails?.status === 'active' && gameMode !== 'MULTIPLAYER') {
      // Match started!
      setGameMode('MULTIPLAYER');
      setIsConnectionGracePeriod(true); // Allow 10 seconds for connection to stabilize
      setTimeout(() => setIsConnectionGracePeriod(false), 10000);

      resetGame();
      setMoveHistory([]);
      playWinSound(); // Use a sound to notify?
    } else if (activeMatchId && matchDetails?.status === 'forfeited' && gameMode === 'MULTIPLAYER') {
      // Opponent forfeited or I quit
      // We don't navigate away yet - we wait for the user to acknowledge the modal.
      setMatchEndedAlert({ isOpen: true, message: "Match ended: Opponent Forfeit or You Quit" });
      resetGame();
      leaveMatch(); // Clear the context state now that we've handled it
    }
  }, [activeMatchId, matchDetails, gameMode, resetGame, playWinSound, leaveMatch]);

  // Subscribe to Remote Events
  useEffect(() => {
    if (gameMode !== 'MULTIPLAYER' || !activeMatchId) return;

    const channel = supabase.channel(`match_game:${activeMatchId}`);

    channel
      .on('broadcast', { event: 'click' }, ({ payload }) => {
        const { x, y, tool, turn } = payload;
        // Only apply if it's the OTHER player's turn (or consistent)
        // But strict turn checking is good.
        if (gameState.turn === turn) {
          // It's technically "their" turn, so if gameState thinks it's theirs, apply.

          // Force tool selection to match what they used (visual feedback)
          setSelectedTool(tool);
          handleCellClick(x, y, tool);

          // Sounds
          if (tool === 'MIRROR') playPlaceSound();
          else playPlaceSound(); // Generalize
        }
      })
      .on('broadcast', { event: 'fire' }, ({ payload }) => {
        const { skipSimulation } = payload;
        playFireSound();
        fireLaser(skipSimulation);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameMode, activeMatchId, gameState.turn, handleCellClick, fireLaser, playPlaceSound, playFireSound, setSelectedTool]);


  // Handle Win/Loss Sounds and DB Update
  useEffect(() => {
    if (gameState.winner) {
      playWinSound();

      // Update Match Status in DB if I am the winner (to avoid double write)
      // Or just both write, it's idempotent.
      // Better: The winner writes.
      if (gameMode === 'MULTIPLAYER' && activeMatchId && playerRole === gameState.winner) {
        supabase.from('matches').update({
          status: 'finished',
          winner_id: user?.id,
          // metadata: { reason: gameState.winReason } // Optional
        }).eq('id', activeMatchId).then();
      }
    }
  }, [gameState.winner, playWinSound, gameMode, activeMatchId, playerRole, user]);


  const onCellClickWrapper = (x: number, y: number) => {
    if (gameState.winner || gameState.isFiring) return;

    // Prevent clicking during AI turn in PvE or Spectator
    if ((gameMode === 'PVE' && gameState.turn === 'RED') || gameMode === 'SPECTATOR') return;

    // Multiplayer Restriction: Can only click if it is MY turn
    if (gameMode === 'MULTIPLAYER') {
      if (playerRole !== gameState.turn) return; // Block input
    }

    // ... [Original Logic continues]

    const cell = gameState.grid[y][x];
    const canInteract = cell.content === 'EMPTY' || cell.owner === gameState.turn;

    if (canInteract) {
      // ... [Sound logic - mostly redundant with what I added in listener but okay]
      if (selectedTool === 'MIRROR') {
        if (cell.content === 'EMPTY') playPlaceSound();
        else if (cell.content.startsWith('MIRROR')) playRotateSound();
      } else if (selectedTool === 'ERASER') {
        if (cell.owner === gameState.turn) playPlaceSound();
      } else {
        if (cell.content === 'EMPTY') playPlaceSound();
      }
    }

    // Broadcast Click (BEFORE local handleCellClick?) OR AFTER?
    // Doesn't matter much for optimistic UI.
    if (gameMode === 'MULTIPLAYER' && activeMatchId && playerRole === gameState.turn) {
      supabase.channel(`match_game:${activeMatchId}`).send({
        type: 'broadcast',
        event: 'click',
        payload: { x, y, tool: selectedTool, turn: gameState.turn }
      });
    }

    // Check if this is a terminal action [Refactoring needed to keep logic flow]
    let isTerminalAction = false;
    // ... [Re-pasting original logic]
    if (selectedTool === 'DEFUSE') {
      const opponent = gameState.turn === 'BLUE' ? 'RED' : 'BLUE';
      if (cell.content === 'BOMB' && cell.owner === opponent) {
        isTerminalAction = true;
      }
    } else if (selectedTool === 'BOMB') {
      if (cell.owner !== null && cell.owner !== gameState.turn) {
        if (cell.content === 'WALL' || cell.content === 'MIRROR_A' || cell.content === 'MIRROR_B') {
          isTerminalAction = true;
        }
      }
    }

    handleCellClick(x, y);

    // ... [Record history]

    // Record terminal actions immediately
    if (isTerminalAction && gameState.turn === 'BLUE') {
      setMoveHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        moveIndex: prev.length,
        turn: 'BLUE',
        actionType: selectedTool,
        x,
        y,
        timestamp: Date.now(),
        details: 'TERMINAL_ACTION'
      }]);
    }
  };

  // Determine if the current action is a "No-Fire" action
  // No-fire actions: WALL, BOMB (Placement), ROTATE (Source)
  const isNoFireAction = (() => {
    // If rotation is active (source rotation), it's a no-fire action
    if (gameState.originalOrientation) return true;

    // If a move has been performed (moveStartPos is set), it's a no-fire action
    if (gameState.moveStartPos) return true;

    // If active cell exists
    if (gameState.activeCell) {
      const cell = gameState.grid[gameState.activeCell.y][gameState.activeCell.x];
      // Placing a Wall
      if (cell.content === 'WALL') return true;
      // Placing a Bomb (Defensive/Neutral - Offensive is immediate terminal)
      // Note: Offensive bombs are terminal actions handled in onCellClickWrapper, so if we are here, it's a placement.
      if (cell.content === 'BOMB') return true;
    }

    return false;
  })();

  const onFireWrapper = () => {
    // Determine if we should skip the laser simulation based on the action
    const skipSimulation = isNoFireAction;

    // Always record move
    let action: import('./types').ToolType | 'PASS' = 'PASS';
    if (gameState.activeCell) {
      if (gameState.originalOrientation) {
        if (selectedTool.startsWith('ROTATE')) action = selectedTool;
        else action = 'ROTATE_RIGHT';
      } else if (gameState.moveStartPos) {
        action = 'MOVE';
      } else {
        action = selectedTool;
      }
    }

    const rec = captureMove(gameState, action);
    rec.firedLaser = !skipSimulation;
    setMoveHistory(prev => [...prev, rec]);

    if (!skipSimulation) playFireSound();

    if (gameMode === 'MULTIPLAYER' && activeMatchId && playerRole === gameState.turn) {
      supabase.channel(`match_game:${activeMatchId}`).send({
        type: 'broadcast',
        event: 'fire',
        payload: { skipSimulation }
      });
    }

    fireLaser(skipSimulation);
  };

  if (!gameMode) {
    return (
      <StartScreen
        onSelectMode={(mode, difficulty) => {
          setGameMode(mode);
          if ((mode === 'PVE' || mode === 'SPECTATOR') && difficulty) {
            setActiveAiDifficulty(difficulty);
          }
        }}
        defaultDifficulty={aiDifficulty}
      />
    );
  }

  if (gameMode === 'PLAYBACK') {
    return <PlaybackScreen onExit={() => { setGameMode(null); setPlaybackSession(null); }} initialSession={playbackSession || undefined} />;
  }

  if (gameMode === 'MULTIPLAYER_LOBBY') {
    return <MultiplayerMenu onBack={() => setGameMode(null)} />;
  }

  /* New handler for tool selection */
  const handleToolSelect = (tool: import('./types').ToolType) => {
    setSelectedTool(tool);

    // Auto-apply rotation if a Rotate tool is clicked
    if (tool === 'ROTATE_LEFT' || tool === 'ROTATE_RIGHT') {
      let sourceX = -1;
      let sourceY = -1;
      for (let y = 0; y < gameState.grid.length; y++) {
        for (let x = 0; x < gameState.grid[0].length; x++) {
          if (gameState.grid[y][x].content === 'SOURCE' && gameState.grid[y][x].owner === gameState.turn) {
            sourceX = x;
            sourceY = y;
            break;
          }
        }
      }
      if (sourceX !== -1) {
        handleCellClick(sourceX, sourceY, tool);
        playRotateSound();
      }
    }
  };

  // Calculate disabled tools based on rotation state
  const disabledTools: import('./types').ToolType[] = [];
  const isRotationActive = !!gameState.originalOrientation;

  if (isRotationActive) {
    // Disable all non-rotate tools
    disabledTools.push('MIRROR', 'WALL', 'BOMB', 'ERASER', 'DEFUSE', 'MOVE');

    // We are in a dirty rotation state
    let sourceCell = null;
    for (const row of gameState.grid) {
      for (const cell of row) {
        if (cell.content === 'SOURCE' && cell.owner === gameState.turn) {
          sourceCell = cell;
          break;
        }
      }
      if (sourceCell) break;
    }

    if (sourceCell && sourceCell.orientation) {
      const dirs: import('./types').Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
      const origIdx = dirs.indexOf(gameState.originalOrientation!); // Non-null asserted because of check above
      const currIdx = dirs.indexOf(sourceCell.orientation);
      const diff = (currIdx - origIdx + 4) % 4;

      if (diff === 1) {
        // Rotated Right (1 step). Disable further Right.
        disabledTools.push('ROTATE_RIGHT');
      } else if (diff === 3) {
        // Rotated Left (-1 step). Disable further Left.
        disabledTools.push('ROTATE_LEFT');
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-start pt-4 md:pt-8 p-4">
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed top-4 left-4 z-50 p-3 bg-gray-900/80 border border-gray-700 text-gray-400 rounded-full hover:bg-gray-800 hover:text-white hover:border-gray-500 transition-all shadow-lg backdrop-blur-sm"
      >
        <SettingsIcon size={24} />
      </button>

      {/* Log Viewer Button */}
      {isTrainingMode && (
        <button
          onClick={() => setIsLogViewerOpen(true)}
          className="fixed top-4 left-20 z-50 p-3 bg-gray-900/80 border border-gray-700 text-blue-400 rounded-full hover:bg-gray-800 hover:text-white hover:border-gray-500 transition-all shadow-lg backdrop-blur-sm"
        >
          <FileText size={24} />
        </button>
      )}

      <header className="main-header mb-4 text-center">
        <h1 className="game-title text-5xl font-bold mb-2 flex items-center justify-center gap-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-500">
          <Zap size={48} className="text-yellow-400 fill-yellow-400" />
          LASER WARS
          <Zap size={48} className="text-yellow-400 fill-yellow-400" />
        </h1>
        <p className="text-gray-400">Turn-based strategy. Defend your source. Destroy the enemy.</p>
        <div className="mt-2 text-sm text-gray-500 font-bold uppercase tracking-widest border border-gray-800 inline-block px-3 py-1 rounded-full">
          Mode: {gameMode === 'PVP' ? 'Versus Player' : (gameMode === 'SPECTATOR' ? 'Spectator Mode' : (gameMode === 'MULTIPLAYER' ? 'Online Match' : 'Versus Computer'))}
        </div>
      </header>

      <div className="flex flex-col md:flex-col w-full items-center">
        {/* Controls - Top on Mobile, Bottom on Desktop (via order css or just DOM structure) */}
        {/* Actually using flex-col-reverse on Desktop means we need:
            DOM: [Controls, Board]
            Mobile (flex-col): Controls, Board.
            Desktop (flex-col-reverse): Board, Controls.
        */}
        <div className="flex flex-col md:flex-col-reverse w-full items-center gap-4 md:gap-8">

          {/* Controls Area */}
          <div className="controls-area w-full flex justify-center z-10 gap-4">
            {gameMode === 'SPECTATOR' && !gameState.winner ? (
              <>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={clsx(
                    "px-6 py-3 rounded-full font-bold text-lg tracking-wider text-black transition-all active:scale-95 shadow-lg flex items-center gap-2",
                    isPaused
                      ? "bg-green-500 hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                      : "bg-yellow-500 hover:bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                  )}
                >
                  {isPaused ? <Play size={24} /> : <Pause size={24} />}
                  {isPaused ? "RESUME" : "PAUSE"}
                </button>
                <button
                  onClick={handleQuit}
                  className="px-6 py-3 rounded-full font-bold text-lg tracking-wider text-white bg-red-600 hover:bg-red-500 transition-all active:scale-95 shadow-lg shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-2"
                >
                  <LogOut size={24} />
                  QUIT
                </button>
              </>
            ) : (
              <div className="flex gap-4 w-full justify-center">
                {gameMode === 'MULTIPLAYER' && !gameState.winner && (
                  <button
                    onClick={handleQuit}
                    className="px-6 py-3 rounded-full font-bold text-lg tracking-wider text-white bg-red-600 hover:bg-red-500 transition-all active:scale-95 shadow-lg shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-2"
                    title="Quit Match"
                  >
                    <LogOut size={24} />
                    <span className="hidden md:inline">QUIT</span>
                  </button>
                )}
                <button
                  onClick={gameState.winner ? () => setIsWinModalVisible(true) : onFireWrapper}
                  className={clsx(
                    "px-8 py-3 md:px-12 md:py-4 rounded-full font-bold text-lg md:text-2xl tracking-wider text-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg flex-grow md:flex-grow-0",
                    gameState.winner ? "bg-gradient-to-r from-yellow-500 to-orange-600 shadow-[0_0_20px_rgba(234,179,8,0.5)] hover:scale-105 hover:shadow-[0_0_30px_rgba(234,179,8,0.8)]" :
                      isNoFireAction ? "bg-gradient-to-r from-green-500 to-green-600 shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:bg-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.8)]" :
                        "bg-gradient-to-r from-yellow-500 to-orange-600 shadow-[0_0_20px_rgba(234,179,8,0.5)] hover:scale-105 hover:shadow-[0_0_30px_rgba(234,179,8,0.8)]"
                  )}
                  disabled={!gameState.winner && (gameState.isFiring || (gameMode === 'PVE' && gameState.turn === 'RED') || (gameMode === 'MULTIPLAYER' && playerRole !== gameState.turn))}
                >
                  {gameState.winner ? 'SHOW RESULTS' :
                    (gameState.isFiring ? 'FIRING...' :
                      (isNoFireAction ? 'DONE' : 'FIRE LASER'))}
                </button>
              </div>
            )}
          </div>

          <div
            className={clsx(
              "flex flex-col md:flex-row gap-4 md:gap-12 w-full max-w-6xl justify-center transition-all duration-300",
              gameMode === 'SPECTATOR' ? "md:items-stretch" : "items-start"
            )}
            style={gameMode === 'SPECTATOR' ? { height: 'calc(min(calc(100vw - 4rem), 600px, 65vh) + 2rem + 2px)' } : undefined}
          >
            {/* Player 1 (Blue) */}
            <div className={clsx(
              "flex flex-col gap-2 md:gap-4 w-full md:w-80 md:shrink-0 order-2 md:order-1",
              gameMode === 'SPECTATOR' && "h-full min-h-0"
            )}>
              <div className={`p-3 md:p-6 rounded-xl border transition-colors duration-300 flex flex-row md:flex-col items-center justify-between md:justify-center ${gameState.turn === 'BLUE' ? 'bg-blue-900/30 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'bg-gray-900 border-gray-800'}`}>
                <h2 className="text-sm md:text-xl font-semibold md:mb-4 text-blue-400">
                  {gameMode === 'MULTIPLAYER' ? (matchDetails?.player1?.nickname || 'Player 1') :
                    (gameMode === 'SPECTATOR' ? 'Computer (Blue)' : 'Player 1 (Blue)')}
                </h2>
                {gameMode === 'SPECTATOR' && (
                  <div className="text-[10px] md:text-xs text-blue-400/80 uppercase font-bold tracking-wider md:mb-2 bg-blue-900/20 px-2 py-1 rounded inline-block ml-2 md:ml-0">
                    Level: {activeAiDifficulty}
                  </div>
                )}
                <div className={`text-xs md:text-sm ${gameState.turn === 'BLUE' ? 'text-blue-300 font-bold' : 'text-gray-600'}`}>
                  {gameState.turn === 'BLUE' ? (gameMode === 'SPECTATOR' ? 'THINKING...' : 'PLANNING...') : 'WAITING'}
                </div>
              </div>
              {gameState.turn === 'BLUE' && gameMode !== 'SPECTATOR' && (gameMode !== 'MULTIPLAYER' || playerRole === 'BLUE') && (
                <Toolbar
                  selectedTool={selectedTool}
                  onSelectTool={handleToolSelect}
                  turn="BLUE"
                  isLocked={!!gameState.activeCell && !isRotationActive}
                  hasOpponentBombs={gameState.grid.some(row => row.some(cell => cell.content === 'BOMB' && cell.owner === 'RED'))}
                  disabledTools={disabledTools}
                />
              )}
              {gameMode !== 'SPECTATOR' && (
                <MoveList moves={moveHistory.filter(m => m.turn === 'BLUE')} title="Moves" isRed={false} />
              )}
              {gameMode === 'SPECTATOR' && (
                <MoveList moves={moveHistory.filter(m => m.turn === 'BLUE')} title="Blue AI Moves" isRed={false} fillHeight className="flex-1" />
              )}
            </div>

            <div className="order-1 md:order-2">
              <Board gameState={gameState} onCellClick={onCellClickWrapper} isTrainingMode={isTrainingMode} />
            </div>

            {/* Player 2 (Red) */}
            <div className={clsx(
              "flex flex-col gap-2 md:gap-4 w-full md:w-80 md:shrink-0 order-3",
              gameMode === 'SPECTATOR' && "h-full min-h-0"
            )}>
              <div className={`p-3 md:p-6 rounded-xl border transition-colors duration-300 flex flex-row md:flex-col items-center justify-between md:justify-center ${gameState.turn === 'RED' ? 'bg-red-900/30 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-gray-900 border-gray-800'}`}>
                <h2 className="text-sm md:text-xl font-semibold md:mb-4 text-red-500">
                  {gameMode === 'MULTIPLAYER' ? (matchDetails?.player2?.nickname || 'Player 2') :
                    (gameMode === 'PVE' || gameMode === 'SPECTATOR' ? `Computer (Red)` : 'Player 2 (Red)')}
                </h2>
                {(gameMode === 'PVE' || gameMode === 'SPECTATOR') && (
                  <div className="text-[10px] md:text-xs text-red-400/80 uppercase font-bold tracking-wider md:mb-2 bg-red-900/20 px-2 py-1 rounded inline-block ml-2 md:ml-0">
                    Level: {activeAiDifficulty}
                  </div>
                )}
                <div className={`text-xs md:text-sm ${gameState.turn === 'RED' ? 'text-red-300 font-bold' : 'text-gray-600'}`}>
                  {gameState.turn === 'RED' ? ((gameMode === 'PVE' || gameMode === 'SPECTATOR') ? 'THINKING...' : 'PLANNING...') : 'WAITING'}
                </div>
              </div>
              {gameState.turn === 'RED' && (gameMode === 'PVP' || (gameMode === 'MULTIPLAYER' && playerRole === 'RED')) && (
                <Toolbar
                  selectedTool={selectedTool}
                  onSelectTool={handleToolSelect}
                  turn="RED"
                  isLocked={!!gameState.activeCell && !isRotationActive}
                  hasOpponentBombs={gameState.grid.some(row => row.some(cell => cell.content === 'BOMB' && cell.owner === 'BLUE'))}
                  disabledTools={disabledTools}
                />
              )}
              <MoveList
                moves={moveHistory.filter(m => m.turn === 'RED')}
                title={gameMode === 'PVE' || gameMode === 'SPECTATOR' ? "Red AI Moves" : "Moves"}
                isRed={true}
                fillHeight={gameMode === 'SPECTATOR'}
                className={gameMode === 'SPECTATOR' ? "flex-1" : undefined}
              />
            </div>
          </div>

        </div>
      </div>


      {
        gameState.winner && isWinModalVisible && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <h2 className={clsx(
                "text-6xl font-black mb-8 tracking-wider drop-shadow-[0_0_25px_rgba(255,255,255,0.5)]",
                gameState.winner === 'BLUE' ? "text-blue-500" : "text-red-500"
              )}>
                {gameState.winner} WINS!
              </h2>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setIsWinModalVisible(false)}
                  className="px-8 py-4 bg-gray-800 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  VIEW BOARD
                </button>

                {gameMode === 'MULTIPLAYER' ? (
                  <>
                    <button
                      onClick={() => {
                        leaveMatch();
                        setGameMode(null);
                      }}
                      className="px-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                    >
                      QUIT TO MENU
                    </button>
                    <button
                      onClick={() => {
                        leaveMatch();
                        setGameMode('MULTIPLAYER_LOBBY');
                      }}
                      className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                    >
                      PLAY AGAIN (LOBBY)
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                  >
                    PLAY AGAIN
                  </button>
                )}
                {isTrainingMode && moveHistory.length > 0 && (
                  <button
                    onClick={() => setIsLogViewerOpen(true)}
                    className="px-8 py-4 bg-blue-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center gap-2"
                  >
                    <FileText size={24} />
                    VIEW LOGS
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }



      {/* Opponent Disconnected Overlay */}
      {
        gameMode === 'MULTIPLAYER' && user && matchDetails?.status === 'active' &&
        opponentStatus === 'disconnected' && !isConnectionGracePeriod && !gameState.winner && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
            <div className="bg-gray-900 border border-red-500 text-white p-6 rounded-xl shadow-2xl animate-pulse pointer-events-auto flex flex-col items-center">
              <h3 className="text-2xl font-bold text-red-500 mb-2">OPPONENT DISCONNECTED</h3>
              <p className="mb-4 text-gray-300">Waiting for opponent to reconnect...</p>
              <button
                onClick={handleQuit}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold"
              >
                Quit Match
              </button>
            </div>
          </div>
        )
      }

      <MusicControls isGamePaused={isPaused} />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onRestart={handleRestart}
        onQuit={handleQuit}
        isTrainingMode={isTrainingMode}
        setIsTrainingMode={setIsTrainingMode}
      />
      <LogViewerModal
        isOpen={isLogViewerOpen}
        onClose={() => setIsLogViewerOpen(false)}
        moves={moveHistory}
        sessionData={generateSessionData()}
        onExport={downloadTrainingData}
        onPlayback={handlePlayback}
      />
      <ConfirmationModal
        isOpen={matchEndedAlert.isOpen}
        title="Match Ended"
        message={matchEndedAlert.message}
        onCancel={() => {
          setMatchEndedAlert({ ...matchEndedAlert, isOpen: false });
          if (gameMode === 'MULTIPLAYER') {
            setGameMode('MULTIPLAYER_LOBBY');
          } else {
            setGameMode(null);
          }
        }}
        isAlert={true}
      />
      <ConfirmationModal
        isOpen={isQuitModalOpen}
        title="Quit Match"
        message="Are you sure you want to quit? You will forfeit the match."
        confirmText="Quit"
        type="error"
        onCancel={() => setIsQuitModalOpen(false)}
        onConfirm={performQuit}
      />
    </div >
  );
}

export default App;
