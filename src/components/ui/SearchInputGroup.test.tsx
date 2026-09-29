import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import SearchInputGroup from './SearchInputGroup';

describe('SearchInputGroup component', () => {
  it('renders input and search button', () => {
    const handleSearch = vi.fn();
    const handleChange = vi.fn();

    render(
      <SearchInputGroup
        value="iPhone"
        onChange={handleChange}
        onSearch={handleSearch}
        placeholder="Buscar parte o cliente..."
      />
    );

    const input = screen.getByPlaceholderText('Buscar parte o cliente...');
    expect(input).toBeDefined();

    const btn = screen.getByRole('button', { name: /buscar/i });
    fireEvent.click(btn);
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });

  it('triggers onSearch on Enter key press', () => {
    const handleSearch = vi.fn();
    render(
      <SearchInputGroup
        value="Screen"
        onChange={vi.fn()}
        onSearch={handleSearch}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });

  it('shows loading state and disables actions', () => {
    const handleSearch = vi.fn();
    render(
      <SearchInputGroup
        value="Battery"
        onChange={vi.fn()}
        onSearch={handleSearch}
        isLoading={true}
      />
    );

    expect(screen.getByText('Buscando...')).toBeDefined();
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
