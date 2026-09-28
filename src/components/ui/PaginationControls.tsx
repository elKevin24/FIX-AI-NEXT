'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
    <nav className={styles['container']} aria-label="Paginación de resultados">
      <div className={styles['info']}>
        Mostrando página <span className={styles['bold']}>{currentPage}</span> de <span className={styles['bold']}>{totalPages}</span>
        <span className={styles['total']}>({totalItems} resultados)</span>
      </div>
      
      <div className={styles['actions']}>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasPrevPage}
          onClick={() => handlePageChange(currentPage - 1)}
          leftIcon={<ChevronLeft size={16} />}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasNextPage}
          onClick={() => handlePageChange(currentPage + 1)}
          rightIcon={<ChevronRight size={16} />}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}

