import { test, expect } from '@playwright/test';

/**
 * Helper to count interactive controls (inputs, selects, buttons) within a section.
 */
async function countControls(section: any) {
  const inputs = await section.locator('input').count();
  const selects = await section.locator('select').count();
  const buttons = await section.locator('button').count();
  return inputs + selects + buttons;
}

test.describe('Miller heuristic UI validation', () => {
  // Assuming the dev server runs and authentication is handled via a test fixture or preset cookie.

  test('Ticket search filters respect 7±2 grouping', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/tickets');
    // Primary filters
    const primary = page.getByRole('region', { name: /Búsqueda de Tickets/i });
    const primaryCount = await countControls(primary);
    expect(primaryCount).toBeLessThanOrEqual(9);

    // Advanced filters sections
    const advanced = page.getByRole('region', { name: /Más Filtros/i });
    // Date filters group
    const dateGroup = advanced.getByRole('group', { name: /Rango de Fechas/i });
    expect(await countControls(dateGroup)).toBeLessThanOrEqual(9);
    // Technician group
    const techGroup = advanced.getByRole('group', { name: /Técnico Asignado/i });
    expect(await countControls(techGroup)).toBeLessThanOrEqual(9);
    // Device type group
    const deviceGroup = advanced.getByRole('group', { name: /Tipo de Dispositivo/i });
    expect(await countControls(deviceGroup)).toBeLessThanOrEqual(9);
  });

  test('Part search filters respect 7±2 grouping', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/parts');
    const primary = page.getByRole('region', { name: /Búsqueda de Partes/i });
    expect(await countControls(primary)).toBeLessThanOrEqual(9);
    // Add similar checks for any advanced sections if present
  });

  test('Customer search filters respect 7±2 grouping', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/customers');
    const primary = page.getByRole('region', { name: /Búsqueda de Clientes/i });
    expect(await countControls(primary)).toBeLessThanOrEqual(9);
  });

  test('Large forms are split into sections ≤9 fields', async ({ page }) => {
    // Edit customer form
    await page.goto('http://localhost:3000/dashboard/customers/1/edit');
    const form = page.locator('form');
    const groups = await form.locator('section').all();
    for (const group of groups) {
      const count = await countControls(group);
      expect(count).toBeLessThanOrEqual(9);
    }
  });
});
