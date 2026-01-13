import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Zap, FileText } from 'lucide-react';
import { Board } from './Board';
import { PlaybackControls } from './PlaybackControls';
import { JsonViewerModal } from './JsonViewerModal';
import { usePlaybackState } from '../hooks/usePlaybackState';
import type { GameSession } from '../types';

interface PlaybackScreenProps {
    onExit: () => void;
    initialSession?: GameSession;
}

export const PlaybackScreen: React.FC<PlaybackScreenProps> = ({ onExit, initialSession }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isJsonViewerOpen, setIsJsonViewerOpen] = useState(false);
    const {
        playbackState,
        error,
        loadTrainingFile,
        loadSessionData,
        stepForward,
        stepBackward,
        jumpToStart,
        jumpToEnd,
        getCurrentMove,
        canStepForward,
        canStepBackward,
        totalMoves
    } = usePlaybackState();

    // Load initial session if provided
    useEffect(() => {
        if (initialSession) {
            loadSessionData(initialSession);
        }
    }, [initialSession, loadSessionData]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            loadTrainingFile(file);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
            {/* Exit Button */}
            <button
                onClick={onExit}
                className="fixed top-4 left-4 z-50 p-3 bg-gray-900/80 border border-gray-700 text-gray-400 rounded-full hover:bg-gray-800 hover:text-white hover:border-gray-500 transition-all shadow-lg backdrop-blur-sm"
                title="Exit Playback"
            >
                <X size={24} />
            </button>

            {/* View JSON Button - only show when session is loaded */}
            {playbackState.session && (
                <button
                    onClick={() => setIsJsonViewerOpen(true)}
                    className="fixed top-4 left-20 z-50 p-3 bg-gray-900/80 border border-gray-700 text-blue-400 rounded-full hover:bg-gray-800 hover:text-white hover:border-gray-500 transition-all shadow-lg backdrop-blur-sm"
                    title="View JSON"
                >
                    <FileText size={24} />
                </button>
            )}

            {/* Header */}
            <header className="mb-8 text-center">
                <h1 className="text-5xl font-bold mb-2 flex items-center justify-center gap-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-500">
                    <Zap size={48} className="text-yellow-400 fill-yellow-400" />
                    PLAYBACK MODE
                    <Zap size={48} className="text-yellow-400 fill-yellow-400" />
                </h1>
                <p className="text-gray-400">Review and analyze recorded games</p>
            </header>

            {/* File Upload Section */}
            {!playbackState.session && (
                <div className="max-w-2xl w-full">
                    <div className="bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl p-12 text-center hover:border-blue-500 transition-colors">
                        <Upload size={64} className="mx-auto mb-4 text-gray-600" />
                        <h2 className="text-2xl font-bold mb-2">Load Training File</h2>
                        <p className="text-gray-400 mb-6">
                            Upload a training JSON file to begin playback
                        </p>
                        <button
                            onClick={handleUploadClick}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors"
                        >
                            Choose File
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </div>

                    {error && (
                        <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-400">
                            <strong>Error:</strong> {error}
                        </div>
                    )}
                </div>
            )}

            {/* Playback View */}
            {playbackState.session && (
                <div className="w-full max-w-7xl">
                    {/* Session Metadata */}
                    <div className="mb-6 bg-gray-900 border border-gray-700 rounded-xl p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Date:</span>
                                <span className="ml-2 text-white">{formatDate(playbackState.session.date)}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Mode:</span>
                                <span className="ml-2 text-white">{playbackState.session.mode}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Winner:</span>
                                <span className={`ml-2 font-bold ${playbackState.session.winner === 'BLUE' ? 'text-blue-400' : 'text-red-500'}`}>
                                    {playbackState.session.winner || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">Total Moves:</span>
                                <span className="ml-2 text-white">{playbackState.session.moves.length}</span>
                            </div>
                        </div>

                        {/* AI Configuration */}
                        {playbackState.session.aiConfig && (
                            <div className="mt-3 pt-3 border-t border-gray-700">
                                <div className="text-xs text-gray-500 mb-1">AI Configuration:</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500">Version:</span>
                                        <span className="ml-2 text-white">{playbackState.session.aiConfig.version}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Difficulty:</span>
                                        <span className="ml-2 text-white">{playbackState.session.aiConfig.difficulty}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Players:</span>
                                        <span className="ml-2 text-blue-400">{playbackState.session.playerBlue}</span>
                                        <span className="text-gray-500"> vs </span>
                                        <span className="text-red-500">{playbackState.session.playerRed}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Main Playback Area */}
                    <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
                        {/* Game Board */}
                        <div className="flex-shrink-0">
                            <Board
                                gameState={playbackState.gameState}
                                onCellClick={() => { }} // Read-only in playback mode
                                isTrainingMode={true}
                            />
                        </div>

                        {/* Playback Controls */}
                        <div className="flex-shrink-0 w-full lg:w-96">
                            <PlaybackControls
                                currentMoveIndex={playbackState.currentMoveIndex}
                                totalMoves={totalMoves}
                                canStepForward={canStepForward}
                                canStepBackward={canStepBackward}
                                onStepForward={stepForward}
                                onStepBackward={stepBackward}
                                onJumpToStart={jumpToStart}
                                onJumpToEnd={jumpToEnd}
                                currentMove={getCurrentMove()}
                            />

                            {/* Change File Button */}
                            <button
                                onClick={handleUploadClick}
                                className="mt-4 w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 hover:border-gray-500 transition-all text-sm"
                            >
                                Load Different File
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* JSON Viewer Modal */}
            {playbackState.session && (
                <JsonViewerModal
                    isOpen={isJsonViewerOpen}
                    onClose={() => setIsJsonViewerOpen(false)}
                    sessionData={playbackState.session}
                />
            )}
        </div>
    );
};
