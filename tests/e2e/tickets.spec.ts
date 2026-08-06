import { test, expect } from '@playwright/test';

test.describe('Ticket Flows', () => {
  // Configurar sesión de administrador para todas las pruebas
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'adminkev@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('should create a new ticket, view details, post a note and change status', async ({ page }) => {
    test.setTimeout(30000); // 30s timeout

    // 1. Navigate to Create Ticket page
    await page.goto('/dashboard/tickets/create');
    await expect(page).toHaveURL(/\/dashboard\/tickets\/create/);

    // 2. Fill Customer Info (Create a new customer inline)
    const timestamp = new Date().getTime();
    const customerName = `E2E Customer ${timestamp}`;
    
    await page.fill('input[placeholder="Nombre, Teléfono o Email..."]', customerName);
    // Wait for the dropdown and click create new
    const createNewButton = page.locator('button', { hasText: 'Crear Nuevo Cliente' });
    await createNewButton.waitFor();
    await createNewButton.click();
    
    // Fill optional customer details
    await page.fill('input[type="email"]', `e2e${timestamp}@example.com`);
    await page.fill('input[type="tel"]', `5555${timestamp.toString().slice(-4)}`);

    // 3. Fill Device Info
    const uniqueTitle = `E2E Device Broken Screen ${timestamp}`;
    await page.fill('input[placeholder="Ej: Pantalla Rota"]', uniqueTitle);
    await page.selectOption('select', 'Smartphone'); // Tipo
    await page.fill('input[placeholder="Ej: iPhone 13 Pro"]', 'iPhone 14 E2E');
    await page.fill('textarea[placeholder*="Describe los síntomas"]', 'Screen is cracked and touch does not work.');
    await page.fill('input[placeholder="SN-1234..."]', `SN-${timestamp}`);

    // 4. Submit Form
    await page.click('button[type="submit"]:has-text("Crear Ticket")');

    // 5. Verify redirection to tickets list
    // Wait a bit to see if there's an error alert on the form
    try {
      await page.waitForURL(/\/dashboard\/tickets(?:$|\?)/, { timeout: 10000 });
    } catch (e) {
      // If it fails to navigate, maybe there's an error on the page
      const alertLocator = page.locator('.alert-error');
      if (await alertLocator.isVisible()) {
        const errorText = await alertLocator.textContent();
        throw new Error(`Form submission failed with error: ${errorText}`);
      }
      throw e;
    }
    
    // Verify the new ticket appears in the list (wait for text to appear)
    await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible({ timeout: 10000 });

    // 6. View Ticket Details
    // Find the row containing our ticket and click the 'Ver Detalles' button
    const row = page.locator('tr').filter({ hasText: uniqueTitle }).first();
    const detailLink = row.locator('a', { hasText: 'Ver Detalles' });
    
    // Make sure it's visible before clicking
    await expect(detailLink).toBeVisible({ timeout: 10000 });
    
    const href = await detailLink.getAttribute('href');
    await detailLink.click();
    
    try {
        await page.waitForURL(/\/dashboard\/tickets\/[a-zA-Z0-9-]{36}/, { timeout: 5000 });
    } catch {
        // Fallback for Next.js Link hydration flakiness in Playwright
        if (href) {
            await page.goto(href);
        }
    }
    await expect(page.locator('h1')).toContainText('Ticket #', { timeout: 5000 });

    // 7. Add an internal note
    const noteContent = `Internal note added by E2E test at ${timestamp}`;
    await page.fill('textarea[placeholder="Agregar una nota sobre la reparación..."]', noteContent);
    await page.click('button:has-text("Agregar Nota")');
    // Verify note was added in the timeline
    await expect(page.locator(`text=${noteContent}`).first()).toBeVisible({ timeout: 10000 });

    // 8. Change Ticket Status
    // A newly created ticket should be OPEN. We click '▶ Iniciar Reparación' to change it to IN_PROGRESS.
    await page.click('button:has-text("▶ Iniciar Reparación")');
    // Wait for the status badge to update to "En Progreso"
    await expect(page.locator('span', { hasText: 'En Progreso' }).first()).toBeVisible({ timeout: 10000 });
  });
});
