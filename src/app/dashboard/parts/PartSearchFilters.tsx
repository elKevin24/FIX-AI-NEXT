'use client';

import { useEffect, useState, useTransition } from 'react';
import { useQueryStates, parseAsString, parseAsBoolean } from 'nuqs';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import styles from './parts.module.css';

export const partFilterParsers = {
  search: parseAsString.withDefault(''),
  lowStock: parseAsBoolean.withDefault(false),
  category: parseAsString.withDefault(''),
  location: parseAsString.withDefault(''),
  page: parseAsString.withDefault(''),
};

export default function PartSearchFilters() {
  const [filters, setFilters] = useQueryStates(partFilterParsers, { shallow: false });
  const [isPending, startTransition] = useTransition();

  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [lowStockDraft, setLowStockDraft] = useState(filters.lowStock);
  const [categoryDraft, setCategoryDraft] = useState(filters.category);
  const [locationDraft, setLocationDraft] = useState(filters.location);

  useEffect(() => {
    setSearchDraft(filters.search);
    setLowStockDraft(filters.lowStock);
    setCategoryDraft(filters.category);
    setLocationDraft(filters.location);
  }, [filters]);

  const applyFilters = () => {
    startTransition(async () => {
      await setFilters({
        search: searchDraft.trim() || null,
        lowStock: lowStockDraft ? true : null,
        category: categoryDraft.trim() || null,
        location: locationDraft.trim() || null,
        page: null,
      });
    });
  };

  const clearFilters = () => {
    setSearchDraft('');
    setLowStockDraft(false);
    setCategoryDraft('');
    setLocationDraft('');
    startTransition(async () => {
      await setFilters({
        search: null,
        lowStock: null,
        category: null,
        location: null,
        page: null,
      });
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
      if ((event.ctrlKey && event.key.toLowerCase() === 'k') || (event.key === '/' && !isTyping)) { event.preventDefault(); document.querySelector<HTMLInputElement>('[data-part-search]')?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const hasFilters = Boolean(filters.search || filters.lowStock || filters.category || filters.location);
  return (
    <form className={styles['inventoryFilters']} onSubmit={(event) => { event.preventDefault(); applyFilters(); }} aria-label="Filtros de inventario">
      {/* Bloque 1 (Miller Block 1 - 2 items): Búsqueda Principal & Alerta de Stock */}
      <section className={styles['inventoryFilterSection']} aria-labelledby="parts-quick-filters">
        <div className={styles['filterHeading']}>
          <h2 id="parts-quick-filters">Búsqueda de Repuestos</h2>
          <span>Nombre, SKU y disponibilidad</span>
        </div>
        <div className={styles['inventoryFilterGrid']}>
          <div style={{ flex: 2, minWidth: '240px' }}>
            <Input
              data-part-search
              label="Nombre o código SKU"
              placeholder="Buscar por nombre, modelo o SKU... (Ctrl + K)"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              aria-label="Buscar por nombre o SKU"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', height: '42px' }}>
            <label className={styles['stockToggle']}>
              <input
                type="checkbox"
                checked={lowStockDraft}
                onChange={(event) => setLowStockDraft(event.target.checked)}
                aria-label="Mostrar solo productos con stock bajo"
              />
              ⚠️ Solo stock bajo
            </label>
          </div>
          <Button type="submit" variant="primary" isLoading={isPending}>
            Buscar
          </Button>
        </div>
      </section>

      {/* Bloque 2 (Miller Block 2 - 2 items): Organización y Almacén */}
      <details className={styles['inventoryAdvancedFilters']} open={Boolean(filters.category || filters.location)}>
        <summary>
          <span>📦 Organización en Bodega (Categoría y Ubicación)</span>
          <span>{Boolean(filters.category || filters.location) ? 'Filtros aplicados' : 'Desplegar'}</span>
        </summary>
        <div className={styles['inventoryAdvancedGrid']}>
          <Input
            label="Categoría del repuesto"
            placeholder="Ej. Pantallas, Baterías, Cargadores..."
            value={categoryDraft}
            onChange={(event) => setCategoryDraft(event.target.value)}
            aria-label="Filtrar por categoría"
          />
          <Input
            label="Ubicación física"
            placeholder="Ej. Estante A-2, Vitrina 1..."
            value={locationDraft}
            onChange={(event) => setLocationDraft(event.target.value)}
            aria-label="Filtrar por ubicación"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <Button type="submit" variant="secondary" size="sm" isLoading={isPending}>
            Aplicar filtros de bodega
          </Button>
        </div>
      </details>

      {hasFilters && (
        <div className={styles['activeFilterBadges']} aria-label="Filtros activos">
          {filters.search && <span className={styles['activeFilterBadge']}>Búsqueda: {filters.search}</span>}
          {filters.lowStock && <span className={styles['activeFilterBadge']}>⚠️ Stock Crítico</span>}
          {filters.category && <span className={styles['activeFilterBadge']}>Categoría: {filters.category}</span>}
          {filters.location && <span className={styles['activeFilterBadge']}>Ubicación: {filters.location}</span>}
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters} disabled={isPending}>
            Limpiar todos los filtros
          </Button>
        </div>
      )}
    </form>
  );
}
