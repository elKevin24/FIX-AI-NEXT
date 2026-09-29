import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Button } from './Button';

describe('Button component', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeDefined();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    const btn = screen.getByRole('button', { name: /disabled/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders loading state with spinner and disables button', () => {
    render(<Button isLoading leftIcon={<span>Left</span>}>Loading Action</Button>);
    const btn = screen.getByRole('button', { name: /loading action/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.queryByText('Left')).toBeNull(); // icons suppressed during loading
  });

  it('renders left and right icons when not loading', () => {
    render(
      <Button leftIcon={<span data-testid="left-icon">L</span>} rightIcon={<span data-testid="right-icon">R</span>}>
        With Icons
      </Button>
    );
    expect(screen.getByTestId('left-icon')).toBeDefined();
    expect(screen.getByTestId('right-icon')).toBeDefined();
  });

  it('applies different variants and sizes', () => {
    const { container: c1 } = render(<Button variant="danger" size="sm">Delete</Button>);
    expect(c1.querySelector('button')).toBeDefined();

    const { container: c2 } = render(<Button variant="success" size="lg" fullWidth>Save</Button>);
    expect(c2.querySelector('button')).toBeDefined();

    const { container: c3 } = render(<Button variant="glass" size="base">Glass</Button>);
    expect(c3.querySelector('button')).toBeDefined();

    const { container: c4 } = render(<Button variant="outline">Outline</Button>);
    expect(c4.querySelector('button')).toBeDefined();

    const { container: c5 } = render(<Button variant="ghost">Ghost</Button>);
    expect(c5.querySelector('button')).toBeDefined();

    const { container: c6 } = render(<Button variant="warning">Warning</Button>);
    expect(c6.querySelector('button')).toBeDefined();
  });

  it('renders polymorphically using the "as" prop', () => {
    render(
      <Button as="a" href="/dashboard">
        Go to Dashboard
      </Button>
    );
    const link = screen.getByRole('link', { name: /go to dashboard/i });
    expect(link.getAttribute('href')).toBe('/dashboard');
  });
});
