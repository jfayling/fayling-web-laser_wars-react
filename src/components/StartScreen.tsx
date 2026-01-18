import React, { useState } from 'react';
import { Users, Monitor, Zap, HelpCircle, Play } from 'lucide-react';
import { HowToPlayModal } from './HowToPlayModal';

interface StartScreenProps {
    onSelectMode: (mode: 'PVP' | 'PVE' | 'SPECTATOR' | 'PLAYBACK', difficulty?: import('../types').Difficulty) => void;
    defaultDifficulty: import('../types').Difficulty;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onSelectMode, defaultDifficulty }) => {
    const [showHowToPlay, setShowHowToPlay] = useState(false);
    const [showDifficultySelect, setShowDifficultySelect] = useState(false);
    const [selectedDifficulty, setSelectedDifficulty] = useState<import('../types').Difficulty>(defaultDifficulty);
    const [pendingMode, setPendingMode] = useState<'PVE' | 'SPECTATOR' | null>(null);

    // Check if training mode is enabled via feature flags
    const params = new URLSearchParams(window.location.search);
    const features = params.get('features')?.split(',') || [];
    const allowTraining = features.includes('ALLOW_TRAINING') || features.includes('AUTO_START_TRAINING');

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-950/90 backdrop-blur-sm p-4">
            <div className="flex flex-col items-center gap-4 md:gap-8 p-6 md:p-12 bg-gray-900 border border-gray-800 rounded-3xl shadow-[0_0_50px_rgba(59,130,246,0.2)] relative w-full max-w-4xl">

                <button
                    onClick={() => setShowHowToPlay(true)}
                    className="absolute top-6 right-6 text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-2 text-sm font-semibold uppercase tracking-wider"
                >
                    <HelpCircle size={20} />
                    How to Play
                </button>

                <div className="text-center mb-4 mt-8 md:mt-8">
                    <h1 className="text-4xl md:text-6xl font-bold mb-4 flex items-center justify-center gap-2 md:gap-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-500">
                        <Zap size={32} className="md:w-16 md:h-16 text-yellow-400 fill-yellow-400" />
                        LASER WARS
                        <Zap size={32} className="md:w-16 md:h-16 text-yellow-400 fill-yellow-400" />
                    </h1>
                    <p className="text-lg md:text-xl text-gray-400">Select Game Mode</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full md:w-auto">
                    <button
                        onClick={() => onSelectMode('PVP')}
                        className="flex flex-row md:flex-col items-center justify-center md:justify-center p-4 md:p-0 gap-4 md:gap-0 w-full md:w-48 h-20 md:h-48 bg-gray-800 rounded-2xl border-2 border-transparent hover:border-blue-500 hover:bg-gray-800/80 transition-all hover:scale-105 group"
                    >
                        <Users size={32} className="md:w-12 md:h-12 md:mb-4 text-blue-400 group-hover:text-blue-300" />
                        <div className="text-left md:text-center">
                            <span className="text-xl md:text-2xl font-bold text-white block">PvP</span>
                            <span className="text-sm text-gray-400 mt-0 md:mt-2 block">Local Multiplayer</span>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            setSelectedDifficulty(defaultDifficulty);
                            setPendingMode('PVE');
                            setShowDifficultySelect(true);
                        }}
                        className="flex flex-row md:flex-col items-center justify-center md:justify-center p-4 md:p-0 gap-4 md:gap-0 w-full md:w-48 h-20 md:h-48 bg-gray-800 rounded-2xl border-2 border-transparent hover:border-red-500 hover:bg-gray-800/80 transition-all hover:scale-105 group"
                    >
                        <Monitor size={32} className="md:w-12 md:h-12 md:mb-4 text-red-500 group-hover:text-red-300" />
                        <div className="text-left md:text-center">
                            <span className="text-xl md:text-2xl font-bold text-white block">PvE</span>
                            <span className="text-sm text-gray-400 mt-0 md:mt-2 block">Vs Computer</span>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            setSelectedDifficulty(defaultDifficulty);
                            setPendingMode('SPECTATOR');
                            setShowDifficultySelect(true);
                        }}
                        className="flex flex-row md:flex-col items-center justify-center md:justify-center p-4 md:p-0 gap-4 md:gap-0 w-full md:w-48 h-20 md:h-48 bg-gray-800 rounded-2xl border-2 border-transparent hover:border-yellow-500 hover:bg-gray-800/80 transition-all hover:scale-105 group"
                    >
                        <Zap size={32} className="md:w-12 md:h-12 md:mb-4 text-yellow-500 group-hover:text-yellow-300" />
                        <div className="text-left md:text-center">
                            <span className="text-xl md:text-2xl font-bold text-white block">SPECTATOR</span>
                            <span className="text-sm text-gray-400 mt-0 md:mt-2 block">AI vs AI</span>
                        </div>
                    </button>

                    {allowTraining && (
                        <button
                            onClick={() => onSelectMode('PLAYBACK')}
                            className="flex flex-row md:flex-col items-center justify-center md:justify-center p-4 md:p-0 gap-4 md:gap-0 w-full md:w-48 h-20 md:h-48 bg-gray-800 rounded-2xl border-2 border-transparent hover:border-purple-500 hover:bg-gray-800/80 transition-all hover:scale-105 group"
                        >
                            <Play size={32} className="md:w-12 md:h-12 md:mb-4 text-purple-400 group-hover:text-purple-300" />
                            <div className="text-left md:text-center">
                                <span className="text-xl md:text-2xl font-bold text-white block">Playback</span>
                                <span className="text-sm text-gray-400 mt-0 md:mt-2 block">Review Games</span>
                            </div>
                        </button>
                    )}
                </div>
            </div>

            <HowToPlayModal
                isOpen={showHowToPlay}
                onClose={() => setShowHowToPlay(false)}
            />

            {/* Difficulty Selection Modal */}
            {showDifficultySelect && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl max-w-md w-full shadow-2xl transform scale-100 transition-all">
                        <h2 className="text-3xl font-bold mb-6 text-white text-center">Select Tactical Engine</h2>

                        <div className="flex flex-col gap-3 mb-8">
                            {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
                                <button
                                    key={diff}
                                    onClick={() => setSelectedDifficulty(diff)}
                                    className={`p-4 rounded-xl border-2 transition-all flex justify-between items-center ${selectedDifficulty === diff
                                        ? 'border-red-500 bg-red-900/20 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500 hover:bg-gray-750'
                                        }`}
                                >
                                    <span className="text-xl font-bold">
                                        {diff === 'Easy' ? 'DUMB' : diff === 'Medium' ? 'NORMAL' : 'SMART'}
                                    </span>
                                    {selectedDifficulty === diff && <Zap size={20} className="text-red-500 fill-red-500" />}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowDifficultySelect(false)}
                                className="flex-1 py-3 px-6 rounded-xl bg-gray-800 text-gray-300 font-bold hover:bg-gray-700 transition-colors"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={() => {
                                    if (pendingMode) {
                                        onSelectMode(pendingMode, selectedDifficulty);
                                    }
                                }}
                                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:scale-105 transition-all"
                            >
                                START GAME
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
