'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';
import styles from './PaginationControls.module.css';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalItems: number;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  totalItems,
}: PaginationControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <nav className={styles['pagination']} aria-label="Paginación">
      <div className={styles['info']}>
        Mostrando página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
        <span className={styles['count']}>({totalItems} resultados)</span>
      </div>

      <div className={styles['controls']}>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasPrevPage}
          onClick={() => handlePageChange(currentPage - 1)}
        >
          ← Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasNextPage}
          onClick={() => handlePageChange(currentPage + 1)}
        >
          Siguiente →
        </Button>
      </div>
    </nav>
  );
}
