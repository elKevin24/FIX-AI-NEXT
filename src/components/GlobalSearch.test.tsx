import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GlobalSearch from './GlobalSearch';

// Mock useRouter
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('GlobalSearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // vi.useFakeTimers(); // DISABLED for debugging
  });

  afterEach(() => {
    // vi.useRealTimers();
  });

  it('renders input field', () => {
    render(<GlobalSearch />);
    expect(screen.getByPlaceholderText('Buscar tickets, clientes...')).toBeDefined();
  });

  it('performs search after debounce', async () => {
    const mockResults = {
      results: [
        { type: 'ticket', id: '123', title: 'Ticket 1', subtitle: 'Customer A', status: 'OPEN' }
      ]
    };
    
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    render(<GlobalSearch />);
    
    const input = screen.getByPlaceholderText('Buscar tickets, clientes...');
    fireEvent.change(input, { target: { value: 'test' } });
    
    // Should not search immediately
    expect(fetchMock).not.toHaveBeenCalled();
    
    // Wait for real debounce (300ms) + buffer
    await new Promise(r => setTimeout(r, 400));
    
    expect(fetchMock).toHaveBeenCalledWith('/api/search?q=test');
    
    // Wait for results to appear
    expect(await screen.findByText('Ticket 1')).toBeDefined();
  });

  it('navigates on result click', async () => {
    const mockResults = {
      results: [
        { type: 'ticket', id: '123', title: 'Ticket 1', subtitle: 'Customer A', status: 'OPEN' }
      ]
    };
    
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    render(<GlobalSearch />);
    
    const input = screen.getByPlaceholderText('Buscar tickets, clientes...');
    fireEvent.change(input, { target: { value: 'test' } });
    
    await new Promise(r => setTimeout(r, 400));
    
    const ticketResult = await screen.findByText('Ticket 1');
    fireEvent.click(ticketResult);
    
    expect(pushMock).toHaveBeenCalledWith('/dashboard/tickets/123');
  });
});
