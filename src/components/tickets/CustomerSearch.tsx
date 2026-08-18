'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

import styles from './CustomerSearch.module.css';

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    dpi: string | null;
    nit: string | null;
}

interface CustomerSearchProps {
    onSelect: (customer: Customer | { name: string }) => void;
    selectedCustomer?: { name: string } | null;
}

export default function CustomerSearch({ onSelect, selectedCustomer }: CustomerSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listboxId = 'customer-search-results';

    const prevNameRef = useRef(selectedCustomer?.name);
    useEffect(() => {
        if (selectedCustomer?.name && selectedCustomer.name !== prevNameRef.current) {
            prevNameRef.current = selectedCustomer.name;
            setQuery(selectedCustomer.name);
        }
    }, [selectedCustomer?.name]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length < 2) {
                setResults([]);
                setIsOpen(false);
                setActiveIndex(0);
                return;
            }

            // Don't search if the query matches the selected customer exactly (avoid re-opening on select)
            if (selectedCustomer?.name === query) return;

            setLoading(true);
            try {
                const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data);
                    setActiveIndex(0);
                    setIsOpen(true);
                }
            } catch (error) {
                console.error('Error searching customers:', error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, selectedCustomer]);

    const handleSelect = (customer: Customer) => {
        onSelect(customer);
        setQuery(customer.name);
        setIsOpen(false);
    };

    const handleCreateNew = () => {
        onSelect({ name: query }); // Pass just the name as a "new" customer draft
        setIsOpen(false);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || (results.length === 0 && query.length < 2)) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((prev) => Math.min(prev + 1, Math.max(results.length - 1, 0)));
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, 0));
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            const selected = results[activeIndex];
            if (selected) {
                handleSelect(selected);
            } else if (results.length === 0) {
                handleCreateNew();
            }
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            setIsOpen(false);
        }
    };

    return (
        <div className={styles['container']} ref={wrapperRef}>
            <Input
                label="Buscar Cliente"
                placeholder="Nombre, Teléfono o Email..."
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                    setIsOpen(true);
                }}
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isOpen}
                aria-controls={listboxId}
                aria-activedescendant={
                    isOpen && results[activeIndex]
                        ? `customer-option-${results[activeIndex].id}`
                        : undefined
                }
                onKeyDown={handleKeyDown}
            />
            
            {isOpen && query.length >= 2 && (
                <div className={styles['dropdown']} id={listboxId} role="listbox" aria-label="Resultados de clientes">
                    {loading ? (
                        <div className={styles['loading']} role="status" aria-live="polite">
                            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🔍</span>
                            Buscando...
                        </div>
                    ) : results.length > 0 ? (
                        <ul className={styles['list']}>
                            {results.map((customer) => (
                                <li 
                                    key={customer.id}
                                    role="option"
                                    id={`customer-option-${customer.id}`}
                                    aria-selected={activeIndex === results.findIndex((item) => item.id === customer.id)}
                                    className={`${styles['listItem']} ${activeIndex === results.findIndex((item) => item.id === customer.id) ? styles['listItemActive'] : ''}`}
                                >
                                    <button
                                        type="button"
                                        className={styles['resultButton']}
                                        onClick={() => handleSelect(customer)}
                                        onMouseEnter={() => setActiveIndex(results.findIndex((item) => item.id === customer.id))}
                                    >
                                        <div className={styles['avatar']}>
                                            {getInitials(customer.name)}
                                        </div>
                                        <div className={styles['itemContent']}>
                                            <div className={styles['itemName']}>{customer.name}</div>
                                            <div className={styles['itemDetail']}>
                                                {customer.phone && (
                                                    <span title="Teléfono">📱 {customer.phone}</span>
                                                )}
                                                {customer.email && (
                                                    <span title="Email" style={{ marginLeft: customer.phone ? '0.75rem' : 0 }}>
                                                        ✉️ {customer.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                            <li 
                                role="option"
                                aria-selected="false"
                                className={styles['createItem']}
                            >
                                <button type="button" className={styles['createButton']} onClick={handleCreateNew}>
                                    <span style={{ marginRight: '0.5rem' }}>✨</span>
                                    Crear &ldquo;{query}&rdquo; como nuevo
                                </button>
                            </li>
                        </ul>
                    ) : (
                        <div className={styles['notFound']}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤔</div>
                            <p className={styles['notFoundText']}>No encontramos a &ldquo;{query}&rdquo;</p>
                            <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                onClick={handleCreateNew}
                                className={styles['useButton']}
                            >
                                Crear Nuevo Cliente
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
