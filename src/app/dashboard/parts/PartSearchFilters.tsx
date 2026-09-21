'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import styles from './parts.module.css';

export default function PartSearchFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [lowStock, setLowStock] = useState(searchParams.get('lowStock') === 'true');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (lowStock) params.set('lowStock', 'true');
    if (category.trim()) params.set('category', category.trim());
    if (location.trim()) params.set('location', location.trim());
    replace(`${pathname}?${params.toString()}`);
  };
  const clearFilters = () => { setSearch(''); setLowStock(false); setCategory(''); setLocation(''); replace(pathname); };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
      if ((event.ctrlKey && event.key.toLowerCase() === 'k') || (event.key === '/' && !isTyping)) { event.preventDefault(); document.querySelector<HTMLInputElement>('[data-part-search]')?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const hasFilters = Boolean(search || lowStock || category || location);
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
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar por nombre o SKU"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', height: '42px' }}>
            <label className={styles['stockToggle']}>
              <input
                type="checkbox"
                checked={lowStock}
                onChange={(event) => setLowStock(event.target.checked)}
                aria-label="Mostrar solo productos con stock bajo"
              />
              ⚠️ Solo stock bajo
            </label>
          </div>
          <Button type="submit" variant="primary">
            Buscar
          </Button>
        </div>
      </section>

      {/* Bloque 2 (Miller Block 2 - 2 items): Organización y Almacén */}
      <details className={styles['inventoryAdvancedFilters']} open={Boolean(category || location)}>
        <summary>
          <span>📦 Organización en Bodega (Categoría y Ubicación)</span>
          <span>{Boolean(category || location) ? 'Filtros aplicados' : 'Desplegar'}</span>
        </summary>
        <div className={styles['inventoryAdvancedGrid']}>
          <Input
            label="Categoría del repuesto"
            placeholder="Ej. Pantallas, Baterías, Cargadores..."
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filtrar por categoría"
          />
          <Input
            label="Ubicación física"
            placeholder="Ej. Estante A-2, Vitrina 1..."
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            aria-label="Filtrar por ubicación"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <Button type="submit" variant="secondary" size="sm">
            Aplicar filtros de bodega
          </Button>
        </div>
      </details>

      {hasFilters && (
        <div className={styles['activeFilterBadges']} aria-label="Filtros activos">
          {search && <span className={styles['activeFilterBadge']}>Búsqueda: {search}</span>}
          {lowStock && <span className={styles['activeFilterBadge']}>⚠️ Stock Crítico</span>}
          {category && <span className={styles['activeFilterBadge']}>Categoría: {category}</span>}
          {location && <span className={styles['activeFilterBadge']}>Ubicación: {location}</span>}
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Limpiar todos los filtros
          </Button>
        </div>
      )}
    </form>
  );
}
