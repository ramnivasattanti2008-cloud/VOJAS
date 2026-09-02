const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));

  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const inputs = await page.locator('input').all();
    await inputs[0].fill('officer@vojas.gov');
    await inputs[1].fill('VojasDemo2026');
    await page.locator('button[type=submit]').first().click();

    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
    await page.waitForTimeout(2000);

    console.log('[1] Navigating to anomalies...');
    await page.goto('http://localhost:5173/anomalies', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    await page.locator('body').click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(8000);

    console.log('[2] Scrolling to top and capturing...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);

    const out = 'C:/Users/Ram Nivas/Desktop/anomalies-screenshot.png';
    const buffer = await page.screenshot({ fullPage: true, type: 'png' });
    fs.writeFileSync(out, buffer);
    console.log('[3] Saved: ' + out + ' (' + buffer.length + ' bytes)');

    if (errors.length) {
      console.log('CONSOLE ERRORS:');
      errors.slice(0, 10).forEach(e => console.log('  - ' + e));
    } else {
      console.log('No console errors.');
    }
  } catch (err) {
    console.error('FAILED:', err.message);
    try {
      const errBuf = await page.screenshot({ fullPage: true, type: 'png' });
      fs.writeFileSync('C:/Users/Ram Nivas/Desktop/anomalies-error.png', errBuf);
      console.log('Error screenshot saved.');
    } catch {}
  } finally {
    await browser.close();
  }
})();
