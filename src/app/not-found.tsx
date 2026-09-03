import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div
      role="region"
      aria-label="Página no encontrada"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '2rem',
        textAlign: 'center',
        gap: '1.25rem',
      }}
    >
      <div
        style={{
          fontSize: '4rem',
          fontWeight: 800,
          color: 'var(--color-primary, #2563eb)',
          lineHeight: 1,
        }}
      >
        404
      </div>
      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'var(--color-text-primary, #0f172a)',
          margin: 0,
        }}
      >
        Página no encontrada
      </h1>
      <p
        style={{
          color: 'var(--color-text-secondary, #64748b)',
          maxWidth: '30rem',
          fontSize: '1rem',
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        El recurso o página que estás buscando no existe o ha sido reubicado.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <Button as={Link} href="/" variant="primary" size="base">
          Ir al Inicio
        </Button>
        <Button as={Link} href="/dashboard" variant="secondary" size="base">
          Panel de Control
        </Button>
      </div>
    </div>
  );
}
