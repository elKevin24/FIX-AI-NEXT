'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

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
            router.push(`/dashboard/customers/${result.id}/edit`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && query.length >= 2) {
            setIsOpen(false);
            router.push(`/dashboard/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <input
                type="text"
                placeholder="Buscar tickets, clientes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length >= 2 && setIsOpen(true)}
                onKeyDown={handleKeyDown}
                style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '0.9rem',
                    backgroundColor: '#f9f9f9',
                }}
            />

            {isLoading && (
                <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#666',
                    fontSize: '0.8rem',
                }}>
                    Buscando...
                </div>
            )}

            {isOpen && results.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    marginTop: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto',
                }}>
                    {results.map((result, index) => (
                        <div
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleResultClick(result)}
                            style={{
                                padding: '0.75rem 1rem',
                                cursor: 'pointer',
                                borderBottom: index < results.length - 1 ? '1px solid #eee' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                            <span style={{
                                backgroundColor: result.type === 'ticket' ? '#e3f2fd' : '#e8f5e9',
                                color: result.type === 'ticket' ? '#1565c0' : '#2e7d32',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                            }}>
                                {result.type === 'ticket' ? 'Ticket' : 'Cliente'}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '500', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {result.title}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {result.subtitle}
                                </div>
                            </div>
                            {result.status && (
                                <span style={{
                                    fontSize: '0.75rem',
                                    color: '#666',
                                    backgroundColor: '#f0f0f0',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                }}>
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
                        style={{
                            padding: '0.75rem 1rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                            color: '#0070f3',
                            fontWeight: '500',
                            backgroundColor: '#fafafa',
                            borderTop: '1px solid #eee',
                        }}
                    >
                        Ver todos los resultados
                    </div>
                </div>
            )}

            {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    marginTop: '4px',
                    padding: '1rem',
                    textAlign: 'center',
                    color: '#666',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}>
                    No se encontraron resultados
                </div>
            )}
        </div>
    );
}
