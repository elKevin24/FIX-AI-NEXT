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
  const trs = await page.$$('tr');
  for (const tr of trs) {
    const text = await tr.innerText();
    if (text.includes('Ver Detalles')) {
      const a = await tr.$('a');
      const href = await a.getAttribute('href');
      const html = await tr.evaluate(el => el.outerHTML);
      console.log('HREF:', href);
      console.log('HTML:', html);
      break;
    }
  }
  await browser.close();
})();
