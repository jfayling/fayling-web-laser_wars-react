import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const MusicControls: React.FC = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { musicVolume, musicEnabled } = useSettings();

    // Playlist State
    const SONGS = [
        'music/laserwars_1.mp3',
        'music/laserwars_2.mp3'
    ];

    const [playlist, setPlaylist] = useState<string[]>([]);
    const [currentSongIndex, setCurrentSongIndex] = useState(0);

    // Initial Shuffle
    useEffect(() => {
        const shuffled = [...SONGS].sort(() => Math.random() - 0.5);
        setPlaylist(shuffled);
    }, []);

    // Initialize Audio and Handle Song Changes
    useEffect(() => {
        if (playlist.length === 0) return;

        const songUrl = `${import.meta.env.BASE_URL}${playlist[currentSongIndex]}`;

        // Keep track if we should play immediately (if music was already playing or just enabled)
        // Actually, if musicEnabled is true, we always try to play the new song in the playlist.
        const shouldPlay = musicEnabled;

        const audio = new Audio(songUrl);
        audioRef.current = audio;

        // Configure Audio
        audio.volume = musicVolume;
        audio.loop = false; // We handle looping manually via playlist

        // Play Next Song when current one ends
        const handleEnded = () => {
            setCurrentSongIndex(prev => (prev + 1) % playlist.length);
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        // Attempt to play if enabled
        if (shouldPlay) {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Auto-play prevented by browser:", error);
                    setIsPlaying(false);
                });
            }
        }

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.pause();
            audioRef.current = null;
        };
        // Resetting audio on song change or playlist init.
        // We include musicEnabled in deps? 
        // If we include musicEnabled, it RE-CREATES audio on toggle. 
        // We WANT to avoid that if possible, but for playlist logic (new song) we need to recreate.
        // If we want to Toggle Pause/Play without recreating, we need a separate effect.
        // So REMOVE musicEnabled from here, and ONLY use it for initial check?
        // But if I put `musicEnabled` in the condition `if (shouldPlay)` but NOT in deps, eslint warns.
        // And if I don't put it in deps, it won't react to toggle.
        // So I need a separate effect for Toggle.

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playlist, currentSongIndex]);

    // Handle Enable/Disable (Play/Pause) without recreating audio
    useEffect(() => {
        if (!audioRef.current) return;

        if (musicEnabled) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Auto-play prevented by browser (toggle):", error);
                });
            }
        } else {
            audioRef.current.pause();
        }
    }, [musicEnabled]);


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
