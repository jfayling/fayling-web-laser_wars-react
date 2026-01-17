import React from 'react';
import { X, Music, Volume2, VolumeX, Brain, Cpu } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRestart: () => void;
    onQuit: () => void;
    isTrainingMode?: boolean;
    setIsTrainingMode?: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onRestart, onQuit, isTrainingMode, setIsTrainingMode }) => {
    const {
        musicEnabled, setMusicEnabled,
        musicVolume, setMusicVolume,
        sfxEnabled, setSfxEnabled,
        sfxVolume, setSfxVolume,
        aiDifficulty, setAiDifficulty
    } = useSettings();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                    SETTINGS
                </h2>

                <div className="space-y-8">
                    {/* Music Volume */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-cyan-400">
                                {musicEnabled ? <Music size={20} /> : <VolumeX size={20} />}
                                <label className="font-semibold tracking-wide">MUSIC</label>
                            </div>
                            <button
                                onClick={() => setMusicEnabled(!musicEnabled)}
                                className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative ${musicEnabled ? 'bg-cyan-500' : 'bg-gray-700'
                                    }`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${musicEnabled ? 'left-7' : 'left-1'
                                    }`} />
                            </button>
                        </div>

                        <div className={`transition-opacity duration-200 ${musicEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={musicVolume}
                                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                                    className="w-full accent-cyan-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="w-12 text-right font-mono text-gray-400">
                                    {Math.round(musicVolume * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* SFX Volume */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-yellow-400">
                                {sfxEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                <label className="font-semibold tracking-wide">SOUND EFFECTS</label>
                            </div>
                            <button
                                onClick={() => setSfxEnabled(!sfxEnabled)}
                                className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative ${sfxEnabled ? 'bg-yellow-500' : 'bg-gray-700'
                                    }`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${sfxEnabled ? 'left-7' : 'left-1'
                                    }`} />
                            </button>
                        </div>

                        <div className={`transition-opacity duration-200 ${sfxEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={sfxVolume}
                                    onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                                    className="w-full accent-yellow-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="w-12 text-right font-mono text-gray-400">
                                    {Math.round(sfxVolume * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* AI Difficulty */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-purple-400 mb-2">
                            <Cpu size={20} />
                            <label className="font-semibold tracking-wide">TACTICAL ENGINE</label>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setAiDifficulty(level)}
                                    className={`py-2 px-1 rounded-lg text-sm font-bold transition-all ${aiDifficulty === level
                                        ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                        }`}
                                >
                                    {level === 'Easy' ? 'DUMB' : level === 'Medium' ? 'NORMAL' : 'SMART'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Training Mode */}
                {(() => {
                    const params = new URLSearchParams(window.location.search);
                    const features = params.get('features')?.split(',') || [];
                    const allowTraining = features.includes('ALLOW_TRAINING') || features.includes('AUTO_START_TRAINING');

                    if (!allowTraining) return null;

                    return setIsTrainingMode && isTrainingMode !== undefined && (
                        <div className="space-y-3 pt-4 border-t border-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-green-400">
                                    <Brain size={20} />
                                    <label className="font-semibold tracking-wide">TRAINING MODE</label>
                                </div>
                                <button
                                    onClick={() => setIsTrainingMode(!isTrainingMode)}
                                    className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative ${isTrainingMode ? 'bg-green-500' : 'bg-gray-700'
                                        }`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${isTrainingMode ? 'left-7' : 'left-1'
                                        }`} />
                                </button>
                            </div>
                            <p className="text-xs text-gray-400">
                                Record game moves to a JSON file for AI training.
                            </p>
                        </div>
                    );
                })()}

                <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={onRestart}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                        >
                            Restart Game
                        </button>
                        <button
                            onClick={onQuit}
                            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                        >
                            Quit to Menu
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg font-semibold transition-colors uppercase tracking-wider text-xs"
                    >
                        Close Menu
                    </button>
                </div>
            </div>
        </div >
    );
};
