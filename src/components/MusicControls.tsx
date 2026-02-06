import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface MusicControlsProps {
    isGamePaused?: boolean;
    /** When false, audio is loaded but not played (e.g. start screen / lobby). Enables preloading so music starts instantly when entering a game. */
    isInGame?: boolean;
}

export const MusicControls: React.FC<MusicControlsProps> = ({ isGamePaused = false, isInGame = true }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { musicVolume, musicEnabled } = useSettings();

    // Playlist State - initialize with shuffle so audio can start on first mount (no extra render delay)
    const SONGS = [
        'music/laserwars_1.mp3',
        'music/laserwars_2.mp3',
        'music/laserwars_3.mp3',
        'music/laserwars_4.mp3'
    ];

    const [playlist] = useState<string[]>(() => [...SONGS].sort(() => Math.random() - 0.5));
    const [currentSongIndex, setCurrentSongIndex] = useState(0);

    // Initialize Audio and Handle Song Changes
    useEffect(() => {
        if (playlist.length === 0) return;

        const songUrl = `${import.meta.env.BASE_URL}${playlist[currentSongIndex]}`;

        const shouldPlay = musicEnabled && !isGamePaused && isInGame;

        const audio = new Audio(songUrl);
        audioRef.current = audio;

        audio.volume = musicVolume;
        audio.loop = false;

        const handleEnded = () => {
            setCurrentSongIndex(prev => (prev + 1) % playlist.length);
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        // Start loading immediately; play as soon as enough is buffered to avoid delay
        const startWhenReady = () => {
            if (!shouldPlay) return;
            audio.removeEventListener('canplaythrough', startWhenReady);
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Auto-play prevented by browser:", error);
                    setIsPlaying(false);
                });
            }
        };

        if (shouldPlay) {
            if (audio.readyState >= 3) {
                // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA - can play immediately
                audio.play().catch(error => {
                    console.log("Auto-play prevented by browser:", error);
                    setIsPlaying(false);
                });
            } else {
                audio.addEventListener('canplaythrough', startWhenReady, { once: true });
            }
        }
        audio.load();

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('canplaythrough', startWhenReady);
            audio.pause();
            audioRef.current = null;
        };
    }, [playlist, currentSongIndex]);

    // Handle Enable/Disable, Game Pause, and isInGame without recreating audio
    useEffect(() => {
        if (!audioRef.current) return;

        if (musicEnabled && !isGamePaused && isInGame) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Auto-play prevented by browser (toggle/resume):", error);
                });
            }
        } else {
            audioRef.current.pause();
        }
    }, [musicEnabled, isGamePaused, isInGame]);


    // Handle Volume changes dynamically
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = musicVolume;
        }
    }, [musicVolume]);

    const toggleMusic = () => {
        if (!audioRef.current) return;
        // This toggle allows local pause even if enabled in settings
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            if (!musicEnabled) return;
            audioRef.current.play().catch(console.error);
        }
    };

    // Only show the button when in a game (music is preloaded on start/lobby but not shown)
    if (!isInGame) return null;

    return (
        <button
            onClick={toggleMusic}
            className={`fixed top-4 right-4 z-50 p-3 rounded-full transition-all backdrop-blur-sm ${!musicEnabled
                ? 'bg-gray-800/50 border border-gray-700 text-gray-600 cursor-not-allowed'
                : 'bg-gray-900/80 border border-gray-700 text-cyan-400 hover:bg-gray-800 hover:text-cyan-300 hover:border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                }`}
            title={!musicEnabled ? "Music Disabled in Settings" : (isPlaying ? "Mute Music" : "Play Music")}
            disabled={!musicEnabled}
        >
            {isPlaying ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
    );
};
