'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './GlobalSearch.module.css';

interface SearchResult {
    type: 'ticket' | 'customer' | 'part';
    id: string;
    title: string;
    subtitle: string;
    status?: string;
    url: string;
}

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const searchTimeout = setTimeout(async () => {
            if (query.length >= 2) {
                setIsLoading(true);
                try {
                    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                    const data = await response.json();
                    setResults(data.results || []);
                    setIsOpen(true);
                } catch (error) {
                    console.error('Search error:', error);
                    setResults([]);
                }
                setIsLoading(false);
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [query]);

    const handleResultClick = (result: SearchResult) => {
        setIsOpen(false);
        setQuery('');
        
        if (result.url) {
            router.push(result.url);
        } else {
            // Fallback for legacy behavior if API doesn't return URL
            if (result.type === 'ticket') {
                router.push(`/dashboard/tickets/${result.id}`);
            } else if (result.type === 'customer') {
                router.push(`/dashboard/customers/${result.id}/edit`);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && query.length >= 2) {
            setIsOpen(false);
            router.push(`/dashboard/search?q=${encodeURIComponent(query)}`);
        }
    };

    const getBadgeClass = (type: string) => {
        switch (type) {
            case 'ticket': return styles.ticketBadge;
            case 'customer': return styles.customerBadge;
            case 'part': return styles.partBadge;
            default: return styles.ticketBadge;
        }
    };

    const getBadgeLabel = (type: string) => {
        switch (type) {
            case 'ticket': return 'Ticket';
            case 'customer': return 'Cliente';
            case 'part': return 'Repuesto';
            default: return type;
        }
    };

    return (
        <div ref={wrapperRef} className={styles.container}>
            <div className={styles.searchWrapper}>
                <svg
                    className={styles.searchIcon}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Buscar tickets, clientes, repuestos..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                />
                {isLoading && (
                    <div className={styles.loading}>
                        <div className={styles.loadingSpinner}></div>
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className={styles.dropdown}>
                    <div className={styles.resultsContainer}>
                        {results.map((result) => (
                            <div
                                key={`${result.type}-${result.id}`}
                                onClick={() => handleResultClick(result)}
                                className={styles.resultItem}
                            >
                                <span className={getBadgeClass(result.type)}>
                                    {getBadgeLabel(result.type)}
                                </span>
                                <div className={styles.resultContent}>
                                    <div className={styles.resultTitle}>
                                        {result.title}
                                    </div>
                                    <div className={styles.resultSubtitle}>
                                        {result.subtitle}
                                    </div>
                                </div>
                                {result.status && (
                                    <span className={styles.statusTag}>
                                        {result.status}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div
                        onClick={() => {
                            setIsOpen(false);
                            router.push(`/dashboard/search?q=${encodeURIComponent(query)}`);
                        }}
                        className={styles.viewAll}
                    >
                        Ver todos los resultados
                    </div>
                </div>
            )}

            {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
                <div className={`${styles.dropdown} ${styles.noResults}`}>
                    No se encontraron resultados
                </div>
            )}
        </div>
    );
}