import React, { useState } from 'react';
import { Users, Monitor, Zap, HelpCircle } from 'lucide-react';
import { HowToPlayModal } from './HowToPlayModal';

interface StartScreenProps {
    onSelectMode: (mode: 'PVP' | 'PVE') => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onSelectMode }) => {
    const [showHowToPlay, setShowHowToPlay] = useState(false);

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-950/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-8 p-12 bg-gray-900 border border-gray-800 rounded-3xl shadow-[0_0_50px_rgba(59,130,246,0.2)] relative">

                <button
                    onClick={() => setShowHowToPlay(true)}
                    className="absolute top-6 right-6 text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-2 text-sm font-semibold uppercase tracking-wider"
                >
                    <HelpCircle size={20} />
                    How to Play
                </button>

                <div className="text-center mb-4 mt-8">
                    <h1 className="text-6xl font-bold mb-4 flex items-center justify-center gap-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-500">
                        <Zap size={64} className="text-yellow-400 fill-yellow-400" />
                        LASER WARS
                        <Zap size={64} className="text-yellow-400 fill-yellow-400" />
                    </h1>
                    <p className="text-xl text-gray-400">Select Game Mode</p>
                </div>

                <div className="flex gap-6">
                    <button
                        onClick={() => onSelectMode('PVP')}
                        className="flex flex-col items-center justify-center w-48 h-48 bg-gray-800 rounded-2xl border-2 border-transparent hover:border-blue-500 hover:bg-gray-800/80 transition-all hover:scale-105 group"
                    >
                        <Users size={48} className="mb-4 text-blue-400 group-hover:text-blue-300" />
                        <span className="text-2xl font-bold text-white">PvP</span>
                        <span className="text-sm text-gray-400 mt-2">Local Multiplayer</span>
                    </button>

                    <button
                        onClick={() => onSelectMode('PVE')}
                        className="flex flex-col items-center justify-center w-48 h-48 bg-gray-800 rounded-2xl border-2 border-transparent hover:border-red-500 hover:bg-gray-800/80 transition-all hover:scale-105 group"
                    >
                        <Monitor size={48} className="mb-4 text-red-500 group-hover:text-red-300" />
                        <span className="text-2xl font-bold text-white">PvE</span>
                        <span className="text-sm text-gray-400 mt-2">Vs Computer</span>
                    </button>
                </div>
            </div>

            <HowToPlayModal
                isOpen={showHowToPlay}
                onClose={() => setShowHowToPlay(false)}
            />
        </div>
    );
};
