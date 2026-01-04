import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const MusicControls: React.FC = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { musicVolume, musicEnabled } = useSettings();

    useEffect(() => {
        audioRef.current = new Audio('/music/laserwars_1.mp3');
        audioRef.current.loop = true;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // Handle Volume changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = musicVolume;
        }
    }, [musicVolume]);

    // Handle Enable/Disable setting changes
    useEffect(() => {
        if (!audioRef.current) return;

        if (musicEnabled) {
            // If settings allow music, try to play.
            // Note: We don't want to force play if the USER deliberately paused via the button.
            // HOWEVER, if the user just toggled the setting ON, they probably expect it to start.
            // Let's assume enabling the setting resets the intent to "Play".
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => setIsPlaying(true))
                    .catch(error => {
                        console.log("Auto-play prevented by browser:", error);
                        setIsPlaying(false);
                    });
            }
        } else {
            // If settings disable music, force pause.
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, [musicEnabled]);

    const toggleMusic = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            // If music is disabled in settings, hitting play shouldn't work OR should prompt?
            // User requested behavior: "Click the music on/off icon... no longer works correctly"
            // If setting provided by toggle is OFF, the button probably shouldn't do anything or should be visually disabled?
            // "Add a toggle to the Music Volume setting... like SFX".
            // If they click the main button, they want music.
            // Let's allow it to play, which implicitly respects the fact they clicked it?
            // BUT, our Effect enforces `!musicEnabled -> pause`.
            // So if `musicEnabled` is false, and we click Play, the Effect will fight?
            // No, the Effect depends on `[musicEnabled]`. It runs when `musicEnabled` CHANGES.
            // If `musicEnabled` is strictly false, and we click Play, the Effect doesn't run.
            // So the music WILL play.
            // BUT, if we re-render effectively? No.
            // Is it weird to have "Settings: Music OFF" but "Button: Music ON"?
            // Yes.
            // Maybe the Button should effectively be "Muted by Settings" if disabled?
            // Or the Button ignores clicks if disabled?
            // Let's assume if enabled, button works.

            if (!musicEnabled) return; // Don't allow playing if disabled globally?

            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => setIsPlaying(true))
                    .catch(error => {
                        console.error("Audio play failed:", error);
                    });
            }
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
