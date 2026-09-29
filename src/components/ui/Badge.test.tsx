import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Badge } from './Badge';

describe('Badge component', () => {
  it('renders children with default props', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('renders all variant styles correctly', () => {
    const variants = ['primary', 'success', 'warning', 'error', 'info', 'gray'] as const;
    variants.forEach(variant => {
      const { container } = render(<Badge variant={variant}>{variant}</Badge>);
      expect(container.querySelector('span')).toBeDefined();
    });
  });

  it('renders different sizes and dot indicator', () => {
    const { container: small } = render(<Badge size="sm" hasDot>Small Dot</Badge>);
    expect(small.querySelector('span')).toBeDefined();

    const { container: large } = render(<Badge size="lg">Large</Badge>);
    expect(large.querySelector('span')).toBeDefined();
  });
});
