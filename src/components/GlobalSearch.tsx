'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import styles from './GlobalSearch.module.css';

interface SearchResult {
    type: 'ticket' | 'customer';
    id: string;
    title: string;
    subtitle: string;
    status?: string;
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
        if (result.type === 'ticket') {
            router.push(`/dashboard/tickets/${result.id}`);
        } else {
            router.push(`/dashboard/customers/${result.id}/edit`); // Assuming edit page for customer
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && query.length >= 2) {
            setIsOpen(false);
            router.push(`/dashboard/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <div ref={wrapperRef} className={styles.container}>
            <div className="relative">
                <Input
                    type="text"
                    placeholder="Buscar tickets, clientes..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                />
                {isLoading && (
                    <div className={styles.loading}>
                        Buscando...
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className={styles.dropdown}>
                    {results.map((result) => (
                        <div
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleResultClick(result)}
                            className={styles.resultItem}
                        >
                            <span className={result.type === 'ticket' ? styles.ticketBadge : styles.customerBadge}>
                                {result.type === 'ticket' ? 'Ticket' : 'Cliente'}
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
