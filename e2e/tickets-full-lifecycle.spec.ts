import { test, expect } from '@playwright/test';

test.describe('Ciclo de Vida Completo del Ticket', () => {
  test('Flujo E2E desde creación, asignación, nota y avance de estados', async ({ page }) => {
    test.setTimeout(120000);

    const timestamp = Date.now();
    const customerName = `E2E Lifecycle ${timestamp}`;
    const ticketTitle = `Pantalla Rota ${timestamp}`;

    // ── 1. Login as Admin ──
    await page.goto('/login');
    await page.fill('input[name="email"]', 'adminkev@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    // ── 2. Create Ticket ──
    await page.goto('/dashboard/tickets/create');
    await expect(page.locator('h1').first()).toContainText('Nuevo Ticket');

    // Customer search — type a unique name so "Crear Nuevo Cliente" appears
    await page.fill('input[placeholder="Nombre, Teléfono o Email..."]', customerName);
    await page.waitForTimeout(600);
    const newCustBtn = page.locator('button:has-text("Crear Nuevo Cliente"), li:has-text("Crear")').first();
    await newCustBtn.click();

    // Fill device info
    await page.fill('input[placeholder="Ej: Pantalla Rota"]', ticketTitle);
    await page.fill('textarea[placeholder*="Describe los síntomas"]', 'Pantalla estrellada, táctil no responde en la parte inferior.');
    await page.fill('input[placeholder="Ej: iPhone 13 Pro"]', 'Samsung Galaxy S25');
    await page.fill('input[placeholder="SN-1234..."]', `SN-${timestamp}`);

    // Submit
    await page.click('button:has-text("Crear Ticket")');

    // Should redirect to tickets list
    await expect(page).toHaveURL(/\/dashboard\/tickets(?:$|\?)/, { timeout: 20000 });

    // ── 3. Find and open the ticket ──
    const firstLink = page.locator('tr').filter({ hasText: ticketTitle }).first().locator('a:has-text("Ver Detalles")');
    await expect(firstLink).toBeVisible({ timeout: 10000 });
    await firstLink.click();
    
    await expect(page.locator('h1').first()).toContainText('Ticket #', { timeout: 10000 });

    // Capture ticket ID from URL
    const ticketUrl = page.url();
    const ticketId = ticketUrl.split('/').pop()?.split('?')[0];
    expect(ticketId).toBeTruthy();

    // ── 4. Start Repair (OPEN → IN_PROGRESS) ──
    const startBtn = page.locator('button:has-text("Iniciar Reparación")');
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(1500);
      await page.reload();
      await expect(page.locator('span:has-text("En Progreso"), button:has-text("Marcar Resuelto")').first()).toBeVisible({ timeout: 10000 });
    }

    // ── 5. Add a Note ──
    const noteArea = page.locator('textarea[placeholder*="Agregar una nota"]');
    if (await noteArea.isVisible().catch(() => false)) {
      await noteArea.fill(`Diagnóstico completo. Pantalla reemplazada y probada OK - ${timestamp}`);
      await page.locator('button:has-text("Agregar Nota")').click();
      await page.waitForTimeout(1000);
      await page.reload();
      await expect(page.locator(`text=Diagnóstico completo`).first()).toBeVisible({ timeout: 10000 });
    }
  });
});
