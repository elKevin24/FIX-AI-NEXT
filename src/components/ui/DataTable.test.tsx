import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DataTable } from './DataTable';
import { ColumnDef } from '@tanstack/react-table';

interface TestItem {
  id: string;
  name: string;
  price: number;
}

const columns: ColumnDef<TestItem>[] = [
  {
    accessorKey: 'name',
    header: 'Product Name',
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => `$${row.original.price.toFixed(2)}`,
  },
];

const mockData: TestItem[] = [
  { id: '1', name: 'Screen iPhone 13', price: 120 },
  { id: '2', name: 'Battery Galaxy S22', price: 65 },
];

describe('DataTable component', () => {
  it('renders table headers and row items', () => {
    render(
      <DataTable
        columns={columns}
        data={mockData}
        caption="Inventario de repuestos"
      />
    );

    expect(screen.getByText('Product Name')).toBeDefined();
    expect(screen.getByText('Price')).toBeDefined();
    expect(screen.getByText('Screen iPhone 13')).toBeDefined();
    expect(screen.getByText('$120.00')).toBeDefined();
    expect(screen.getByText('Battery Galaxy S22')).toBeDefined();
    expect(screen.getByText('$65.00')).toBeDefined();
  });

  it('renders loading skeleton state', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        isLoading={true}
      />
    );

    expect(screen.getByText('Cargando datos...')).toBeDefined();
  });

  it('renders empty state when no data exists', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        isLoading={false}
      />
    );

    expect(screen.getByText('No hay resultados disponibles.')).toBeDefined();
  });

  it('handles row click events', () => {
    const handleRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={mockData}
        onRowClick={handleRowClick}
      />
    );

    const row = screen.getByText('Screen iPhone 13');
    fireEvent.click(row);
    expect(handleRowClick).toHaveBeenCalledWith(mockData[0]);
  });
});
