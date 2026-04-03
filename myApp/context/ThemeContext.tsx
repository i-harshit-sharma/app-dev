import React, { createContext, useContext, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useSystemColorScheme();
    // Default to the device's system theme; fall back to 'light' if unavailable
    const [theme, setThemeState] = useState<Theme>(systemColorScheme === 'dark' ? 'dark' : 'light');

    const toggleTheme = () => {
        setThemeState((prev) => {
            const next = prev === 'light' ? 'dark' : 'light';
            console.log(`[ThemeContext] Toggling theme from ${prev} to ${next}`);
            return next;
        });
    };

    const setTheme = (newTheme: Theme) => {
        console.log(`[ThemeContext] Setting theme to ${newTheme}`);
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}