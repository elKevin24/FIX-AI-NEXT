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
      <section className={styles['inventoryFilterSection']} aria-labelledby="parts-quick-filters">
        <div className={styles['filterHeading']}><h2 id="parts-quick-filters">Filtro rápido</h2><span>Nombre, SKU y stock</span></div>
        <div className={styles['inventoryFilterGrid']}>
          <Input data-part-search label="Nombre o SKU" placeholder="Buscar repuesto..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Buscar por nombre o SKU" />
          <label className={styles['stockToggle']}><input type="checkbox" checked={lowStock} onChange={(event) => setLowStock(event.target.checked)} aria-label="Mostrar solo productos con stock bajo" /> Solo stock bajo</label>
          <Button type="submit" variant="primary">Aplicar filtros</Button>
        </div>
      </section>
      <details className={styles['inventoryAdvancedFilters']} open={Boolean(category || location)}>
        <summary>Filtros por categoría y ubicación</summary>
        <div className={styles['inventoryFilterGrid']}>
          <Input label="Categoría" placeholder="Ej. Pantallas" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrar por categoría" />
          <Input label="Ubicación" placeholder="Ej. Bodega A" value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Filtrar por ubicación" />
        </div>
      </details>
      {hasFilters && <div className={styles['activeFilterBadges']} aria-label="Filtros activos">
        {search && <span className={styles['activeFilterBadge']}>Búsqueda: {search}</span>}{lowStock && <span className={styles['activeFilterBadge']}>Stock bajo</span>}{category && <span className={styles['activeFilterBadge']}>Categoría: {category}</span>}{location && <span className={styles['activeFilterBadge']}>Ubicación: {location}</span>}
        <Button type="button" variant="ghost" onClick={clearFilters}>Limpiar filtros</Button>
      </div>}
    </form>
  );
}
