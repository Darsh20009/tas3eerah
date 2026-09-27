'use strict';

const { chromium } = require('playwright-core');

const baseUrl = process.env.SMOKE_URL ||
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : '');
if (!baseUrl) throw new Error('Set SMOKE_URL or REPLIT_DEV_DOMAIN.');

const slugs = ['services', 'packages', 'menu', 'retail', 'tech', 'saas', 'design'];

async function login(page, role) {
  await page.goto(baseUrl, { waitUntil: 'load' });
  const response = await page.evaluate(async selectedRole => {
    const tokenResponse = await fetch('/api/auth?action=csrf');
    const token = (await tokenResponse.json()).data.csrf_token;
    const result = await fetch('/api/auth?action=demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify({ role: selectedRole }),
    });
    return { status: result.status, payload: await result.json() };
  }, role);
  if (!response.payload.success) {
    throw new Error(`Unable to enter development demo as ${role}: ${response.status} ${response.payload.error}`);
  }
  const authenticated = await page.evaluate(async () => {
    const result = await (await fetch('/api/auth?action=me')).json();
    return result.data?.role;
  });
  if (authenticated !== role) throw new Error(`Session did not persist for ${role}`);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  const failures = [];
  try {
    const policyContext = await browser.newContext({ ignoreHTTPSErrors: true });
    const policyPage = await policyContext.newPage();
    policyPage.on('pageerror', error => failures.push(`policies: ${error.message}`));
    await policyPage.goto(baseUrl, { waitUntil: 'load' });
    const legalLinks = policyPage.locator('footer a[href^="/policies#"]');
    if (await legalLinks.count() !== 5) failures.push('landing: expected five policy links');
    await policyPage.locator('footer a[href="/policies#refund"]').click();
    await policyPage.waitForURL('**/policies#refund');
    const policySections = policyPage.locator('.policies-section');
    const refundCopy = await policyPage.locator('#refund').innerText();
    if (await policySections.count() !== 5 ||
        !refundCopy.includes('خلال ساعة واحدة (60 دقيقة)') ||
        !await policyPage.getByText('آخر تحديث: 20 سبتمبر 2026').count()) {
      failures.push('policies: missing uploaded sections, refund window, or document date');
    }
    await policyPage.setViewportSize({ width: 390, height: 844 });
    const mobileWidth = await policyPage.evaluate(() => document.documentElement.scrollWidth);
    if (mobileWidth > 390) failures.push(`policies: horizontal overflow on mobile (${mobileWidth}px)`);
    console.log(`policies: ${await policySections.count()} sections, mobile width ${mobileWidth}px`);
    await policyContext.close();

    for (const role of ['admin', 'employee', 'client']) {
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      let currentPath = '';
      page.on('pageerror', error => failures.push(`${role} ${currentPath}: ${error.message}`));
      page.on('response', response => {
        const path = new URL(response.url()).pathname;
        if (path.startsWith('/assets/') && response.status() >= 400) {
          failures.push(`${role} ${currentPath}: asset ${path} returned ${response.status()}`);
        }
      });
      await login(page, role);
      currentPath = '/dashboard';
      const dashboard = await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      const dashboardTitle = await page.title();
      console.log(`${role} dashboard: HTTP ${dashboard.status()}, ${dashboardTitle}, path ${new URL(page.url()).pathname}`);
      if (dashboard.status() !== 200 || !dashboardTitle.includes('لوحة التحكم')) {
        failures.push(`${role} dashboard failed to render`);
      }

      if (role === 'admin') {
        for (const slug of slugs) {
          currentPath = `/calculator/${slug}`;
          const response = await page.goto(`${baseUrl}${currentPath}`, { waitUntil: 'load' });
          await page.waitForTimeout(350);
          const calculator = page.locator('#integrated-tools .tool-screen.active');
          const count = await calculator.count();
          if (slug === 'services' && count) {
            await page.locator('[onclick*="classicSelectField(this,\'art\')"]').first().click();
            await page.locator('[onclick*="selectSvc(this,\'art\',\'بورتريه شخصي\')"]').first().click();
            await page.locator('#art-hours').fill('1');
            await page.locator('#art-rate').fill('100');
            await page.locator('[onclick*="selectLevel(this,30"]').first().click();
            if (!await page.locator('#res-wrap.show #r-price').count()) {
              failures.push('services: no calculated final price after completing a service');
            }
          }
          const numberInput = page.locator('#integrated-tools .tool-screen.active input[type="number"]:visible').first();
          const before = count ? await calculator.innerText() : '';
          let recalculated = null;
          if (await numberInput.count()) {
            await numberInput.fill('123');
            await numberInput.dispatchEvent('input');
            await numberInput.dispatchEvent('change');
            await page.waitForTimeout(150);
            recalculated = before !== await calculator.innerText();
          }
          await page.waitForTimeout(100);
          console.log(`${slug}: HTTP ${response.status()}, active screens ${count}, output changed ${recalculated}, title ${await page.title()}`);
          if (response.status() !== 200 || count !== 1) failures.push(`${slug}: calculator not visible`);
          if (recalculated === false) failures.push(`${slug}: calculation output did not change after editing an input`);
          if (slug === 'services') {
            let posted;
            await page.route('**/api/quotes?action=create', async route => {
              posted = JSON.parse(route.request().postData());
              await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, data: { id: 999, number: 'TEST-999' } }),
              });
            });
            await page.locator('#calculatorQuoteOpen').click();
            await page.locator('#calculatorQuoteOverlay:not(.hidden)').waitFor();
            await page.locator('#calculatorQuoteClient').selectOption({ index: 1 });
            await page.locator('#calculatorQuoteSave').click();
            await page.getByText('تم حفظ العرض رقم TEST-999', { exact: false }).waitFor();
            if (!posted || !posted.items?.[0]?.unit_price || posted.tax_rate !== 0 || !posted.client_id) {
              failures.push('services: Save as Quote did not send a valid calculated amount and client');
            }
            await page.unroute('**/api/quotes?action=create');
          }
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  if (failures.length) {
    console.error('Browser smoke failures:\n' + failures.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('No page-level JavaScript exceptions in the visited pages.');
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});