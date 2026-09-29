import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ExportButton from './ExportButton';

describe('ExportButton component', () => {
  it('renders export button and format options', () => {
    render(<ExportButton type="tickets" />);
    expect(screen.getByText('📥 Exportar')).toBeDefined();
    expect(screen.getByText('Excel (.xlsx)')).toBeDefined();
    expect(screen.getByText('CSV (.csv)')).toBeDefined();
  });

  it('triggers export link download on format click', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    render(<ExportButton type="parts" />);

    const excelBtn = screen.getByText('Excel (.xlsx)');
    fireEvent.click(excelBtn);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    createElementSpy.mockRestore();
  });
});
