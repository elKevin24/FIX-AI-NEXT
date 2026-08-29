
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, CardBody } from '@/components/ui';
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
  
  const clearFilters = () => { 
    setSearch(''); setLowStock(false); setCategory(''); setLocation(''); 
    replace(pathname); 
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
      if ((event.ctrlKey && event.key.toLowerCase() === 'k') || (event.key === '/' && !isTyping)) { 
        event.preventDefault(); 
        document.querySelector<HTMLInputElement>('[data-part-search]')?.focus(); 
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const hasFilters = Boolean(search || lowStock || category || location);
  return (
    <form className={styles['filters']} onSubmit={(event) => { event.preventDefault(); applyFilters(); }} aria-label="Filtros de inventario">
      <Card className={styles['filtersCard']}>
        <CardBody className={styles['filtersCardBody']}>
            <div className={styles['filtersRow']}>
                {/* 1. Filtro Rápido */}
                <div className={styles['filterGroup']}>
                    <h2 className={styles['filterGroupTitle']}>Filtro Principal</h2>
                    <div className={styles['filterGroupContent']}>
                        <div className={styles['flexRow']}>
                            <Input data-part-search label="Nombre o SKU" placeholder="Buscar repuesto..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Buscar por nombre o SKU" />
                        </div>
                        <label className={styles['stockToggle']}>
                            <input type="checkbox" checked={lowStock} onChange={(event) => setLowStock(event.target.checked)} aria-label="Mostrar solo productos con stock bajo" /> 
                            Mostrar solo stock bajo
                        </label>
                    </div>
                </div>

                {/* 2. Clasificación */}
                <div className={styles['filterGroup']}>
                    <h2 className={styles['filterGroupTitle']}>Clasificación y Ubicación</h2>
                    <div className={styles['filterGroupContent']}>
                        <div className={styles['flexRow']}>
                            <Input label="Categoría" placeholder="Ej. Pantallas" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrar por categoría" />
                            <Input label="Ubicación" placeholder="Ej. Bodega A" value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Filtrar por ubicación" />
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles['filtersActions']}>
                {hasFilters && (
                    <div className={styles['activeFilters']}>
                        {search && <span className={styles['filterBadge']}>Búsqueda: {search}</span>}
                        {lowStock && <span className={styles['filterBadge']}>Stock bajo</span>}
                        {category && <span className={styles['filterBadge']}>Categoría: {category}</span>}
                        {location && <span className={styles['filterBadge']}>Ubicación: {location}</span>}
                    </div>
                )}
                <div className={styles['actionButtons']}>
                    <Button type="button" variant="ghost" onClick={clearFilters}>Limpiar</Button>
                    <Button type="submit" variant="primary">Aplicar Filtros</Button>
                </div>
            </div>
        </CardBody>
      </Card>
    </form>
  );
}
