'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useQueryStates, parseAsString } from 'nuqs';
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

export const ticketFilterParsers = {
    search: parseAsString.withDefault(''),
    status: parseAsString.withDefault(''),
    priority: parseAsString.withDefault(''),
    assignedTo: parseAsString.withDefault(''),
    dateFrom: parseAsString.withDefault(''),
    dateTo: parseAsString.withDefault(''),
    deviceType: parseAsString.withDefault(''),
    page: parseAsString.withDefault(''),
};

export default function TicketSearchFilters() {
    const [filters, setFilters] = useQueryStates(ticketFilterParsers, { shallow: false });
    const [isPending, startTransition] = useTransition();
    const searchRef = useRef<HTMLInputElement>(null);

    const [searchDraft, setSearchDraft] = useState(filters.search);
    const [statusDraft, setStatusDraft] = useState(filters.status);
    const [priorityDraft, setPriorityDraft] = useState(filters.priority);
    const [assignedToDraft, setAssignedToDraft] = useState(filters.assignedTo);
    const [dateFromDraft, setDateFromDraft] = useState(filters.dateFrom);
    const [dateToDraft, setDateToDraft] = useState(filters.dateTo);
    const [deviceTypeDraft, setDeviceTypeDraft] = useState(filters.deviceType);

    useEffect(() => {
        setSearchDraft(filters.search);
        setStatusDraft(filters.status);
        setPriorityDraft(filters.priority);
        setAssignedToDraft(filters.assignedTo);
        setDateFromDraft(filters.dateFrom);
        setDateToDraft(filters.dateTo);
        setDeviceTypeDraft(filters.deviceType);
    }, [filters]);

    const updateFilters = () => {
        startTransition(async () => {
            await setFilters({
                search: searchDraft.trim() || null,
                status: statusDraft || null,
                priority: priorityDraft || null,
                assignedTo: assignedToDraft.trim() || null,
                dateFrom: dateFromDraft || null,
                dateTo: dateToDraft || null,
                deviceType: deviceTypeDraft || null,
                page: null,
            });
        });
    };

    const handleClear = () => {
        setSearchDraft('');
        setStatusDraft('');
        setPriorityDraft('');
        setAssignedToDraft('');
        setDateFromDraft('');
        setDateToDraft('');
        setDeviceTypeDraft('');
        startTransition(async () => {
            await setFilters({
                search: null,
                status: null,
                priority: null,
                assignedTo: null,
                dateFrom: null,
                dateTo: null,
                deviceType: null,
                page: null,
            });
        });
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

    const hasFilters = Boolean(filters.search || filters.status || filters.priority || filters.assignedTo || filters.dateFrom || filters.dateTo || filters.deviceType);

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
                                value={searchDraft}
                                onChange={setSearchDraft}
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
                                value={statusDraft}
                                onChange={(e) => setStatusDraft(e.target.value)}
                                options={statusOptions}
                                aria-label="Filtrar por estado"
                            />
                        </div>
                        <div className={styles['filterItem']}>
                            <Select
                                label="Nivel de prioridad"
                                value={priorityDraft}
                                onChange={(e) => setPriorityDraft(e.target.value)}
                                options={priorityOptions}
                                aria-label="Filtrar por prioridad"
                            />
                        </div>
                    </div>
                </section>

                {/* Filtros Secundarios Agrupados Cognitivamente (Miller Blocks 2 & 3) */}
                <details className={styles['advancedFilters']} open={Boolean(filters.dateFrom || filters.dateTo || filters.assignedTo || filters.deviceType)}>
                    <summary>
                        <span>⚙️ Filtros Avanzados (Dispositivo, Asignación y Fechas)</span>
                        <span>{Boolean(filters.dateFrom || filters.dateTo || filters.assignedTo || filters.deviceType) ? 'Filtros activos' : 'Desplegar opciones'}</span>
                    </summary>
                    
                    <div className={styles['advancedClusters']}>
                        {/* Grupo 2 (Miller Block 2 - 2 items): Dispositivo y Técnico */}
                        <fieldset className={styles['clusterGroup']}>
                            <legend className={styles['clusterLegend']}>Dispositivo y Asignación</legend>
                            <div className={styles['clusterGrid']}>
                                <Select
                                    label="Tipo de dispositivo"
                                    value={deviceTypeDraft}
                                    onChange={(e) => setDeviceTypeDraft(e.target.value)}
                                    aria-label="Filtrar por tipo de dispositivo"
                                    options={deviceOptions}
                                />
                                <Input
                                    label="Técnico responsable"
                                    value={assignedToDraft}
                                    onChange={(e) => setAssignedToDraft(e.target.value)}
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
                                    value={dateFromDraft}
                                    onChange={(e) => setDateFromDraft(e.target.value)}
                                    aria-label="Fecha inicial de creación"
                                />
                                <Input
                                    label="Fecha hasta"
                                    type="date"
                                    value={dateToDraft}
                                    onChange={(e) => setDateToDraft(e.target.value)}
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
                        {filters.search && <span className={styles['filterBadge']}>Búsqueda: {filters.search}</span>}
                        {filters.status && <span className={styles['filterBadge']}>Estado: {statusOptions.find(s => s.value === filters.status)?.label || filters.status}</span>}
                        {filters.priority && <span className={styles['filterBadge']}>Prioridad: {priorityOptions.find(p => p.value === filters.priority)?.label || filters.priority}</span>}
                        {filters.deviceType && <span className={styles['filterBadge']}>Equipo: {deviceOptions.find(d => d.value === filters.deviceType)?.label || filters.deviceType}</span>}
                        {filters.assignedTo && <span className={styles['filterBadge']}>Técnico: {filters.assignedTo}</span>}
                        {(filters.dateFrom || filters.dateTo) && (
                            <span className={styles['filterBadge']}>
                                Periodo: {filters.dateFrom || 'Inicio'} → {filters.dateTo || 'Hoy'}
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
