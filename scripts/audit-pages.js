'use strict';

// Read-only UI audit. It never sends mail, saves settings, or edits user records.
const { chromium } = require('playwright-core');
const base = process.env.SMOKE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
const slugs = ['services', 'packages', 'menu', 'retail', 'tech', 'saas', 'design'];

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
    headless: true, args: ['--no-sandbox'],
  });
  const failures = [];
  const external = [];
  let checked = 0;
  function track(page, label) {
    page.on('pageerror', error => failures.push(`${label()}: ${error.message}`));
    page.on('response', response => {
      const url = new URL(response.url());
      let action = url.searchParams.get('action');
      try { action ||= response.request().postDataJSON()?.action; } catch {}
      if (url.pathname.startsWith('/assets/') && response.status() >= 400) {
        failures.push(`${label()}: missing asset ${url.pathname} (${response.status()})`);
      }
      if (url.pathname === '/api/admin' && action?.startsWith('mailbox') &&
          response.status() >= 400) {
        external.push(`Mailbox: HTTP ${response.status()}`);
      } else if (url.pathname.startsWith('/api/') && response.status() >= 500) {
        failures.push(`${label()}: ${url.pathname} action=${action || '-'} HTTP ${response.status()}`);
      }
    });
  }
  try {
    const publicContext = await browser.newContext({ ignoreHTTPSErrors: true });
    const publicPage = await publicContext.newPage();
    let current = 'public';
    track(publicPage, () => current);
    for (const pathname of ['/', '/help', '/policies', '/legacy-calculator.html', '/classic-tools',
      '/classic-tools?embed=1&tool=services', '/calculator/services', '/dashboard', '/not-a-real-page']) {
      current = pathname;
      const response = await publicPage.goto(base + pathname, { waitUntil: 'load' });
      await publicPage.waitForTimeout(200);
      const expected = pathname === '/not-a-real-page' ? 404 : 200;
      if (response.status() !== expected) failures.push(`${pathname}: HTTP ${response.status()}`);
      if (pathname.startsWith('/calculator') || pathname === '/dashboard') {
        if (new URL(publicPage.url()).pathname !== '/') failures.push(`${pathname}: guest not redirected`);
      }
      checked++;
    }
    await publicPage.goto(base);
    const localLinks = await publicPage.locator('a[href]').evaluateAll(elements =>
      [...new Set(elements.map(element => element.getAttribute('href')).filter(href =>
        href?.startsWith('/') && !href.startsWith('//') && !href.startsWith('/logout')))]);
    for (const href of localLinks) {
      const result = await publicContext.request.get(base + href);
      if (result.status() >= 400) failures.push(`landing: broken link ${href} (${result.status()})`);
    }
    await publicContext.close();

    for (const role of ['admin', 'employee', 'client']) {
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      let label = `${role}/login`;
      track(page, () => label);
      await page.goto(base);
      const loggedIn = await page.evaluate(async role => {
        const token = (await (await fetch('/api/auth?action=csrf')).json()).data.csrf_token;
        return (await (await fetch('/api/auth?action=demo', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
          body: JSON.stringify({ role }),
        })).json()).success;
      }, role);
      if (!loggedIn) throw new Error(`Demo sign-in failed for ${role}`);
      await page.goto(base + '/dashboard');
      await page.waitForTimeout(300);
      if (role === 'admin') {
        const mailboxState = await page.evaluate(async () => {
          const result = await api('admin?action=mailbox_status');
          return result.success ? {
            sendConfigured: result.data.send_configured,
            receiveConfigured: result.data.receive_configured,
            separateAccounts: result.data.separate_accounts,
          } : { statusUnavailable: true };
        });
        console.log('Mailbox configuration flags:', JSON.stringify(mailboxState));
      }
      const panels = await page.locator('.sb-item[data-panel]').evaluateAll(elements =>
        [...new Set(elements.map(element => element.dataset.panel))]);
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 844 });
        for (const panel of panels) {
          label = `${role}/${panel}/${width}`;
          // Navigation is read-only. Opening a message thread would mark it read,
          // so we deliberately inspect inboxes without opening real messages.
          await page.evaluate(panel => nav(document.querySelector(`.sb-item[data-panel="${panel}"]`)), panel);
          await page.waitForTimeout(panel === 'mailbox' ? 1500 : 250);
          const state = await page.evaluate(panel => ({
            active: document.getElementById('panel-' + panel)?.classList.contains('active'),
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
          }), panel);
          if (!state.active) failures.push(`${label}: panel did not open`);
          if (state.overflow) failures.push(`${label}: horizontal page overflow`);
          checked++;
        }
      }
      for (const slug of slugs) {
        label = `${role}/calculator/${slug}`;
        const response = await page.goto(base + '/calculator/' + slug, { waitUntil: 'load' });
        await page.waitForTimeout(150);
        if (response.status() !== 200) failures.push(`${label}: HTTP ${response.status()}`);
        checked++;
      }
      if (role === 'admin') {
        await page.evaluate(() => {
          window.CalculatorStorage.setItem('proj_log', '{malformed');
          window.CalculatorStorage.setItem('share_history', '{malformed');
        });
        label = 'corrupt-local-history';
        await page.goto(base + '/calculator/packages', { waitUntil: 'load' });
        if (!await page.locator('#calculatorStorageWarning').count()) {
          failures.push('corrupt-local-history: missing recoverable warning');
        }
        const currencyReady = await page.evaluate(() => window.ToolCurrency?.current?.code);
        if (!currencyReady) failures.push('corrupt-local-history: calculators failed to initialize');
        checked++;
      }
      await page.goto(base + '/logout');
      if (new URL(page.url()).pathname !== '/') failures.push(`${role}: sign-out did not return to landing`);
      await context.close();
      console.log(`${role}: reviewed ${panels.length} panels at desktop and mobile widths, seven tool routes and sign-out`);
    }
  } finally {
    await browser.close();
  }
  console.log(`Reviewed ${checked} page/panel states.`);
  if (external.length) console.log('External service checks: ' + [...new Set(external)].join(', '));
  if (failures.length) {
    console.error('Issues:\n' + [...new Set(failures)].join('\n'));
    process.exitCode = 1;
  } else console.log('No page exceptions, missing assets, broken local links, or horizontal page overflow.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
