import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import PaginationControls from './PaginationControls';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/dashboard/tickets',
}));

describe('PaginationControls component', () => {
  it('renders page numbers, total items, and handles page transitions', () => {
    render(
      <PaginationControls
        currentPage={2}
        totalPages={5}
        hasNextPage={true}
        hasPrevPage={true}
        totalItems={50}
      />
    );

    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('(50 resultados)')).toBeDefined();

    const nextBtn = screen.getByRole('button', { name: /siguiente/i });
    fireEvent.click(nextBtn);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/tickets?page=3');

    const prevBtn = screen.getByRole('button', { name: /anterior/i });
    fireEvent.click(prevBtn);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/tickets?page=1');
  });

  it('disables buttons at boundaries', () => {
    render(
      <PaginationControls
        currentPage={1}
        totalPages={1}
        hasNextPage={false}
        hasPrevPage={false}
        totalItems={5}
      />
    );

    const prevBtn = screen.getByRole('button', { name: /anterior/i }) as HTMLButtonElement;
    const nextBtn = screen.getByRole('button', { name: /siguiente/i }) as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(true);
  });
});
