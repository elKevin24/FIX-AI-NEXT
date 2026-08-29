
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Input, Select, Button, SearchInputGroup, Card, CardBody } from '@/components/ui';
import styles from './searchFilters.module.css';

const statusOptions = [
    { value: '', label: 'Todos los estados' }, { value: 'OPEN', label: 'Abierto' },
    { value: 'IN_PROGRESS', label: 'En progreso' }, { value: 'WAITING_FOR_PARTS', label: 'Esperando repuestos' },
    { value: 'RESOLVED', label: 'Resuelto' }, { value: 'CLOSED', label: 'Cerrado' },
];
const priorityOptions = [
    { value: '', label: 'Todas las prioridades' }, { value: 'LOW', label: 'Baja' },
    { value: 'MEDIUM', label: 'Media' }, { value: 'HIGH', label: 'Alta' }, { value: 'URGENT', label: 'Urgente' },
];
const deviceOptions = [
    { value: '', label: 'Todos los tipos' }, { value: 'PC', label: 'PC' }, { value: 'Laptop', label: 'Laptop' },
    { value: 'Smartphone', label: 'Celular' }, { value: 'Console', label: 'Consola' }, { value: 'Tablet', label: 'Tablet' },
    { value: 'Printer', label: 'Impresora' }, { value: 'Other', label: 'Otro' },
];

export default function TicketSearchFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const searchRef = useRef<HTMLInputElement>(null);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [priority, setPriority] = useState(searchParams.get('priority') || '');
    const [assignedTo, setAssignedTo] = useState(searchParams.get('assignedTo') || '');
    const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
    const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
    const [deviceType, setDeviceType] = useState(searchParams.get('deviceType') || '');

    const updateFilters = () => {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (status) params.set('status', status);
        if (priority) params.set('priority', priority);
        if (assignedTo.trim()) params.set('assignedTo', assignedTo.trim());
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
        if (deviceType) params.set('deviceType', deviceType);
        startTransition(() => router.push(`/dashboard/tickets?${params.toString()}`));
    };

    const handleClear = () => {
        setSearch(''); setStatus(''); setPriority(''); setAssignedTo(''); setDateFrom(''); setDateTo(''); setDeviceType('');
        startTransition(() => router.push('/dashboard/tickets'));
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
            if ((event.ctrlKey && event.key.toLowerCase() === 'k') || (event.key === '/' && !isTyping)) {
                event.preventDefault();
                searchRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const hasFilters = Boolean(search || status || priority || assignedTo || dateFrom || dateTo || deviceType);

    return (
    <form className={styles['filters']} onSubmit={(event) => { event.preventDefault(); updateFilters(); }} aria-label="Filtros de tickets">
      <Card className={styles['filtersCard']}>
        <CardBody className={styles['filtersCardBody']}>
            <div className={styles['filtersRow']}>
                {/* 1. Búsqueda Principal */}
                <div className={styles['filterGroup']}>
                    <h2 className={styles['filterGroupTitle']}>Búsqueda Principal</h2>
                    <div className={styles['filterGroupContent']}>
                        <SearchInputGroup
                            value={search}
                            onChange={setSearch}
                            onSearch={updateFilters}
                            placeholder="Buscar por ID, título..."
                            buttonText="Buscar"
                            isLoading={isPending}
                            inputRef={searchRef}
                            ariaLabel="Buscar tickets"
                        />
                        <div className={styles['flexRow']}>
                            <Select label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} />
                            <Select label="Prioridad" value={priority} onChange={(e) => setPriority(e.target.value)} options={priorityOptions} />
                        </div>
                    </div>
                </div>

                {/* 2. Fechas */}
                <div className={styles['filterGroup']}>
                    <h2 className={styles['filterGroupTitle']}>Rango de Fechas</h2>
                    <div className={styles['filterGroupContent']}>
                        <div className={styles['flexRow']}>
                            <Input label="Desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                            <Input label="Hasta" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* 3. Detalles */}
                <div className={styles['filterGroup']}>
                    <h2 className={styles['filterGroupTitle']}>Detalles Operativos</h2>
                    <div className={styles['filterGroupContent']}>
                         <div className={styles['flexRow']}>
                            <Input label="Técnico asignado" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Nombre o correo" />
                            <Select label="Dispositivo" value={deviceType} onChange={(e) => setDeviceType(e.target.value)} options={deviceOptions} />
                         </div>
                    </div>
                </div>
            </div>

            <div className={styles['filtersActions']}>
                {hasFilters && (
                    <div className={styles['activeFilters']}>
                        {search && <span className={styles['filterBadge']}>Búsqueda: {search}</span>}
                        {status && <span className={styles['filterBadge']}>Estado: {status}</span>}
                        {priority && <span className={styles['filterBadge']}>Prioridad: {priority}</span>}
                        {assignedTo && <span className={styles['filterBadge']}>Técnico: {assignedTo}</span>}
                        {deviceType && <span className={styles['filterBadge']}>Equipo: {deviceType}</span>}
                        {dateFrom && <span className={styles['filterBadge']}>Desde: {dateFrom}</span>}
                        {dateTo && <span className={styles['filterBadge']}>Hasta: {dateTo}</span>}
                    </div>
                )}
                <div className={styles['actionButtons']}>
                    <Button variant="ghost" type="button" onClick={handleClear} disabled={isPending}>Limpiar</Button>
                    <Button variant="primary" type="submit" disabled={isPending}>Aplicar Filtros</Button>
                </div>
            </div>
        </CardBody>
      </Card>
    </form>
    );
}
