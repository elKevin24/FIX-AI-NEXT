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
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedCustomer?.name) {
            setQuery(selectedCustomer.name);
        }
    }, [selectedCustomer]);

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

    return (
        <div className={styles.container} ref={wrapperRef}>
            <Input
                label="Buscar Cliente"
                placeholder="Nombre, Teléfono o Email..."
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                }}
                autoComplete="off"
            />
            
            {isOpen && query.length >= 2 && (
                <div className={styles.dropdown}>
                    {loading ? (
                        <div className={styles.loading}>
                            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🔍</span>
                            Buscando...
                        </div>
                    ) : results.length > 0 ? (
                        <ul className={styles.list}>
                            {results.map((customer) => (
                                <li 
                                    key={customer.id}
                                    onClick={() => handleSelect(customer)}
                                    className={styles.listItem}
                                >
                                    <div className={styles.avatar}>
                                        {getInitials(customer.name)}
                                    </div>
                                    <div className={styles.itemContent}>
                                        <div className={styles.itemName}>{customer.name}</div>
                                        <div className={styles.itemDetail}>
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
                                </li>
                            ))}
                            <li 
                                onClick={handleCreateNew}
                                className={styles.createItem}
                            >
                                <span style={{ marginRight: '0.5rem' }}>✨</span>
                                Crear &ldquo;{query}&rdquo; como nuevo
                            </li>
                        </ul>
                    ) : (
                        <div className={styles.notFound}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤔</div>
                            <p className={styles.notFoundText}>No encontramos a &ldquo;{query}&rdquo;</p>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleCreateNew}
                                className={styles.useButton}
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
