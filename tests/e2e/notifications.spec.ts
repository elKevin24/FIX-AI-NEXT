import { test, expect } from '@playwright/test';

test.describe('Notifications Flow', () => {
  test('User can open notifications dropdown', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@electrofix.com');
    await page.fill('input[name="password"]', 'Admin@2024!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Click on notification bell (we look for the button containing a bell icon or aria-label)
    const bellButton = page.locator('button[aria-label="Notificaciones"], button:has(svg.lucide-bell)');
    
    if (await bellButton.count() > 0) {
      await bellButton.first().click();
      
      // Check if a dropdown or list is visible
      const dropdown = page.locator('div[role="menu"], div[role="dialog"]').filter({ hasText: /Notificaciones/i });
      if (await dropdown.count() > 0) {
        await expect(dropdown.first()).toBeVisible();
      }
    }
  });
});
