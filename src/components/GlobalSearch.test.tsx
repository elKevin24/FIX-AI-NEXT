import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GlobalSearch from './GlobalSearch';

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    render(<GlobalSearch />);
    expect(screen.getByPlaceholderText('Buscar tickets, clientes, repuestos...')).toBeDefined();
  });

  it('searches when query is long enough', async () => {
    const mockResults = {
      results: [
        { type: 'ticket', id: '1', title: 'Test Ticket', subtitle: 'Customer Name', status: 'OPEN' }
      ]
    };
    (global.fetch as any).mockResolvedValue({
      json: async () => mockResults,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText('Buscar tickets, clientes, repuestos...');
    
    fireEvent.change(input, { target: { value: 'tes' } });

    // Wait for debounce and fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/search?q=tes');
    });

    await waitFor(() => {
      expect(screen.getByText('Test Ticket')).toBeDefined();
    });
  });

  it('navigates on result click', async () => {
    const mockResults = {
      results: [
        { type: 'ticket', id: '1', title: 'Test Ticket', subtitle: 'Customer Name', status: 'OPEN' }
      ]
    };
    (global.fetch as any).mockResolvedValue({
      json: async () => mockResults,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText('Buscar tickets, clientes, repuestos...');
    fireEvent.change(input, { target: { value: 'tes' } });

    await waitFor(() => {
      expect(screen.getByText('Test Ticket')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Test Ticket'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/tickets/1');
  });
});