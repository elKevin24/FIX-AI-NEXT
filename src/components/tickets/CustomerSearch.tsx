'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
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

    return (
        <div className="relative" ref={wrapperRef}>
            <Input
                label="Buscar Cliente"
                placeholder="Nombre, Teléfono o Email..."
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                    // Also emit current text as "new customer" potential
                    // This allows typing a new name and just hitting next
                    onSelect({ name: e.target.value }); 
                }}
                autoComplete="off"
            />
            
            {isOpen && query.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {loading ? (
                        <div className="p-3 text-sm text-slate-500 text-center">Buscando...</div>
                    ) : results.length > 0 ? (
                        <ul>
                            {results.map((customer) => (
                                <li 
                                    key={customer.id}
                                    onClick={() => handleSelect(customer)}
                                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                >
                                    <div className="font-medium text-slate-900">{customer.name}</div>
                                    <div className="text-xs text-slate-500">
                                        {customer.phone && <span>📞 {customer.phone} </span>}
                                        {customer.email && <span>✉️ {customer.email}</span>}
                                    </div>
                                </li>
                            ))}
                            <li 
                                onClick={handleCreateNew}
                                className="p-3 bg-blue-50 hover:bg-blue-100 cursor-pointer text-blue-700 text-sm font-medium text-center sticky bottom-0"
                            >
                                + Crear "{query}" como nuevo
                            </li>
                        </ul>
                    ) : (
                        <div className="p-3 text-center">
                            <p className="text-sm text-slate-500 mb-2">No encontrado</p>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleCreateNew}
                                className="w-full"
                            >
                                Usar "{query}"
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
