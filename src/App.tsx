import { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { Board } from './components/Board';
import { StartScreen } from './components/StartScreen';
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
import { FileText } from 'lucide-react';
import type { RecordedMove, GameSession, AIConfiguration } from './types';
import { AI_ENGINE_VERSION } from './logic/aiLogic';
import AI_CONFIG from './logic/aiConfig.json';

export type GameMode = 'PVP' | 'PVE' | null;

function App() {
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { playPlaceSound, playRotateSound, playFireSound, playWinSound, playExplosionSound, playWallHitSound } = useSound();
  const { gameState, handleCellClick, fireLaser, selectedTool, setSelectedTool, resetGame } = useGameState(playExplosionSound, playWallHitSound);
  const { aiDifficulty } = useSettings();

  const [isTrainingMode, setIsTrainingMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const features = params.get('features')?.split(',') || [];
    return features.includes('AUTO_START_TRAINING');
  });
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [moveHistory, setMoveHistory] = useState<RecordedMove[]>([]);

  const captureMove = (currentGameState: import('./types').GameState, actionType: import('./types').ToolType | 'PASS' = 'PASS'): RecordedMove => {
    // If we have an active cell, that's where the action happened. 
    // If not, and it's a pass, we use -1, -1.
    // NOTE: This captures state BEFORE the fire/turn end.

    let x = -1;
    let y = -1;
    let details = '';

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
    setMoveHistory([]); // Clear history
    setIsSettingsOpen(false);
    setIsLogViewerOpen(false);
    playPlaceSound();
  };

  const handleQuit = () => {
    resetGame();
    setMoveHistory([]); // Clear history
    setGameMode(null);
    setGameMode(null);
    setIsSettingsOpen(false);
    setIsLogViewerOpen(false);
  };

  const generateSessionData = (): GameSession => {
    const isPVE = gameMode === 'PVE';

    // Determine player types based on game mode
    const playerBlue = 'HUMAN';
    const playerRed = isPVE ? 'AI' : 'HUMAN';

    // Build AI configuration if AI is playing
    const aiConfig: AIConfiguration | undefined = isPVE ? {
      version: AI_ENGINE_VERSION,
      difficulty: aiDifficulty,
      scores: AI_CONFIG.scores as AIConfiguration['scores'],
      depths: AI_CONFIG.depths as AIConfiguration['depths']
    } : undefined;

    return {
      date: new Date().toISOString(),
      mode: gameMode || 'PVP',
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

  const copyTrainingData = async () => {
    if (moveHistory.length === 0) return;
    const session = generateSessionData();
    try {
      await navigator.clipboard.writeText(JSON.stringify(session, null, 2));
      // Could show a toast here, but for now silent success is okay or we rely on modal feedback if implemented
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // AI Logic
  useEffect(() => {
    if (gameMode === 'PVE' && gameState.turn === 'RED' && !gameState.winner && !gameState.isFiring) {
      // AI Turn (Red)
      const timeout = setTimeout(() => {
        const move = calculateAiMove(gameState.grid, 'RED', aiDifficulty, moveHistory);
        if (move) {
          // Apply Move
          playPlaceSound(); // AI placed something

          if (move.tool === 'MOVE') {
            // Find Source to click first
            let sourceX = -1;
            let sourceY = -1;
            for (let y = 0; y < gameState.grid.length; y++) {
              for (let x = 0; x < gameState.grid[0].length; x++) {
                if (gameState.grid[y][x].content === 'SOURCE' && gameState.grid[y][x].owner === 'RED') {
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
            const cell = gameState.grid[move.y][move.x];
            // If bombing opponent piece, it's terminal
            if (cell.owner && cell.owner !== 'RED') isTerminal = true;
          }

          // Record AI Move Immediately (before async delay/state updates)
          if (isTrainingMode) {
            setMoveHistory(prev => [...prev, {
              turn: 'RED',
              actionType: move.tool,
              x: move.x,
              y: move.y,
              timestamp: Date.now(),
              details: move.tool === 'MOVE' ? 'AI_MOVE' : (isTerminal ? 'TERMINAL_ACTION' : undefined)
            }]);
          }

          if (isTerminal) {
            // Turn ends immediately, NO LASER PHASE.
            // handleCellClick has already toggled the turn in state.
            // We just stop here.
            return;
          }

          // Fire after short delay
          setTimeout(() => {
            playFireSound();
            fireLaser();
          }, 500);
        } else {
          // No move? Just fire.
          if (isTrainingMode) {
            setMoveHistory(prev => [...prev, {
              turn: 'RED',
              actionType: 'PASS',
              x: -1,
              y: -1,
              timestamp: Date.now()
            }]);
          }
          playFireSound();
          fireLaser();
        }
      }, 1000); // 1s thinking time

      return () => clearTimeout(timeout);
    }
  }, [gameMode, gameState.turn, gameState.winner, gameState.isFiring, gameState.grid, playPlaceSound, handleCellClick, playFireSound, fireLaser, aiDifficulty]);


  // Handle Win/Loss Sounds
  useEffect(() => {
    if (gameState.winner) {
      playWinSound();
    }
  }, [gameState.winner, playWinSound]);

  const onCellClickWrapper = (x: number, y: number) => {
    if (gameState.winner || gameState.isFiring) return;

    // Prevent clicking during AI turn in PvE
    if (gameMode === 'PVE' && gameState.turn === 'RED') return;

    const cell = gameState.grid[y][x];
    const canInteract = cell.content === 'EMPTY' || cell.owner === gameState.turn;

    if (canInteract) {
      if (selectedTool === 'MIRROR') {
        if (cell.content === 'EMPTY') playPlaceSound();
        else if (cell.content.startsWith('MIRROR')) playRotateSound();
      } else if (selectedTool === 'ERASER') {
        if (cell.owner === gameState.turn) playPlaceSound(); // Reuse place sound for now, maybe need delete sound?
      } else {
        if (cell.content === 'EMPTY') playPlaceSound();
      }
    }

    // Check if this is a terminal action that will end the turn immediately
    let isTerminalAction = false;
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

    // Record terminal actions immediately in training mode
    if (isTrainingMode && isTerminalAction && gameState.turn === 'BLUE') {
      setMoveHistory(prev => [...prev, {
        turn: 'BLUE',
        actionType: selectedTool,
        x,
        y,
        timestamp: Date.now(),
        details: 'TERMINAL_ACTION'
      }]);
    }
  };

  const onFireWrapper = () => {
    if (isTrainingMode) {
      // Determine what the user did. 
      // If selectedTool is MOVE, and we have activeCell, it was a move.
      // If activeCell is null, it was a PASS.
      // But wait, if they clicked a Mirror and placed it, activeCell is set?
      // Let's check logic: handleCellClick sets activeCell to the one modified.
      // So if activeCell is not null, they did something. 
      // Exception: If they just clicked a tool but didn't click board? activeCell is null.

      let action: import('./types').ToolType | 'PASS' = 'PASS';
      if (gameState.activeCell) {
        // How to know which tool was used? 
        // We can infer from the cell change or just use 'selectedTool'. 
        // If they rotated, selectedTool might be MIRROR (click to rotate) or ROTATE_LEFT/RIGHT keys?
        // Actually handleCellClick handles tool selection. 
        // If we are here, the move is "committed" by firing.

        // If originalOrientation is set, it was a ROTATION.
        if (gameState.originalOrientation) {
          // Check direction
          action = 'ROTATE_RIGHT'; // approximation, or we need to check diff.
          // Actually types.ts defines ROTATE_LEFT/RIGHT.
          // let's just say 'ROTATE' or check current orientation vs original?
          // For simplicity, let's use selectedTool if it makes sense, or default to generic.
          if (selectedTool.startsWith('ROTATE')) action = selectedTool;
          else action = 'ROTATE_RIGHT'; // default assumption for click-rotate
        } else if (gameState.moveStartPos) {
          action = 'MOVE'; // Should have been cleared though? 
          // moveStartPos is cleared after move is done? No, it stays until fire? 
          // logic: if successful move, moveStartPos stays validMoves cleared? 
          // Let's look at useGameState: 
          // After move: moveStartPos cleared NO. `newValidMoves = [prev.moveStartPos]`
          // Wait, if move is done, activeCell is the *new* pos.
          action = 'MOVE';
        } else {
          action = selectedTool; // Likely MIRROR, WALL, BOMB, DEFUSE, ERASER
        }
      }

      const rec = captureMove(gameState, action);
      setMoveHistory(prev => [...prev, rec]);
    }

    playFireSound();
    fireLaser();
  };

  if (!gameMode) {
    return <StartScreen onSelectMode={setGameMode} />;
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
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

      <header className="mb-8 text-center">
        <h1 className="text-5xl font-bold mb-2 flex items-center justify-center gap-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-500">
          <Zap size={48} className="text-yellow-400 fill-yellow-400" />
          LASER WARS
          <Zap size={48} className="text-yellow-400 fill-yellow-400" />
        </h1>
        <p className="text-gray-400">Turn-based strategy. Defend your source. Destroy the enemy.</p>
        <div className="mt-2 text-sm text-gray-500 font-bold uppercase tracking-widest border border-gray-800 inline-block px-3 py-1 rounded-full">
          Mode: {gameMode === 'PVP' ? 'Versus Player' : 'Versus Computer'}
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-center gap-12">
        {/* Player 1 (Blue) */}
        <div className="flex flex-col gap-4">
          <div className={`p-6 rounded-xl border transition-colors duration-300 ${gameState.turn === 'BLUE' ? 'bg-blue-900/30 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'bg-gray-900 border-gray-800'}`}>
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Player 1 (Blue)</h2>
            <div className={`text-sm ${gameState.turn === 'BLUE' ? 'text-blue-300 font-bold' : 'text-gray-600'}`}>
              {gameState.turn === 'BLUE' ? 'PLANNING...' : 'WAITING'}
            </div>
          </div>
          {gameState.turn === 'BLUE' && (
            <Toolbar
              selectedTool={selectedTool}
              onSelectTool={handleToolSelect}
              turn="BLUE"
              isLocked={!!gameState.activeCell && !isRotationActive}
              hasOpponentBombs={gameState.grid.some(row => row.some(cell => cell.content === 'BOMB' && cell.owner === 'RED'))}
              disabledTools={disabledTools}
            />
          )}
        </div>

        <Board gameState={gameState} onCellClick={onCellClickWrapper} />

        {/* Player 2 (Red) */}
        <div className="flex flex-col gap-4">
          <div className={`p-6 rounded-xl border transition-colors duration-300 ${gameState.turn === 'RED' ? 'bg-red-900/30 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-gray-900 border-gray-800'}`}>
            <h2 className="text-xl font-semibold mb-4 text-red-500">
              {gameMode === 'PVE' ? 'Computer (Red)' : 'Player 2 (Red)'}
            </h2>
            <div className={`text-sm ${gameState.turn === 'RED' ? 'text-red-300 font-bold' : 'text-gray-600'}`}>
              {gameState.turn === 'RED' ? (gameMode === 'PVE' ? 'THINKING...' : 'PLANNING...') : 'WAITING'}
            </div>
          </div>
          {gameState.turn === 'RED' && gameMode === 'PVP' && (
            <Toolbar
              selectedTool={selectedTool}
              onSelectTool={handleToolSelect}
              turn="RED"
              isLocked={!!gameState.activeCell && !isRotationActive}
              hasOpponentBombs={gameState.grid.some(row => row.some(cell => cell.content === 'BOMB' && cell.owner === 'BLUE'))}
              disabledTools={disabledTools}
            />
          )}
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={onFireWrapper}
          className="px-12 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full font-bold text-2xl tracking-wider text-black shadow-[0_0_20px_rgba(234,179,8,0.5)] hover:scale-105 hover:shadow-[0_0_30px_rgba(234,179,8,0.8)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          disabled={gameState.isFiring || !!gameState.winner || (gameMode === 'PVE' && gameState.turn === 'RED')}
        >
          {gameState.winner ? `WINNER: ${gameState.winner}` : (gameState.isFiring ? 'FIRING...' : 'FIRE LASER')}
        </button>
      </div>

      {gameState.winner && (
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
                onClick={() => window.location.reload()}
                className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)]"
              >
                PLAY AGAIN
              </button>
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
      )}

      <MusicControls />
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
        onExport={downloadTrainingData}
        onCopy={copyTrainingData}
      />
    </div>
  );
}

export default App;
