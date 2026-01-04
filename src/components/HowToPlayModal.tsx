import React from 'react';
import { X, Trophy, Crosshair, Box, Shield, Zap, RefreshCw, Skull } from 'lucide-react';

interface HowToPlayModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <h2 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center gap-3">
                    <Trophy className="text-yellow-500" size={32} />
                    HOW TO PLAY
                    <Trophy className="text-yellow-500" size={32} />
                </h2>

                <div className="space-y-8 text-gray-300">

                    {/* Section 1: Objective */}
                    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                        <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                            <Crosshair className="text-green-400" />
                            Objective
                        </h3>
                        <p>
                            Eliminate the opponent by hitting their <span className="font-bold text-blue-400">Source</span> with your laser.
                            Protect your own Source at all costs!
                        </p>
                    </div>

                    {/* Section 2: Tools */}
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Box className="text-purple-400" />
                            Tools & Weapons
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3 bg-gray-800 p-4 rounded-lg">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                    <RefreshCw size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Mirror</h4>
                                    <p className="text-sm">Reflects the laser 90 degrees. Can be rotated.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-gray-800 p-4 rounded-lg">
                                <div className="p-2 bg-gray-500/20 rounded-lg text-gray-400">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Wall</h4>
                                    <p className="text-sm">Blocks the laser completely.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-gray-800 p-4 rounded-lg">
                                <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
                                    <Skull size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Bomb</h4>
                                    <p className="text-sm">Explodes when hit by a laser, destroying nearby items.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-gray-800 p-4 rounded-lg">
                                <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Move Source</h4>
                                    <p className="text-sm">Reposition your Source to a safer location.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Gameplay */}
                    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                        <h3 className="text-xl font-bold text-white mb-3">Gameplay</h3>
                        <ul className="list-disc list-inside space-y-2 ml-2">
                            <li>Players take turns placing <strong>ONE</strong> item per turn.</li>
                            <li>Or, you can fire your laser to test the path.</li>
                            <li>Be careful! A reflected laser can hit your own source.</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-800 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-bold transition-colors uppercase tracking-wider"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
};
