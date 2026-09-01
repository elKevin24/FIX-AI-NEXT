import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from './Alert';

describe('Alert component', () => {
  it('renders alert with role="status" and aria-live="polite" for default info variant', () => {
    render(<Alert>Información importante</Alert>);
    const alert = screen.getByRole('status');
    expect(alert).toBeDefined();
    expect(alert.getAttribute('aria-live')).toBe('polite');
    expect(alert.textContent).toContain('Información importante');
  });

  it('renders with specific roles according to variants', () => {
    const { rerender } = render(<Alert variant="success">Operación exitosa</Alert>);
    const successAlert = screen.getByRole('status');
    expect(successAlert.getAttribute('aria-live')).toBe('polite');
    expect(successAlert.textContent).toContain('Operación exitosa');

    rerender(<Alert variant="warning">Atención requerida</Alert>);
    const warningAlert = screen.getByRole('alert');
    expect(warningAlert.getAttribute('aria-live')).toBe('assertive');
    expect(warningAlert.textContent).toContain('Atención requerida');

    rerender(<Alert variant="error">Ha ocurrido un error</Alert>);
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert.getAttribute('aria-live')).toBe('assertive');
    expect(errorAlert.textContent).toContain('Ha ocurrido un error');
  });
});
