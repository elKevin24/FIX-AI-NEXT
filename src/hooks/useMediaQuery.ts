'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tracks a CSS media query in the browser using useSyncExternalStore.
 * SSR-safe: returns `false` during the first render (avoiding hydration
 * mismatch) and updates once mounted.
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback((onStoreChange: () => void) => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return () => {};
        }
        const mql = window.matchMedia(query);
        mql.addEventListener('change', onStoreChange);
        return () => mql.removeEventListener('change', onStoreChange);
    }, [query]);

    const getSnapshot = useCallback(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return false;
        }
        return window.matchMedia(query).matches;
    }, [query]);

    const getServerSnapshot = () => false;

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
