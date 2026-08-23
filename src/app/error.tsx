'use client';

import { useEffect } from 'react';

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
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => retry()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--color-primary-600)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Intentar de nuevo
        </button>
        <button
          onClick={() => window.location.assign('/dashboard')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Ir al inicio
        </button>
      </div>
    </div>
  );
}
