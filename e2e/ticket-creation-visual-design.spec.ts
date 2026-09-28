import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Auditoría Visual y de Diseño: Flujos de Creación de Tickets', () => {
  const screenshotsDir = path.join(process.cwd(), 'playwright-report', 'screenshots');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'adminkev@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Pantalla Inicial de Creación: Formulario y Glassmorfismo
  // ─────────────────────────────────────────────────────────────
  test('Diseño 1: Formulario de Creación Estándar (Desktop y Mobile)', async ({ page }) => {
    // 1.1 Desktop Viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard/tickets/create');
    await expect(page.locator('h1').first()).toContainText('Nuevo Ticket');

    // Verificar que no hay overflow horizontal involuntario
    const isOverflowingDesktop = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowingDesktop).toBe(false);

    // Verificar componentes del Design System
    await expect(page.locator('div[class*="glassCard"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Crear Ticket")')).toBeVisible();

    // Captura de pantalla Desktop
    await page.screenshot({
      path: path.join(screenshotsDir, '01-desktop-ticket-create-initial.png'),
      fullPage: true,
    });

    // 1.2 Mobile Viewport (iPhone 13 / Pixel 5)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);

    const isOverflowingMobile = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowingMobile).toBe(false);

    // Captura de pantalla Mobile
    await page.screenshot({
      path: path.join(screenshotsDir, '01-mobile-ticket-create-initial.png'),
      fullPage: true,
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Dropdown de Búsqueda de Clientes & Indicador de Selección
  // ─────────────────────────────────────────────────────────────
  test('Diseño 2: Autocompletado de Clientes y Card de Cliente Seleccionado', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 850 });
    await page.goto('/dashboard/tickets/create');

    // 2.1 Escribir para desplegar el dropdown con estilo y avatares
    const searchInput = page.locator('input[placeholder="Nombre, Teléfono o Email..."]');
    await searchInput.fill('Carlos');
    await page.waitForTimeout(600); // Debounce

    const dropdown = page.locator('div[class*="dropdown"], ul[class*="list"]').first();
    if (await dropdown.isVisible().catch(() => false)) {
      await page.screenshot({
        path: path.join(screenshotsDir, '02-desktop-customer-search-dropdown.png'),
      });
      // Seleccionar el item
      const firstItem = page.locator('li[class*="listItem"]').first();
      if (await firstItem.isVisible().catch(() => false)) {
        await firstItem.click();
      }
    } else {
      // Si no existe, crear cliente inline
      await page.locator('button:has-text("Crear Nuevo Cliente"), li:has-text("Crear")').first().click();
    }

    // 2.2 Validar el Success Indicator (Check verde y detalles del cliente)
    await page.waitForTimeout(300);
    await expect(page.locator('div[class*="customerSelected"], input[name="customerName"], div[class*="successIndicator"]').first()).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotsDir, '02-desktop-customer-selected-card.png'),
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Creación en Lote Multi-Dispositivo (Stacking Cards & Badges)
  // ─────────────────────────────────────────────────────────────
  test('Diseño 3: Formulario Multi-Dispositivo con Tarjetas Apiladas', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/dashboard/tickets/create');

    // Cliente
    await page.fill('input[placeholder="Nombre, Teléfono o Email..."]', 'Corporación Tech S.A.');
    await page.locator('button:has-text("Crear Nuevo Cliente"), li:has-text("Crear")').first().click();

    // Dispositivo 1
    await page.fill('input[placeholder="Ej: Pantalla Rota"]', 'Laptop Dell XPS 15 - Teclado');
    await page.selectOption('select', 'Laptop');
    await page.fill('input[placeholder="Ej: iPhone 13 Pro"]', 'Dell XPS 9520');
    await page.fill('textarea[placeholder*="Describe los síntomas"]', 'Teclas espacio y enter no responden.');

    // Agregar Dispositivo 2
    const addDeviceBtn = page.locator('button:has-text("Agregar Otro Dispositivo"), button:has-text("Agregar Equipo")').first();
    if (await addDeviceBtn.isVisible().catch(() => false)) {
      await addDeviceBtn.click();
      await page.waitForTimeout(300);

      const titleInputs = page.locator('input[placeholder="Ej: Pantalla Rota"]');
      await titleInputs.nth(1).fill('Monitor Dell UltraSharp 27"');
      const descInputs = page.locator('textarea[placeholder*="Describe los síntomas"]');
      await descInputs.nth(1).fill('Líneas horizontales en el panel.');

      // Validar que ambas tarjetas de dispositivo están visibles
      await expect(titleInputs.nth(0)).toBeVisible();
      await expect(titleInputs.nth(1)).toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsDir, '03-desktop-batch-multidevice-form.png'),
        fullPage: true,
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Asistente / Wizard de Plantillas de Servicio
  // ─────────────────────────────────────────────────────────────
  test('Diseño 4: Catálogo y Wizard de Plantillas de Servicio', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 850 });
    await page.goto('/dashboard/tickets/create-with-template');
    await expect(page.locator('h1').first()).toContainText(/Nuevo Ticket|Asistente|Plantilla/i);

    // Validar grid de tarjetas y diseño responsivo
    const templateCards = page.locator('div[class*="templateCard"], button[class*="templateCard"], div[role="button"]');
    const count = await templateCards.count();
    if (count > 0) {
      await expect(templateCards.first()).toBeVisible();
      await templateCards.first().click();
      await page.waitForTimeout(400);
    }

    await page.screenshot({
      path: path.join(screenshotsDir, '04-desktop-template-wizard-stepper.png'),
      fullPage: true,
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Pantalla de Detalle de Ticket (Timeline, Acciones y Secciones)
  // ─────────────────────────────────────────────────────────────
  test('Diseño 5: Vista de Detalle de Ticket con Badges y Timeline', async ({ page }) => {
    const timestamp = Date.now();
    await page.setViewportSize({ width: 1280, height: 900 });

    // Crear ticket para tener ID real
    await page.goto('/dashboard/tickets/create');
    await page.fill('input[placeholder="Nombre, Teléfono o Email..."]', `Cliente Visual ${timestamp}`);
    await page.locator('button:has-text("Crear Nuevo Cliente"), li:has-text("Crear")').first().click();
    await page.fill('input[placeholder="Ej: Pantalla Rota"]', `Auditoría Visual ${timestamp}`);
    await page.selectOption('select', 'Smartphone');
    await page.fill('input[placeholder="Ej: iPhone 13 Pro"]', 'Google Pixel 8 Pro');
    await page.fill('textarea[placeholder*="Describe los síntomas"]', 'Inspección de diseño y componentes.');
    await page.click('button[type="submit"]:has-text("Crear Ticket")');

    await expect(page).toHaveURL(/\/dashboard\/tickets(?:$|\?)/, { timeout: 15000 });

    const row = page.locator('tr').filter({ hasText: `Auditoría Visual ${timestamp}` }).first();
    await row.locator('a:has-text("Ver Detalles")').click();
    await expect(page.locator('h1').first()).toContainText('Ticket #', { timeout: 10000 });

    // Validar visibilidad de secciones clave
    await expect(page.locator('button:has-text("Iniciar Reparación"), button:has-text("Acciones")').first()).toBeVisible();

    // Captura Desktop de Detalle
    await page.screenshot({
      path: path.join(screenshotsDir, '05-desktop-ticket-detail-view.png'),
      fullPage: true,
    });

    // Captura Mobile de Detalle
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(screenshotsDir, '05-mobile-ticket-detail-view.png'),
      fullPage: true,
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Formatos de Impresión: Ticket 80mm y Comprobante Media Carta
  // ─────────────────────────────────────────────────────────────
  test('Diseño 6: Formato Térmico 80mm y Comprobante Media Carta', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/dashboard/tickets');

    const firstDetail = page.locator('a:has-text("Ver Detalles")').first();
    await expect(firstDetail).toBeVisible({ timeout: 10000 });
    const href = await firstDetail.getAttribute('href');
    const ticketId = href?.split('/').pop()?.split('?')[0];
    expect(ticketId).toBeTruthy();

    // 6.1 Formato 80mm
    await page.goto(`/dashboard/tickets/${ticketId}/ticket80mm`);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: path.join(screenshotsDir, '06-desktop-ticket-80mm-receipt.png'),
      fullPage: true,
    });

    // 6.2 Formato Media Carta (Half-Letter)
    await page.goto(`/dashboard/tickets/${ticketId}/print-half-letter`);
    await expect(page.locator('h1, h2, div[class*="sheet"]').first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: path.join(screenshotsDir, '06-desktop-print-half-letter-voucher.png'),
      fullPage: true,
    });
  });
});
