'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import styles from '@/app/page.module.css';

export default function HomeTicketSearch() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      router.push('/tickets/status');
      return;
    }
    router.push(`/tickets/status?query=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className={styles['quickSearchBox']}>
      <div className={styles['quickSearchLabel']}>
        <Search size={16} aria-hidden="true" />
        <span>Rastreo rápido de reparación para clientes:</span>
      </div>
      <form onSubmit={handleSearch} className={styles['searchForm']}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ingresa tu código de ticket o teléfono (ej. TK-101)..."
          className={styles['searchInput']}
          aria-label="Código de ticket o número de teléfono"
        />
        <button type="submit" className={styles['searchBtn']}>
          <span>Consultar Estado</span>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
