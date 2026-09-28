import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ExportButton from './ExportButton';

/**
 * Regresión de MF-101: el menú se abría solo con :hover y el componente no
 * tenía onClick ni estado, por lo que era inalcanzable en cualquier
 * dispositivo táctil. Estos tests fallan contra la implementación anterior.
 *
 * Sin @testing-library/jest-dom en el proyecto: solo aserciones nativas.
 */
describe('ExportButton', () => {
  afterEach(() => {
    cleanup();
  });

  const renderButton = (type: 'tickets' | 'parts' | 'invoices' | 'pos-sales' = 'tickets') =>
    render(<ExportButton type={type} />);

  it('expone el menú como tal y declara el estado colapsado', () => {
    renderButton();
    const trigger = screen.getByRole('button', { name: /exportar/i });

    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('abre el menú con click, sin depender de hover', () => {
    renderButton();
    const trigger = screen.getByRole('button', { name: /exportar/i });

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('alterna el menú al pulsar dos veces', () => {
    renderButton();
    const trigger = screen.getByRole('button', { name: /exportar/i });

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('cierra con Escape y devuelve el foco al disparador', () => {
    renderButton();
    const trigger = screen.getByRole('button', { name: /exportar/i });

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('cierra al pulsar fuera', () => {
    renderButton();
    const trigger = screen.getByRole('button', { name: /exportar/i });

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    fireEvent.mouseDown(document.body);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('expone las dos opciones de formato', () => {
    renderButton('invoices');

    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toContain('Excel (.xlsx)');
    expect(items[1]?.textContent).toContain('CSV (.csv)');
  });
});
