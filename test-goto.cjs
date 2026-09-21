const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', 'adminkev@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  await page.goto('http://localhost:3000/dashboard/tickets');
  await page.waitForSelector('tr');
  const row = page.locator('tr').nth(1); // the first data row
  const a = row.locator('a', { hasText: 'Ver Detalles' });
  const href = await a.getAttribute('href');
  console.log('Navigating to:', href);
  await page.goto('http://localhost:3000' + href);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'goto-result.png' });
  console.log('Screenshot saved to goto-result.png');
  await browser.close();
})();
