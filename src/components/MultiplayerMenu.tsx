import { useState, useEffect } from 'react';
import { useMultiplayer } from '../contexts/MultiplayerContext';
import { Users, User, ArrowLeft } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

interface MultiplayerMenuProps {
    onBack: () => void;
}

export const MultiplayerMenu = ({ onBack }: MultiplayerMenuProps) => {
    const { isMultiplayerReady, nickname, setNickname, onlinePlayers, isConnected, findMatch, isSearching, challengePlayer, incomingChallenges, acceptChallenge, declineChallenge, updatePresenceStatus, notification, clearNotification, signOut, ensureSession } = useMultiplayer();
    const [tempNickname, setTempNickname] = useState(nickname || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

    useEffect(() => {
        if (isMultiplayerReady) {
            console.log("[MultiplayerMenu] Mounting - Setting status to in-lobby");
            updatePresenceStatus('in-lobby');
        }
        return () => {
            console.log("[MultiplayerMenu] Unmounting - Setting status to online");
            updatePresenceStatus('online'); // Reset when leaving menu
        };
    }, [isMultiplayerReady]);

    const handleSetNickname = async () => {
        if (!tempNickname.trim()) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await setNickname(tempNickname.trim());
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to set nickname");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!isConnected) {
            ensureSession();
        }
    }, [isConnected, ensureSession]);

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white">
                <p>Connecting to server...</p>
            </div>
        );
    }

    if (!isMultiplayerReady) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl max-w-md w-full mx-auto mt-20">
                <h2 className="text-2xl font-bold mb-6 text-blue-400">Enter Player Name</h2>
                <div className="flex flex-col gap-4 w-full">
                    <input
                        type="text"
                        value={tempNickname}
                        onChange={(e) => {
                            setTempNickname(e.target.value);
                            setError(null);
                        }}
                        placeholder="Your Nickname"
                        className={`p-4 bg-gray-950 border ${error ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:border-blue-500 focus:outline-none`}
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button
                        onClick={handleSetNickname}
                        disabled={isSubmitting || !tempNickname.trim()}
                        className="p-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-white transition-colors"
                    >
                        {isSubmitting ? 'Saving...' : 'Join Lobby'}
                    </button>
                    <button onClick={onBack} className="text-gray-500 hover:text-gray-300">Cancel</button>
                </div>
            </div>
        );
    }

    const lobbyPlayers = onlinePlayers.filter(p => p.status === 'in-lobby');

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-8">
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={24} />
                    <span>Back</span>
                </button>
                <button
                    onClick={() => setIsSignOutModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors group"
                    title="Sign Out"
                >
                    <User size={20} className="text-blue-400 group-hover:text-red-400 transition-colors" />
                    <span className="font-bold group-hover:text-red-400 transition-colors">{nickname}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Lobby / Players List */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col h-[500px]">
                    <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Users size={20} className="text-green-400" />
                            Lobby Players ({lobbyPlayers.length})
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {lobbyPlayers.map(player => (
                            <div
                                key={player.id}
                                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                <span className="font-medium text-gray-200">{player.nickname}</span>
                                {player.nickname === nickname && <span className="text-xs text-gray-500 italic">(You)</span>}
                                {player.nickname !== nickname && (
                                    <button
                                        onClick={() => challengePlayer(player.id)}
                                        className="px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-600/50 rounded-md text-sm transition-all"
                                    >
                                        Challenge
                                    </button>
                                )}
                            </div>
                        ))}
                        {lobbyPlayers.length === 0 && (
                            <div className="text-center text-gray-500 mt-10">No other players in lobby</div>
                        )}
                    </div>
                </div>

                {/* Matchmaking / Challenges */}
                <div className="flex flex-col gap-4">

                    {/* Incoming Challenges */}
                    {incomingChallenges.length > 0 && (
                        <div className="bg-gray-800 border border-yellow-500/50 rounded-xl p-4 animate-in slide-in-from-right">
                            <h3 className="text-yellow-400 font-bold mb-3">Incoming Challenges</h3>
                            <div className="space-y-2">
                                {incomingChallenges.map(match => (
                                    <div key={match.id} className="bg-gray-900 p-3 rounded-lg flex items-center justify-between">
                                        <div>
                                            <span className="text-sm text-gray-400">Challenger:</span>
                                            <div className="font-bold">{match.player1?.nickname || 'Unknown'}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => acceptChallenge(match.id)}
                                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500 text-sm font-bold"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => declineChallenge(match.id)}
                                                className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-600/50 rounded hover:bg-red-600/40 text-sm"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/30 p-8 rounded-xl flex flex-col items-center justify-center text-center h-[240px]">
                        <h3 className="text-2xl font-bold mb-2 text-white">Quick Match</h3>
                        {isSearching ? (
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                                <p className="text-gray-400">Searching / Waiting...</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-gray-400 mb-6">Find an opponent automatically</p>
                                <button
                                    onClick={findMatch}
                                    className="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                >
                                    FIND MATCH
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification Overlay */}
            {notification && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-red-500 p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-white mb-2">{notification.type === 'error' ? 'Notice' : 'Info'}</h3>
                        <p className="text-gray-300 mb-6">{notification.message}</p>
                        <button
                            onClick={clearNotification}
                            className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold text-white transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isSignOutModalOpen}
                title="Sign Out"
                message="Are you sure you want to sign out? This will forget your current session."
                confirmText="Sign Out"
                type="warning"
                onCancel={() => setIsSignOutModalOpen(false)}
                onConfirm={async () => {
                    onBack(); // Navigate away first to avoid "Connecting..." flicker
                    await signOut();
                    setIsSignOutModalOpen(false);
                }}
            />
        </div>
    );
};
