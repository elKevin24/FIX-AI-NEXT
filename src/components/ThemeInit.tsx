'use client';

import { useEffect } from 'react';

const THEME_SCRIPT = `
(function() {
    try {
        var theme = localStorage.getItem('theme') || 'auto';
        if (theme === 'auto') {
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else if (['light', 'dark', 'dark-colorblind'].includes(theme)) {
            document.documentElement.setAttribute('data-theme', theme);
        } else {
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }
    } catch (e) {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();
`;

export default function ThemeInit() {
    useEffect(() => {
        const script = document.createElement('script');
        script.textContent = THEME_SCRIPT;
        document.head.prepend(script);
    }, []);

    return null;
}
