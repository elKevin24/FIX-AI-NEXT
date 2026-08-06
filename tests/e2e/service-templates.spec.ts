import { test, expect } from '@playwright/test';

test.describe('Service Templates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'adminkev@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('should view the list of service templates', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/dashboard/settings/service-templates');
    await expect(page).toHaveURL(/\/dashboard\/settings\/service-templates/);
    await expect(page.locator('h1', { hasText: 'Plantillas de Servicio' })).toBeVisible({ timeout: 10000 });
  });
});
