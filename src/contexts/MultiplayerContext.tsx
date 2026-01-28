import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface PlayerProfile {
    id: string;
    nickname: string;
    status: 'online' | 'in-lobby' | 'in-game';
}

export interface Match {
    id: string;
    player1_id: string;
    player2_id: string | null;
    status: 'pending' | 'active' | 'finished' | 'forfeited';
    current_turn: string;
    winner_id?: string | null;
    player1?: { nickname: string };
    player2?: { nickname: string };
    created_at: string;
}

interface MultiplayerContextType {
    user: User | null;
    nickname: string | null;
    setNickname: (name: string) => Promise<void>;
    isConnected: boolean;
    isMultiplayerReady: boolean;
    onlinePlayers: PlayerProfile[];
    findMatch: () => Promise<void>;
    challengePlayer: (opponentId: string) => Promise<void>;
    acceptChallenge: (matchId: string) => Promise<void>;
    declineChallenge: (matchId: string) => Promise<void>;
    isSearching: boolean;
    activeMatchId: string | null;
    matchDetails: Match | null;
    playerRole: 'BLUE' | 'RED' | null;
    incomingChallenges: Match[];
    opponentStatus: 'connected' | 'disconnected';
    updatePresenceStatus: (status: 'online' | 'in-lobby' | 'in-game') => void;
    notification: { message: string, type: 'info' | 'error' } | null;
    clearNotification: () => void;
    signOut: () => Promise<void>;
    ensureSession: () => Promise<void>;
    leaveMatch: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

export const MultiplayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [nickname, setNicknameState] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlinePlayers, setOnlinePlayers] = useState<PlayerProfile[]>([]);

    // Matchmaking State
    const [isSearching, setIsSearching] = useState(false);
    const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
    const [matchDetails, setMatchDetails] = useState<Match | null>(null);
    const [incomingChallenges, setIncomingChallenges] = useState<Match[]>([]);

    const ensureSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUser(session.user);
            setIsConnected(true);
            fetchNickname(session.user.id);
        } else {
            const { data: { user }, error } = await supabase.auth.signInAnonymously();
            if (error) {
                console.error("Auth error:", error);
            } else if (user) {
                setUser(user);
                setIsConnected(true);
            }
        }
    };

    useEffect(() => {
        ensureSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setIsConnected(!!session?.user);
            if (session?.user) {
                fetchNickname(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Presence Logic
    const [userStatus, setUserStatus] = useState<'online' | 'in-lobby' | 'in-game'>('online');
    const userStatusRef = React.useRef(userStatus);
    const [notification, setNotification] = useState<{ message: string, type: 'info' | 'error' } | null>(null);

    useEffect(() => {
        userStatusRef.current = userStatus;
    }, [userStatus]);

    const updatePresenceStatus = (status: 'online' | 'in-lobby' | 'in-game') => {
        console.log(`[MultiplayerContext] updatePresenceStatus called with: ${status}`);
        setUserStatus(status);
    };

    const clearNotification = () => setNotification(null);

    // Use a ref to hold the channel so we can update presence without reconnecting
    const channelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        if (!user || !nickname) return;

        console.log(`[MultiplayerContext] Setting up lobby channel for user: ${user.id} (${nickname})`);

        // Create channel only once (or when user/nick changes)
        const channel = supabase.channel('lobby', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });
        channelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                console.log('[MultiplayerContext] Presence SYNC received:', newState);

                const players: PlayerProfile[] = [];

                Object.values(newState).forEach((states) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const state = states[0] as any;
                    if (state && state.id && state.nickname) {
                        players.push({
                            id: state.id,
                            nickname: state.nickname,
                            status: state.status || 'online'
                        });
                    }
                });

                setOnlinePlayers(players);
            })
            .subscribe(async (status) => {
                console.log(`[MultiplayerContext] Lobby channel subscription status: ${status}`);
                if (status === 'SUBSCRIBED') {
                    // Initial track with current status (use ref to get latest value)
                    console.log(`[MultiplayerContext] Initial tracking with status: ${userStatusRef.current}`);
                    await channel.track({
                        id: user.id,
                        nickname: nickname,
                        status: userStatusRef.current
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
        // Remove userStatus from dependency to prevent re-subscribing on status change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, nickname]);

    // Separate effect to track status updates
    useEffect(() => {
        // Only track updates if we have a valid channel reference. 
        // Note: We don't check for 'SUBSCRIBED' status here because track() might queue or fail, 
        // but the initial SUBSCRIBED callback (above) will handle the authoritative initial state using the Ref.
        // This effect is mostly for SUBSEQUENT changes (e.g. lobby -> game).
        if (channelRef.current && user && nickname) {
            console.log(`[MultiplayerContext] Tracking status update to: ${userStatus}`);
            channelRef.current.track({
                id: user.id,
                nickname: nickname,
                status: userStatus
            }).catch(err => {
                // Ignore "Channel is not open" errors during initial connection, as the SUBSCRIBED callback will handle it.
                console.log("Tracking update attempt:", err.message || err);
            });
        }
    }, [userStatus, user, nickname]);

    // Garbage Collect Old Pending Matches ( > 10 mins old )
    useEffect(() => {
        if (!user) return;
        const cleanupOldMatches = async () => {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            await supabase
                .from('matches')
                .delete()
                .eq('status', 'pending')
                .lt('created_at', tenMinutesAgo);
        };
        cleanupOldMatches();
    }, [user]);

    // Incoming Challenges Subscription
    useEffect(() => {
        if (!user) return;

        // Fetch existing pending challenges
        const fetchChallenges = async () => {
            const { data } = await supabase
                .from('matches')
                .select('*, player1:player1_id(nickname)')
                .eq('player2_id', user.id)
                .eq('status', 'pending');

            if (data) setIncomingChallenges(data as any); // Cast because of join
        };
        fetchChallenges();

        const channel = supabase
            .channel(`challenges:${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'matches',
                filter: `player2_id=eq.${user.id}`
            }, async (payload) => {
                const newMatch = payload.new as Match;
                if (newMatch.status === 'pending') {
                    // Fetch sender name
                    const { data } = await supabase.from('players').select('nickname').eq('id', newMatch.player1_id).single();
                    const matchWithSender = { ...newMatch, player1: { nickname: data?.nickname || 'Unknown' } };
                    setIncomingChallenges(prev => [...prev, matchWithSender]);
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'matches',
                filter: `player2_id=eq.${user.id}`
            }, (payload) => {
                // If match is cancelled or finished, remove from list
                const updatedMatch = payload.new as Match;
                if (updatedMatch.status !== 'pending') {
                    setIncomingChallenges(prev => prev.filter(m => m.id !== updatedMatch.id));
                }
                if (updatedMatch.status === 'active' && activeMatchId === updatedMatch.id) {
                    // Challenge accepted (handled in acceptChallenge too, but good for safety)
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, activeMatchId]);


    // Active Match Subscription and Detail Fetching
    useEffect(() => {
        if (!activeMatchId) {
            setMatchDetails(null);
            return;
        }

        const fetchMatch = async () => {
            const { data } = await supabase
                .from('matches')
                .select('*, player1:player1_id(nickname), player2:player2_id(nickname)')
                .eq('id', activeMatchId)
                .single();
            if (data) setMatchDetails(data as any);
        };
        fetchMatch();

        const channel = supabase
            .channel(`match:${activeMatchId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'matches',
                filter: `id=eq.${activeMatchId}`
            }, (payload) => {
                // Realtime payload doesn't have joins. Refetch.
                fetchMatch();

                const newMatch = payload.new as Match;
                // setMatchDetails(newMatch); // Don't set directly if we want the join data, let fetchMatch handle it.
                // Actually, for immediate status update (like 'active'), we might want to check payload,
                // but fetchMatch is fast enough.

                if (newMatch.status === 'active' && isSearching) {
                    setIsSearching(false);
                }

                if (newMatch.status === 'forfeited') {
                    // Only auto-clear if we were NOT in an active game (e.g. declined challenge).
                    // If we were active, leave it so the UI can show the "Opponent Forfeit" modal.
                    // We check if we are currently searching or if status was pending.
                    // Since matchDetails might be stale in this closure without dependency update, 
                    // we rely on the fact that if we are 'searching', it was pending.
                    if (isSearching) {
                        console.log('[MultiplayerContext] Challenge declined');
                        setActiveMatchId(null);
                        setMatchDetails(null);
                        setIsSearching(false);
                    } else {
                        console.log('[MultiplayerContext] Match forfeited during game - waiting for UI to handle');
                        // Ensure we update local details so UI sees the new status
                        setMatchDetails(newMatch);
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeMatchId, isSearching]);

    // Match Presence Logic (Detect Disconnects)
    const [opponentStatus, setOpponentStatus] = useState<'connected' | 'disconnected'>('connected'); // Default to connected to avoid flash

    useEffect(() => {
        if (!activeMatchId || !matchDetails || matchDetails.status !== 'active' || !user) {
            return;
        }

        const opponentId = matchDetails.player1_id === user.id ? matchDetails.player2_id : matchDetails.player1_id;
        if (!opponentId) return;

        const channel = supabase.channel(`match_presence:${activeMatchId}`, {
            config: { presence: { key: user.id } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const isOpponentPresent = Object.keys(state).includes(opponentId);
                setOpponentStatus(isOpponentPresent ? 'connected' : 'disconnected');
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeMatchId, matchDetails, user]);


    const fetchNickname = async (userId: string) => {
        const { data } = await supabase
            .from('players')
            .select('nickname')
            .eq('id', userId)
            .single();

        if (data) {
            setNicknameState(data.nickname);
        }
    };

    const setNickname = async (name: string) => {
        if (!user) return;

        // Check availability (Client-side enforcement for UX)
        const { count } = await supabase
            .from('players')
            .select('id', { count: 'exact', head: true })
            .ilike('nickname', name) // Case-insensitive check
            .neq('id', user.id);

        if (count && count > 0) {
            throw new Error('Nickname already taken');
        }

        const { error } = await supabase
            .from('players')
            .upsert({ id: user.id, nickname: name });

        if (!error) {
            setNicknameState(name);
        } else {
            console.error("Error setting nickname:", error);
            throw error;
        }
    };

    const findMatch = async () => {
        if (!user) return;
        setIsSearching(true);
        setActiveMatchId(null);
        setMatchDetails(null);

        try {
            // 1. Try to join pending match
            const { data: pendingMatches } = await supabase
                .from('matches')
                .select('id, player1_id')
                .eq('status', 'pending')
                .is('player2_id', null)
                .neq('player1_id', user.id); // Get all candidates

            if (pendingMatches && pendingMatches.length > 0) {
                // Find a match where the player is currently IN LOBBY
                const validMatch = pendingMatches.find(m =>
                    onlinePlayers.some(op => op.id === m.player1_id && op.status === 'in-lobby')
                );

                if (validMatch) {
                    const matchId = validMatch.id;
                    const { error } = await supabase
                        .from('matches')
                        .update({
                            player2_id: user.id,
                            status: 'active'
                        })
                        .eq('id', matchId)
                        .is('player2_id', null); // Optimistic lock

                    if (!error) {
                        setActiveMatchId(matchId);
                        setIsSearching(false); // Match is active immediately
                        return;
                    }
                }
            }

            // 2. Create new match if join failed
            const { data: newMatch, error } = await supabase
                .from('matches')
                .insert({
                    player1_id: user.id,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;
            if (newMatch) {
                setActiveMatchId(newMatch.id);
                // Remain searching until opponent joins
            }

        } catch (e) {
            console.error("Matchmaking error", e);
            setIsSearching(false);
        }
    };

    const challengePlayer = async (opponentId: string) => {
        if (!user) return;
        setIsSearching(true); // Reuse searching state for UI "Waiting..."
        setActiveMatchId(null);

        const { data: newMatch, error } = await supabase
            .from('matches')
            .insert({
                player1_id: user.id,
                player2_id: opponentId,
                status: 'pending'
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            setIsSearching(false);
            return;
        }

        if (newMatch) {
            setActiveMatchId(newMatch.id);
        }
    };

    const acceptChallenge = async (matchId: string) => {
        if (!user) return;
        const { error } = await supabase
            .from('matches')
            .update({ status: 'active' })
            .eq('id', matchId)
            .eq('player2_id', user.id);

        if (!error) {
            setActiveMatchId(matchId);
            setIncomingChallenges(prev => prev.filter(m => m.id !== matchId));
        }
    };

    const declineChallenge = async (matchId: string) => {
        if (!user) return;
        await supabase
            .from('matches')
            .update({ status: 'forfeited' }) // Or just delete?
            .eq('id', matchId)
            .eq('player2_id', user.id);

        setIncomingChallenges(prev => prev.filter(m => m.id !== matchId));
    };

    const leaveMatch = () => {
        setActiveMatchId(null);
        setMatchDetails(null);
    };

    const signOut = async () => {
        if (user) {
            // Remove matches where user is involved
            await supabase.from('matches').delete().or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`);
            // Remove player record from DB so nickname becomes free
            await supabase.from('players').delete().eq('id', user.id);
        }
        await supabase.auth.signOut();
        setUser(null);
        setNicknameState(null);
        setIsConnected(false);
        // presence channel cleanup will be handled by effects since user becomes null
    };

    const playerRole = useMemo(() => {
        if (!user || !matchDetails) return null;
        if (matchDetails.player1_id === user.id) return 'BLUE';
        if (matchDetails.player2_id === user.id) return 'RED';
        return null;
    }, [user, matchDetails]);

    // Derived state: only show challenges from players currently in the lobby AND valid within 1 minute
    const visibleChallenges = useMemo(() => {
        const now = Date.now();
        return incomingChallenges.filter(challenge => {
            const isRecents = (now - new Date(challenge.created_at).getTime()) < 60000; // 1 minute expiry
            const isChallengerInLobby = onlinePlayers.some(p => p.id === challenge.player1_id && p.status === 'in-lobby');
            return isRecents && isChallengerInLobby;
        });
    }, [incomingChallenges, onlinePlayers]);

    return (
        <MultiplayerContext.Provider value={{
            user,
            nickname,
            setNickname,
            isConnected,
            isMultiplayerReady: !!user && !!nickname,
            onlinePlayers,
            findMatch,
            challengePlayer,
            acceptChallenge,
            declineChallenge,
            isSearching,
            activeMatchId,
            matchDetails,
            playerRole,
            incomingChallenges: visibleChallenges,
            opponentStatus,
            updatePresenceStatus,
            notification,
            clearNotification,
            signOut,
            ensureSession,
            leaveMatch
        }}>
            {children}
        </MultiplayerContext.Provider>
    );
};

export const useMultiplayer = () => {
    const context = useContext(MultiplayerContext);
    if (!context) {
        throw new Error('useMultiplayer must be used within a MultiplayerProvider');
    }
    return context;
};
