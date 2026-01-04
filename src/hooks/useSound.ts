import { useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';

// Simple synth sounds using Web Audio API to avoid external assets
export const useSound = () => {
    const { sfxEnabled, sfxVolume } = useSettings();

    const playTone = useCallback((
        frequency: number,
        type: OscillatorType,
        duration: number,
        volume: number = 0.1
    ) => {
        if (!sfxEnabled) return;

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

        const finalVolume = volume * sfxVolume;

        gainNode.gain.setValueAtTime(finalVolume, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    }, [sfxEnabled, sfxVolume]);

    const playPlaceSound = useCallback(() => {
        playTone(600, 'sine', 0.1, 0.2);
    }, [playTone]);

    const playRotateSound = useCallback(() => {
        playTone(400, 'triangle', 0.05, 0.2);
    }, [playTone]);

    const playFireSound = useCallback(() => {
        if (!sfxEnabled) return;
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);

        const finalVolume = 0.2 * sfxVolume;

        gainNode.gain.setValueAtTime(finalVolume, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    }, [sfxEnabled, sfxVolume]);

    const playExplosionSound = useCallback(() => {
        if (!sfxEnabled) return;
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const bufferSize = audioCtx.sampleRate * 2; // 2 seconds
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const gainNode = audioCtx.createGain();
        const finalVolume = 0.5 * sfxVolume;

        gainNode.gain.setValueAtTime(finalVolume, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);

        // Lowpass filter
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        noise.start();
    }, [sfxEnabled, sfxVolume]);

    const playWallHitSound = useCallback(() => {
        playTone(100, 'square', 0.1, 0.3);
    }, [playTone]);

    const playWinSound = useCallback(() => {
        if (!sfxEnabled) return;
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Arpeggio
        [440, 554, 659, 880].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
            gain.gain.setValueAtTime(0.1 * sfxVolume, audioCtx.currentTime + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.1 + 0.5);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + i * 0.1);
            osc.stop(audioCtx.currentTime + i * 0.1 + 0.5);
        });
    }, [sfxEnabled, sfxVolume]);

    return { playPlaceSound, playRotateSound, playFireSound, playWinSound, playExplosionSound, playWallHitSound };
};
