import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecentTicketsTable from './RecentTicketsTable';

vi.mock('@/components/ui/DataTable', () => ({
  DataTable: ({ columns, data }: any) => (
    <div data-testid="data-table">
      <span data-testid="column-count">{columns.length}</span>
      <span data-testid="row-count">{data.length}</span>
    </div>
  ),
}));

describe('RecentTicketsTable', () => {
  const mockTickets = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      ticketNumber: 'TKT-001',
      title: 'Máquina CNC',
      status: 'IN_PROGRESS',
      createdAt: new Date('2025-01-15'),
      customer: { name: 'Cliente A' },
      assignedTo: { name: 'Técnico 1', email: 't1@fix.com' },
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      ticketNumber: null,
      title: 'Impresora 3D',
      status: 'OPEN',
      createdAt: new Date('2025-01-14'),
      customer: { name: 'Cliente B' },
      assignedTo: null,
    },
  ];

  it('renders DataTable with tickets', () => {
    render(<RecentTicketsTable data={mockTickets} />);
    expect(screen.getByTestId('data-table')).toBeDefined();
  });

  it('passes correct row count', () => {
    render(<RecentTicketsTable data={mockTickets} />);
    expect(screen.getByTestId('row-count').textContent).toBe('2');
  });

  it('passes 6 column definitions', () => {
    render(<RecentTicketsTable data={mockTickets} />);
    expect(screen.getByTestId('column-count').textContent).toBe('6');
  });

  it('handles empty data', () => {
    render(<RecentTicketsTable data={[]} />);
    expect(screen.getByTestId('row-count').textContent).toBe('0');
  });
});
