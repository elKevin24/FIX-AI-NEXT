'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';

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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '1.5rem',
      paddingTop: '1rem',
      borderTop: '1px solid var(--color-border-light)'
    }}>
      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
        Mostrando página <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{currentPage}</span> de <span style={{ fontWeight: 600 }}>{totalPages}</span>
        <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-tertiary)' }}>({totalItems} resultados)</span>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem' }}>
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
    </div>
  );
}
