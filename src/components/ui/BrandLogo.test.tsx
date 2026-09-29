import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import BrandLogo from './BrandLogo';

describe('BrandLogo component', () => {
  it('renders logo with text by default', () => {
    render(<BrandLogo />);
    expect(screen.getByText('FIX-AI')).toBeDefined();
  });

  it('hides text when showText is false', () => {
    render(<BrandLogo showText={false} />);
    expect(screen.queryByText('FIX-AI')).toBeNull();
  });

  it('applies sizes and themes', () => {
    const { container: c1 } = render(<BrandLogo size="sm" theme="light" />);
    expect(c1.querySelector('svg')).toBeDefined();

    const { container: c2 } = render(<BrandLogo size="lg" theme="dark" />);
    expect(c2.querySelector('svg')).toBeDefined();
  });
});
