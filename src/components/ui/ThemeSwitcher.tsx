'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import styles from './ThemeSwitcher.module.css';

const themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'auto', label: 'Auto (Sistema)', icon: '🌓' },
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'dark-colorblind', label: 'Dark Colorblind', icon: '👁️' },
];

export default function ThemeSwitcher() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [announcement, setAnnouncement] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const currentTheme = themes.find((t) => t.value === theme) || themes[0];

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Focus management when dropdown opens
    // Removed to avoid sync setState error - logic moved to toggle handler if needed
    // or handled by initial render of dropdown content

    // Auto-focus the focused button
    useEffect(() => {
        if (isOpen && buttonRefs.current[focusedIndex]) {
            buttonRefs.current[focusedIndex]?.focus();
        }
    }, [focusedIndex, isOpen]);

    const handleThemeChange = (newTheme: Theme) => {
        const themeLabel = themes.find(t => t.value === newTheme)?.label;
        setTheme(newTheme);
        setAnnouncement(`Tema cambiado a ${themeLabel}`);
        setIsOpen(false);

        // Clear announcement after 3 seconds
        setTimeout(() => setAnnouncement(''), 3000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex((prev) =>
                    prev < themes.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex((prev) =>
                    prev > 0 ? prev - 1 : themes.length - 1
                );
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                handleThemeChange(themes[focusedIndex].value);
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
            case 'Home':
                e.preventDefault();
                setFocusedIndex(0);
                break;
            case 'End':
                e.preventDefault();
                setFocusedIndex(themes.length - 1);
                break;
        }
    };

    const handleMainButtonKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!isOpen) {
                const currentIndex = themes.findIndex(t => t.value === theme);
                setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
            }
            setIsOpen(!isOpen);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
                const currentIndex = themes.findIndex(t => t.value === theme);
                setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
            }
            setIsOpen(true);
        }
    };

    return (
        <>
            <div className={styles.themeSwitcher} ref={dropdownRef}>
                <button
                    className={styles.themeButton}
                    onClick={() => {
                        if (!isOpen) {
                             const currentIndex = themes.findIndex(t => t.value === theme);
                             setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
                        }
                        setIsOpen(!isOpen);
                    }}
                    onKeyDown={handleMainButtonKeyDown}
                    aria-label="Cambiar tema"
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    suppressHydrationWarning
                >
                    <span className={styles.icon} suppressHydrationWarning>
                        {currentTheme.icon}
                    </span>
                    <span className={styles.label} suppressHydrationWarning>
                        {currentTheme.label}
                    </span>
                    <svg
                        className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                    >
                        <path
                            d="M4 6L8 10L12 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>

                {isOpen && (
                    <div
                        role="menu"
                        aria-orientation="vertical"
                        aria-label="Selección de tema"
                        className={styles.dropdown}
                        onKeyDown={handleKeyDown}
                    >
                        {themes.map((t, index) => (
                            <button
                                key={t.value}
                                ref={(el) => {
                                    buttonRefs.current[index] = el;
                                }}
                                role="menuitem"
                                tabIndex={focusedIndex === index ? 0 : -1}
                                className={`${styles.themeOption} ${t.value === theme ? styles.themeOptionActive : ''
                                    }`}
                                onClick={() => handleThemeChange(t.value)}
                                aria-current={t.value === theme ? 'true' : undefined}
                            >
                                <span className={styles.optionIcon}>{t.icon}</span>
                                <span className={styles.optionLabel}>{t.label}</span>
                                {t.value === theme && (
                                    <svg
                                        className={styles.checkIcon}
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M13 4L6 11L3 8"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Screen reader announcement */}
            <input
                type="checkbox"
                checked={theme === 'dark' || theme === 'dark-colorblind'}
                onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={styles.srOnly}
            />
        </>
    );
}
