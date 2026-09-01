import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from './Card';

describe('Card component family', () => {
  it('renders complete Card hierarchy', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Título de Tarjeta</CardTitle>
          <CardDescription>Descripción breve</CardDescription>
        </CardHeader>
        <CardBody>
          <p>Contenido principal</p>
        </CardBody>
        <CardFooter>
          <button>Acción</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeDefined();
    expect(screen.getByRole('heading', { level: 3, name: 'Título de Tarjeta' })).toBeDefined();
    expect(screen.getByText('Descripción breve')).toBeDefined();
    expect(screen.getByText('Contenido principal')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Acción' })).toBeDefined();
  });
});
