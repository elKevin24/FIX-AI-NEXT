'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import styles from './ThemeSwitcher.module.css';

const themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'dark-colorblind', label: 'Dark Colorblind', icon: '👁️' },
];

export default function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentTheme = themes.find((t) => t.value === theme) || themes[0];

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

    return (
        <div className={styles.themeSwitcher} ref={dropdownRef}>
            <button
                className={styles.themeButton}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Change theme"
                aria-expanded={isOpen}
            >
                <span className={styles.icon}>{currentTheme.icon}</span>
                <span className={styles.label}>{currentTheme.label}</span>
                <svg
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
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
                <div className={styles.dropdown}>
                    {themes.map((t) => (
                        <button
                            key={t.value}
                            className={`${styles.themeOption} ${t.value === theme ? styles.themeOptionActive : ''
                                }`}
                            onClick={() => {
                                setTheme(t.value);
                                setIsOpen(false);
                            }}
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
    );
}
