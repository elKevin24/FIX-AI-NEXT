'use client';

import React, { Ref } from 'react';
import styles from './SearchInputGroup.module.css';

interface SearchInputGroupProps {
    value: string;
    onChange: (value: string) => void;
    onSearch: () => void;
    placeholder?: string;
    buttonText?: string;
    isLoading?: boolean;
    error?: boolean;
    disabled?: boolean;
    inputRef?: Ref<HTMLInputElement>;
    ariaLabel?: string;
}

export default function SearchInputGroup({
    value,
    onChange,
    onSearch,
    placeholder = 'Buscar...',
    buttonText = 'Buscar',
    isLoading = false,
    error = false,
    disabled = false,
    inputRef,
    ariaLabel = 'Buscar',
}: SearchInputGroupProps) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !disabled && !isLoading) {
            e.preventDefault();
            onSearch();
        }
    };

    return (
        <div style={{ width: '100%' }}>
            <div className={`${styles['searchGroup']} ${error ? styles['error'] : ''}`}>
                <input
                    type="text"
                    className={styles['searchInput']}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled || isLoading}
                    ref={inputRef}
                    aria-label={ariaLabel}
                />
                <button
                    type="button"
                    className={styles['searchButton']}
                    disabled={disabled || isLoading}
                    aria-label={buttonText}
                    onClick={() => { if (!disabled && !isLoading) onSearch(); }}
                >
                    {isLoading ? 'Buscando...' : buttonText}
                </button>
            </div>
        </div>
    );
}
