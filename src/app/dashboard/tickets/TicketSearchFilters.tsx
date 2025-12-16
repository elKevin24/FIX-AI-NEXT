'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import { Select, Button, SearchInputGroup } from '@/components/ui';
import styles from './searchFilters.module.css';

export default function TicketSearchFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [priority, setPriority] = useState(searchParams.get('priority') || '');
    const [assignedTo, setAssignedTo] = useState(searchParams.get('assignedTo') || '');

    const updateFilters = () => {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (status) params.set('status', status);
        if (priority) params.set('priority', priority);
        if (assignedTo.trim()) params.set('assignedTo', assignedTo.trim());

        startTransition(() => {
            router.push(`/dashboard/tickets?${params.toString()}`);
        });
    };

    const handleSearch = () => {
        updateFilters();
    };

    const handleClear = () => {
        setSearch('');
        setStatus('');
        setPriority('');
        setAssignedTo('');
        startTransition(() => {
            router.push('/dashboard/tickets');
        });
    };

    // Auto-aplicar filtros cuando cambian los selects (pero no el search input)
    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams();
            if (search.trim()) params.set('search', search.trim());
            if (status) params.set('status', status);
            if (priority) params.set('priority', priority);
            if (assignedTo.trim()) params.set('assignedTo', assignedTo.trim());

            startTransition(() => {
                router.push(`/dashboard/tickets?${params.toString()}`);
            });
        }, 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, priority, assignedTo]);

    const statusOptions = [
        { value: '', label: 'Todos los estados' },
        { value: 'OPEN', label: 'Abierto' },
        { value: 'IN_PROGRESS', label: 'En Progreso' },
        { value: 'WAITING_FOR_PARTS', label: 'Esperando Repuestos' },
        { value: 'RESOLVED', label: 'Resuelto' },
        { value: 'CLOSED', label: 'Cerrado' },
    ];

    const priorityOptions = [
        { value: '', label: 'Todas las prioridades' },
        { value: 'LOW', label: 'Baja' },
        { value: 'MEDIUM', label: 'Media' },
        { value: 'HIGH', label: 'Alta' },
        { value: 'URGENT', label: 'Urgente' },
    ];

    return (
        <div className={styles.filtersContainer}>
            <div className={styles.searchRow}>
                <div className={styles.searchInput}>
                    <SearchInputGroup
                        value={search}
                        onChange={setSearch}
                        onSearch={handleSearch}
                        placeholder="Buscar por ID, título o cliente..."
                        buttonText="Buscar"
                        isLoading={isPending}
                    />
                </div>
                {(search || status || priority || assignedTo) && (
                    <Button
                        variant="ghost"
                        onClick={handleClear}
                        disabled={isPending}
                    >
                        Limpiar
                    </Button>
                )}
            </div>

            <div className={styles.filtersRow}>
                <div className={styles.filterGroup}>
                    <Select
                        label="Estado"
                        value={status}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                        options={statusOptions}
                    />
                </div>
                <div className={styles.filterGroup}>
                    <Select
                        label="Prioridad"
                        value={priority}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value)}
                        options={priorityOptions}
                    />
                </div>
                <div className={styles.filterGroup}>
                    <Select
                        label="Asignado a"
                        value={assignedTo}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssignedTo(e.target.value)}
                        options={[
                            { value: '', label: 'Todos' },
                            // Aquí podrías cargar usuarios dinámicamente
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}
