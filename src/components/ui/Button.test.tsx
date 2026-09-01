import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button component', () => {
  it('renders button with children text', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDefined();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Deshabilitado</Button>);
    const button = screen.getByRole('button', { name: /deshabilitado/i });
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('disables button and shows spinner when loading is true', () => {
    render(<Button loading>Procesando</Button>);
    const button = screen.getByRole('button', { name: /procesando/i });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('renders left and right icons when provided', () => {
    render(
      <Button 
        leftIcon={<span data-testid="left-icon">👈</span>} 
        rightIcon={<span data-testid="right-icon">👉</span>}
      >
        Con Iconos
      </Button>
    );
    expect(screen.getByTestId('left-icon')).toBeDefined();
    expect(screen.getByTestId('right-icon')).toBeDefined();
    expect(screen.getByText('Con Iconos')).toBeDefined();
  });
});
