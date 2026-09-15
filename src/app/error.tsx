'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center',
        gap: '1rem',
      }}
    >
      <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-primary)' }}>
        Algo salió mal
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: '32rem' }}>
        Ocurrió un error inesperado al mostrar esta sección.
        {error?.digest ? ` Código de referencia: ${error.digest}` : ''}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <Button
          onClick={() => retry()}
          variant="primary"
          size="base"
        >
          Intentar de nuevo
        </Button>
        <Button
          as={Link}
          href="/dashboard"
          variant="secondary"
          size="base"
        >
          Ir al inicio
        </Button>
      </div>
    </div>
  );
}
