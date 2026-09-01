import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge component', () => {
  it('renders children content', () => {
    render(<Badge>Abierto</Badge>);
    expect(screen.getByText('Abierto')).toBeDefined();
  });

  it('renders with custom variant and class', () => {
    render(<Badge variant="success" className="custom-badge">Activo</Badge>);
    const badge = screen.getByText('Activo');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('custom-badge');
  });

  it('renders with warning and error variants', () => {
    const { rerender } = render(<Badge variant="warning">Pendiente</Badge>);
    expect(screen.getByText('Pendiente')).toBeDefined();

    rerender(<Badge variant="error">Cancelado</Badge>);
    expect(screen.getByText('Cancelado')).toBeDefined();
  });
});
