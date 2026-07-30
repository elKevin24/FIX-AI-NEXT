import { test, expect } from '@playwright/test';

test.describe('Full Ticket Lifecycle', () => {
  test('should complete full lifecycle from creation to delivery and payment', async ({ page }) => {
    test.setTimeout(120000);

    const timestamp = Date.now();
    const customerName = `E2E Lifecycle ${timestamp}`;
    const ticketTitle = `Pantalla Rota ${timestamp}`;

    // ── 1. Login as Admin ──
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@electrofix.com');
    await page.fill('input[name="password"]', 'Admin@2024!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    // ── 2. Create Ticket ──
    await page.goto('/dashboard/tickets/create');
    await expect(page.locator('h1')).toContainText('Nuevo Ticket');

    // Customer search — type a unique name so "Crear Nuevo Cliente" appears
    await page.fill('input[placeholder="Nombre, Teléfono o Email..."]', customerName);
    await page.waitForTimeout(600);
    await page.locator('button:has-text("Crear Nuevo Cliente")').click();

    // Fill device info
    await page.fill('input[placeholder="Ej: Pantalla Rota"]', ticketTitle);
    await page.fill('textarea[placeholder*="Describe los síntomas"]', 'Pantalla estrellada, táctil no responde en la parte inferior.');
    await page.fill('input[placeholder="Ej: iPhone 13 Pro"]', 'Samsung Galaxy S25');
    await page.fill('input[placeholder="SN-1234..."]', `SN-${timestamp}`);

    // Submit
    await page.click('button:has-text("Crear Ticket")');

    // Should redirect to tickets list
    await expect(page).toHaveURL(/\/dashboard\/tickets$/, { timeout: 20000 });

    // ── 3. Find and open the ticket ──
    // The ticket list is ordered by updatedAt desc; our new ticket should be first
    // Navigate to tickets list without search params to avoid broken trigram query
    await page.goto('/dashboard/tickets');

    // Click the first "Ver Detalles" link
    await page.locator('a:has-text("Ver Detalles")').first().click();
    await expect(page).toHaveURL(/\/dashboard\/tickets\//, { timeout: 10000 });

    // Capture ticket ID from URL for later navigation
    const ticketUrl = page.url();
    const ticketId = ticketUrl.split('/').pop();
    expect(ticketId).toBeTruthy();

    // ── 4. Start Repair (OPEN → IN_PROGRESS) ──
    await page.locator('button:has-text("Iniciar Reparación")').click();
    await page.waitForTimeout(2000);
    await page.reload();

    // "Marcar Resuelto" appears when IN_PROGRESS
    await expect(page.locator('button:has-text("Marcar Resuelto")')).toBeVisible({ timeout: 10000 });

    // ── 5. Add a Part ──
    await page.locator('button:has-text("Agregar Repuesto")').click();
    const partSelect = page.locator('select[name="partId"]');
    await partSelect.waitFor({ state: 'visible' });
    const partOptions = await partSelect.locator('option').all();
    if (partOptions.length > 1) {
      const firstPartValue = await partOptions[1].getAttribute('value');
      if (firstPartValue) {
        await partSelect.selectOption(firstPartValue);
      }
    }
    await page.fill('input[name="quantity"]', '1');
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    await page.waitForTimeout(1000);
    await page.reload();

    // ── 6. Add a Service ──
    await page.getByRole('button', { name: '+ Agregar Servicio' }).click();
    const serviceSelect = page.locator('select[name="serviceId"]');
    await serviceSelect.waitFor({ state: 'visible' });
    const serviceOptions = await serviceSelect.locator('option').all();
    if (serviceOptions.length > 1) {
      const firstServiceValue = await serviceOptions[1].getAttribute('value');
      if (firstServiceValue) {
        await serviceSelect.selectOption(firstServiceValue);
      }
    }
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    await page.waitForTimeout(1000);
    await page.reload();

    // ── 7. Add a Note ──
    await page.fill('textarea[placeholder*="Agregar una nota"]', `Diagnóstico completo. Se reemplazó pantalla y se probó funcionalidad. Todo OK. - ${timestamp}`);
    await page.locator('button:has-text("Agregar Nota")').click();
    await page.waitForTimeout(1000);
    await page.reload();

    // ── 8. Resolve (IN_PROGRESS → RESOLVED) ──
    await page.locator('button:has-text("Marcar Resuelto")').click();
    await page.fill('textarea#resolve-note', 'Reparación completada: pantalla reemplazada, prueba de funcionamiento exitosa.');
    await page.locator('button:has-text("Marcar como Resuelto")').click();
    await page.waitForTimeout(2000);
    await page.reload();

    // "Entregar y Cerrar" appears when RESOLVED
    await expect(page.locator('button:has-text("Entregar y Cerrar")')).toBeVisible({ timeout: 10000 });

    // ── 9. Generate Invoice ──
    page.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('Generar factura');
      dialog.accept();
    });
    await page.locator('button:has-text("Generar Factura")').click();

    // Wait for invoice link to appear
    await expect(page.locator('a:has-text("Ver Factura")')).toBeVisible({ timeout: 15000 });

    // ── 10. View Invoice ──
    await page.locator('a:has-text("Ver Factura")').click();
    await expect(page).toHaveURL(/\/dashboard\/invoices\//, { timeout: 10000 });

    // ── 11. Register Payment ──
    await page.locator('button:has-text("Registrar Pago")').click();
    await page.waitForTimeout(500);

    // Read the total displayed and pay that exact amount
    const totalLocator = page.locator('div[class*="summaryRow"] span:has-text("TOTAL")');
    const parentRow = totalLocator.locator('..');
    const totalValueSpan = parentRow.locator('span').last();
    const totalText = await totalValueSpan.textContent() || '';
    const totalAmount = parseFloat(totalText.replace(/[^0-9.-]/g, ''));

    if (totalAmount > 0) {
      await page.locator('input[type="number"]').fill(totalAmount.toString());
    }

    await page.locator('button:has-text("Confirmar Pago")').click();

    // Verify the invoice shows PAID
    await expect(page.locator('text=PAGADO')).toBeVisible({ timeout: 10000 });

    // ── 12. Return to ticket ──
    await page.goto(`/dashboard/tickets/${ticketId}`, { waitUntil: 'networkidle' });

    // ── 13. Deliver and Close (RESOLVED → CLOSED) ──
    await page.locator('button:has-text("Entregar y Cerrar")').click();
    await page.waitForTimeout(1000);

    // Verify the delivery receipt PDF link is visible
    await expect(page.locator('a:has-text("Comprobante de Entrega")')).toBeVisible({ timeout: 10000 });

    // Also verify the invoice link is still visible
    await expect(page.locator('a:has-text("Ver Factura")')).toBeVisible();
  });
});
