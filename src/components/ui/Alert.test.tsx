import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from './Alert';

describe('Alert component', () => {
  it('renders alert with role="alert" and default info variant', () => {
    render(<Alert>Información importante</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
    expect(alert.textContent).toContain('Información importante');
  });

  it('renders with specific variants (success, warning, error)', () => {
    const { rerender } = render(<Alert variant="success">Operación exitosa</Alert>);
    expect(screen.getByRole('alert').textContent).toContain('Operación exitosa');

    rerender(<Alert variant="warning">Atención requerida</Alert>);
    expect(screen.getByRole('alert').textContent).toContain('Atención requerida');

    rerender(<Alert variant="error">Ha ocurrido un error</Alert>);
    expect(screen.getByRole('alert').textContent).toContain('Ha ocurrido un error');
  });
});
