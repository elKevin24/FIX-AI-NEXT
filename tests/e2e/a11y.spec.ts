import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('Accessibility Audits (Axe-core WCAG 2.2 AA)', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Admin before running audits
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@electrofix.com');
    await page.fill('input[name="password"]', 'Admin@2024!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  });

  test('Dashboard should have 0 automatically detectable accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    if (accessibilityScanResults.violations.length > 0) {
      console.error('Dashboard Violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Tickets list should have 0 automatically detectable accessibility violations', async ({ page }) => {
    await page.goto('/dashboard/tickets');
    await page.waitForLoadState('networkidle');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    if (accessibilityScanResults.violations.length > 0) {
      console.error('Tickets Violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Parts list should have 0 automatically detectable accessibility violations', async ({ page }) => {
    await page.goto('/dashboard/parts');
    await page.waitForLoadState('networkidle');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    if (accessibilityScanResults.violations.length > 0) {
      console.error('Parts Violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Service Template Form should have 0 automatically detectable accessibility violations', async ({ page }) => {
    await page.goto('/dashboard/settings/service-templates/new');
    await page.waitForLoadState('networkidle');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    if (accessibilityScanResults.violations.length > 0) {
      console.error('Template Form Violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Ticket Wizard with Template Preview should have 0 accessibility violations', async ({ page }) => {
    await page.goto('/dashboard/tickets/create-with-template');
    await page.waitForLoadState('networkidle');

    // Click the first template card (not manual creation)
    const templateButton = page.locator('button[style*="--template-color"]').first();
    if (await templateButton.isVisible()) {
      await templateButton.click();
      await page.waitForTimeout(500);
    }

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    if (accessibilityScanResults.violations.length > 0) {
      console.error('Ticket Wizard Preview Violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
