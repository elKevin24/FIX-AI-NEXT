import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully as Admin', async ({ page }) => {
    await page.goto('/login');

    // Login as Admin from Tenant 1 (ElectroFix)
    await page.fill('input[name="email"]', 'admin@electrofix.com');
    await page.fill('input[name="password"]', 'Admin@2024!');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    
    // Verify dashboard content is visible
    await expect(page.locator('h1', { hasText: 'Dashboard' }).or(page.locator('h1'))).toBeVisible({ timeout: 10000 });
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in wrong credentials
    await page.fill('input[name="email"]', 'admin@electrofix.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    const errorMessage = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/credenciales|incorrect|invalid|Something went wrong/i);
    
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });
});
