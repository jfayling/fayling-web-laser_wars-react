import React from 'react';
import { X, Music, Volume2, VolumeX, Brain } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
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
                            <Brain size={20} />
                            <label className="font-semibold tracking-wide">AI SMARTNESS</label>
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

                <div className="mt-8 pt-6 border-t border-gray-800 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors uppercase tracking-wider text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
