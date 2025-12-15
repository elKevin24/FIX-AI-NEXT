'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'dark-colorblind';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Read initial theme from DOM (set by blocking script)
    const getInitialTheme = (): Theme => {
        if (typeof window !== 'undefined') {
            const domTheme = document.documentElement.getAttribute('data-theme');
            if (domTheme && ['light', 'dark', 'dark-colorblind'].includes(domTheme)) {
                return domTheme as Theme;
            }
        }
        return 'light';
    };

    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        // Sync with localStorage on mount
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        if (savedTheme && ['light', 'dark', 'dark-colorblind'].includes(savedTheme)) {
            if (savedTheme !== theme) {
                setThemeState(savedTheme);
                document.documentElement.setAttribute('data-theme', savedTheme);
            }
        }
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
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
