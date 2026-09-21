'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Input, Select, Button, SearchInputGroup } from '@/components/ui';
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
            <div className={styles['filtersCard']}>
                {/* Grupo 1 (Miller Block 1 - 3 items): Búsqueda Principal y Estado */}
                <section className={styles['filterSection']} aria-labelledby="ticket-primary-filters">
                    <div className={styles['sectionHeading']}>
                        <h2 id="ticket-primary-filters">Búsqueda y Estado</h2>
                        <span>Filtros prioritarios</span>
                    </div>
                    <div className={styles['gridContainer']}>
                        <div className={styles['searchItem']}>
                            <label className={styles['searchLabel']}>Término de búsqueda</label>
                            <SearchInputGroup
                                value={search}
                                onChange={setSearch}
                                onSearch={updateFilters}
                                placeholder="Buscar por ID, título o cliente... (Ctrl + K)"
                                buttonText="Buscar"
                                isLoading={isPending}
                                inputRef={searchRef}
                                ariaLabel="Buscar tickets por ID, título o cliente"
                            />
                        </div>
                        <div className={styles['filterItem']}>
                            <Select
                                label="Estado del ticket"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                options={statusOptions}
                                aria-label="Filtrar por estado"
                            />
                        </div>
                        <div className={styles['filterItem']}>
                            <Select
                                label="Nivel de prioridad"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                options={priorityOptions}
                                aria-label="Filtrar por prioridad"
                            />
                        </div>
                    </div>
                </section>

                {/* Filtros Secundarios Agrupados Cognitivamente (Miller Blocks 2 & 3) */}
                <details className={styles['advancedFilters']} open={Boolean(dateFrom || dateTo || assignedTo || deviceType)}>
                    <summary>
                        <span>⚙️ Filtros Avanzados (Dispositivo, Asignación y Fechas)</span>
                        <span>{Boolean(dateFrom || dateTo || assignedTo || deviceType) ? 'Filtros activos' : 'Desplegar opciones'}</span>
                    </summary>
                    
                    <div className={styles['advancedClusters']}>
                        {/* Grupo 2 (Miller Block 2 - 2 items): Dispositivo y Técnico */}
                        <fieldset className={styles['clusterGroup']}>
                            <legend className={styles['clusterLegend']}>Dispositivo y Asignación</legend>
                            <div className={styles['clusterGrid']}>
                                <Select
                                    label="Tipo de dispositivo"
                                    value={deviceType}
                                    onChange={(e) => setDeviceType(e.target.value)}
                                    aria-label="Filtrar por tipo de dispositivo"
                                    options={deviceOptions}
                                />
                                <Input
                                    label="Técnico responsable"
                                    value={assignedTo}
                                    onChange={(e) => setAssignedTo(e.target.value)}
                                    placeholder="Nombre o correo..."
                                    aria-label="Filtrar por técnico asignado"
                                />
                            </div>
                        </fieldset>

                        {/* Grupo 3 (Miller Block 3 - 2 items): Rango Temporal */}
                        <fieldset className={styles['clusterGroup']}>
                            <legend className={styles['clusterLegend']}>Rango Temporal de Creación</legend>
                            <div className={styles['clusterGrid']}>
                                <Input
                                    label="Fecha desde"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    aria-label="Fecha inicial de creación"
                                />
                                <Input
                                    label="Fecha hasta"
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    aria-label="Fecha final de creación"
                                />
                            </div>
                        </fieldset>
                    </div>

                    <div className={styles['advancedActionRow']}>
                        <Button variant="secondary" size="sm" type="submit" isLoading={isPending}>
                            Aplicar filtros avanzados
                        </Button>
                    </div>
                </details>

                {hasFilters && (
                    <div className={styles['activeFilters']} aria-label="Filtros activos">
                        {search && <span className={styles['filterBadge']}>Búsqueda: {search}</span>}
                        {status && <span className={styles['filterBadge']}>Estado: {statusOptions.find(s => s.value === status)?.label || status}</span>}
                        {priority && <span className={styles['filterBadge']}>Prioridad: {priorityOptions.find(p => p.value === priority)?.label || priority}</span>}
                        {deviceType && <span className={styles['filterBadge']}>Equipo: {deviceOptions.find(d => d.value === deviceType)?.label || deviceType}</span>}
                        {assignedTo && <span className={styles['filterBadge']}>Técnico: {assignedTo}</span>}
                        {(dateFrom || dateTo) && (
                            <span className={styles['filterBadge']}>
                                Periodo: {dateFrom || 'Inicio'} → {dateTo || 'Hoy'}
                            </span>
                        )}
                        <Button variant="ghost" size="sm" type="button" onClick={handleClear} disabled={isPending}>
                            Limpiar todos los filtros
                        </Button>
                    </div>
                )}
            </div>
        </form>
    );
}
