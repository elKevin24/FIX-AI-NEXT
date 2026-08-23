'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="es">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          margin: 0,
          backgroundColor: '#f8fafc',
          color: '#0f172a',
        }}
      >
        <div
          role="alert"
          style={{
            textAlign: 'center',
            padding: '2rem',
            maxWidth: '32rem',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
            Error de la aplicación
          </h2>
          <p style={{ color: '#475569', marginBottom: '1.5rem' }}>
            Ocurrió un error crítico e inesperado.
            {error?.digest ? ` Código de referencia: ${error.digest}` : ''}
          </p>
          <button
            onClick={() => retry()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
