const THEME_SCRIPT = `
(function() {
    try {
        var theme = localStorage.getItem('theme') || 'auto';
        var resolved = theme;
        if (theme === 'auto') {
            resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', resolved);
    } catch (e) {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();
`;

export default function ThemeInit() {
    return (
        <script
            dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
            suppressHydrationWarning
        />
    );
}

