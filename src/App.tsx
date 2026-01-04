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
import { SettingsModal } from './components/SettingsModal';

export type GameMode = 'PVP' | 'PVE' | null;

function App() {
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { playPlaceSound, playRotateSound, playFireSound, playWinSound, playExplosionSound, playWallHitSound } = useSound();
  const { gameState, handleCellClick, fireLaser, selectedTool, setSelectedTool } = useGameState(playExplosionSound, playWallHitSound);

  // AI Logic
  useEffect(() => {
    if (gameMode === 'PVE' && gameState.turn === 'RED' && !gameState.winner && !gameState.isFiring) {
      // AI Turn (Red)
      const timeout = setTimeout(() => {
        const move = calculateAiMove(gameState.grid, 'RED');
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
          }

          // Fire after short delay
          setTimeout(() => {
            playFireSound();
            fireLaser();
          }, 500);
        } else {
          // No move? Just fire.
          playFireSound();
          fireLaser();
        }
      }, 1000); // 1s thinking time

      return () => clearTimeout(timeout);
    }
  }, [gameMode, gameState.turn, gameState.winner, gameState.isFiring, gameState.grid, playPlaceSound, handleCellClick, playFireSound, fireLaser]);


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

    handleCellClick(x, y);
  };

  const onFireWrapper = () => {
    playFireSound();
    fireLaser();
  };

  if (!gameMode) {
    return <StartScreen onSelectMode={setGameMode} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      {/* Settings Button */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed top-4 left-4 z-50 p-3 bg-gray-900/80 border border-gray-700 text-gray-400 rounded-full hover:bg-gray-800 hover:text-white hover:border-gray-500 transition-all shadow-lg backdrop-blur-sm"
      >
        <SettingsIcon size={24} />
      </button>

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
              onSelectTool={setSelectedTool}
              turn="BLUE"
              isLocked={!!gameState.activeCell}
              hasOpponentBombs={gameState.grid.some(row => row.some(cell => cell.content === 'BOMB' && cell.owner === 'RED'))}
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
              onSelectTool={setSelectedTool}
              turn="RED"
              isLocked={!!gameState.activeCell}
              hasOpponentBombs={gameState.grid.some(row => row.some(cell => cell.content === 'BOMB' && cell.owner === 'BLUE'))}
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
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)]"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      <MusicControls />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default App;
