'use client';

import React, { createContext, useContext, useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'dark-colorblind' | 'auto';
type ResolvedTheme = 'light' | 'dark' | 'dark-colorblind';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme';

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

const subscribeToTheme = (callback: () => void) => {
    if (typeof window === 'undefined') return () => {};

    const handleStorage = (e: StorageEvent) => {
        if (e.key === THEME_STORAGE_KEY) {
            callback();
        }
    };
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    window.addEventListener('storage', handleStorage);
    window.addEventListener('themechange', callback);
    mediaQuery.addEventListener('change', callback);

    return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('themechange', callback);
        mediaQuery.removeEventListener('change', callback);
    };
};

const getThemeSnapshot = (): Theme => {
    if (typeof window === 'undefined') return 'auto';
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
        if (saved && ['light', 'dark', 'dark-colorblind', 'auto'].includes(saved)) {
            return saved;
        }
    } catch {
        // Storage restricted
    }
    return 'auto';
};

const getServerSnapshot = (): Theme => 'auto';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot);
    const resolvedTheme = resolveTheme(theme);

    const setTheme = useCallback((newTheme: Theme) => {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        } catch {
            // Storage restricted
        }
        const resolved = resolveTheme(newTheme);
        document.documentElement.setAttribute('data-theme', resolved);
        window.dispatchEvent(new Event('themechange'));
    }, []);

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

