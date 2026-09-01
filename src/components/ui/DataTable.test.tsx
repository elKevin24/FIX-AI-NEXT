import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: (query: string) => query.includes('1920px'),
}));

interface TestItem {
  id: string;
  name: string;
  role: string;
}

const columns: ColumnDef<TestItem>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
];

const mockData: TestItem[] = [
  { id: '1', name: 'Alice', role: 'Admin' },
  { id: '2', name: 'Bob', role: 'Technician' },
];

describe('DataTable Component', () => {
  it('renders table headers and data correctly in desktop mode', () => {
    render(<DataTable columns={columns} data={mockData} />);

    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
  });

  it('renders empty message when no data is provided', () => {
    render(<DataTable columns={columns} data={[]} />);

    expect(screen.getByText('No hay resultados disponibles.')).toBeDefined();
  });

  it('renders loading state when isLoading is true', () => {
    render(<DataTable columns={columns} data={[]} isLoading={true} />);

    expect(screen.getByText('Cargando datos...')).toBeDefined();
  });

  it('calls onRowClick when a row is clicked or activated with Enter key', () => {
    const handleRowClick = vi.fn();
    render(<DataTable columns={columns} data={mockData} onRowClick={handleRowClick} />);

    const aliceRow = screen.getByText('Alice').closest('tr');
    if (aliceRow) {
      fireEvent.click(aliceRow);
      expect(handleRowClick).toHaveBeenCalledWith(mockData[0]);

      fireEvent.keyDown(aliceRow, { key: 'Enter' });
      expect(handleRowClick).toHaveBeenCalledTimes(2);
    }
  });

  it('renders mobile cards when renderMobileCard is passed on matching viewport', () => {
    const renderCard = (item: TestItem) => (
      <div data-testid={`card-${item.id}`}>
        <strong>{item.name}</strong> - {item.role}
      </div>
    );

    render(
      <DataTable
        columns={columns}
        data={mockData}
        renderMobileCard={renderCard}
        mobileBreakpoint="1920px" // Forces mobile branch for testing
      />
    );

    expect(screen.getByTestId('card-1')).toBeDefined();
    expect(screen.getByTestId('card-2')).toBeDefined();
  });
});
