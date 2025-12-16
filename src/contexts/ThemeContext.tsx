'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'dark-colorblind' | 'auto';
type ResolvedTheme = 'light' | 'dark' | 'dark-colorblind';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to get system theme preference
const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }
    return 'light';
};

// Resolve 'auto' to actual theme
const resolveTheme = (theme: Theme): ResolvedTheme => {
    if (theme === 'auto') {
        return getSystemTheme();
    }
    return theme;
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Read initial theme from DOM (set by blocking script)
    const getInitialTheme = (): Theme => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme && ['light', 'dark', 'dark-colorblind', 'auto'].includes(savedTheme)) {
                return savedTheme as Theme;
            }
        }
        return 'auto'; // Default to auto
    };

    const [theme, setThemeState] = useState<Theme>(getInitialTheme);
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
        resolveTheme(getInitialTheme())
    );

    // Apply resolved theme to DOM
    useEffect(() => {
        const resolved = resolveTheme(theme);
        setResolvedTheme(resolved);
        document.documentElement.setAttribute('data-theme', resolved);
    }, [theme]);

    // Listen for system theme changes when theme is 'auto'
    useEffect(() => {
        if (theme !== 'auto') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            const resolved = resolveTheme('auto');
            setResolvedTheme(resolved);
            document.documentElement.setAttribute('data-theme', resolved);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    // Sync theme across browser tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'theme' && e.newValue) {
                const newTheme = e.newValue as Theme;
                if (['light', 'dark', 'dark-colorblind', 'auto'].includes(newTheme)) {
                    setThemeState(newTheme);
                    const resolved = resolveTheme(newTheme);
                    setResolvedTheme(resolved);
                    document.documentElement.setAttribute('data-theme', resolved);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
        const resolved = resolveTheme(newTheme);
        setResolvedTheme(resolved);
        document.documentElement.setAttribute('data-theme', resolved);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
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
