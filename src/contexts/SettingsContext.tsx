import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
    musicEnabled: boolean;
    setMusicEnabled: (enabled: boolean) => void;
    musicVolume: number;
    setMusicVolume: (volume: number) => void;
    sfxEnabled: boolean;
    setSfxEnabled: (enabled: boolean) => void;
    sfxVolume: number;
    setSfxVolume: (volume: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Load from local storage or default
    const [musicEnabled, setMusicEnabled] = useState(() => {
        const saved = localStorage.getItem('musicEnabled');
        return saved ? saved === 'true' : true;
    });

    const [musicVolume, setMusicVolume] = useState(() => {
        const saved = localStorage.getItem('musicVolume');
        return saved ? parseFloat(saved) : 0.3;
    });

    const [sfxEnabled, setSfxEnabled] = useState(() => {
        const saved = localStorage.getItem('sfxEnabled');
        return saved ? saved === 'true' : true;
    });

    const [sfxVolume, setSfxVolume] = useState(() => {
        const saved = localStorage.getItem('sfxVolume');
        return saved ? parseFloat(saved) : 0.6;
    });

    // Save to local storage
    useEffect(() => {
        localStorage.setItem('musicEnabled', musicEnabled.toString());
    }, [musicEnabled]);

    useEffect(() => {
        localStorage.setItem('musicVolume', musicVolume.toString());
    }, [musicVolume]);

    useEffect(() => {
        localStorage.setItem('sfxEnabled', sfxEnabled.toString());
    }, [sfxEnabled]);

    useEffect(() => {
        localStorage.setItem('sfxVolume', sfxVolume.toString());
    }, [sfxVolume]);

    return (
        <SettingsContext.Provider value={{
            musicEnabled,
            setMusicEnabled,
            musicVolume,
            setMusicVolume,
            sfxEnabled,
            setSfxEnabled,
            sfxVolume,
            setSfxVolume
        }}>
            {children}
        </SettingsContext.Provider>
    );
};
