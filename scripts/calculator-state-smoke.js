'use strict';

// Destructive lifecycle tests run against a temporary test DB, never Atlas.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'tas3-calculator-ui-'));
process.env.APP_ENV = 'test';
process.env.DB_TEST_SQLITE = '1';
process.env.DB_PATH = path.join(temporary, 'test.sqlite');
process.env.MONGODB_URI = '';
const { chromium } = require('playwright-core');
const bcrypt = require('bcryptjs');
const db = require('../server/db');
const { app } = require('../server');
const slugs = ['services', 'packages', 'menu', 'retail', 'tech', 'saas', 'design'];

async function main() {
  let browser, server;
  try {
    await db.init();
    const password = await bcrypt.hash('CalculatorTest@123', 10);
    for (const [role, plan] of [['admin', 'pro'], ['employee', 'plus'], ['client', 'free']]) {
      await db.insertDoc('users', { name: 'مستخدم اختبار ' + role, email: role + '@calculator.test',
        password_hash: password, role, plan, is_active: 1, plan_expires_at: null });
    }
    server = await new Promise(resolve => {
      const running = app.listen(0, '127.0.0.1', () => resolve(running));
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
      headless: true, args: ['--no-sandbox'],
    });
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.__testPrintCalls = 0;
      window.print = () => { window.__testPrintCalls++; };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function login(role) {
      await page.goto(base);
      const result = await page.evaluate(async role => {
        const token = (await (await fetch('/api/auth?action=csrf')).json()).data.csrf_token;
        return (await (await fetch('/api/auth', { method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
          body: JSON.stringify({ action: 'login', email: role + '@calculator.test', password: 'CalculatorTest@123' }),
        })).json()).success;
      }, role);
      assert.equal(result, true);
    }
    await login('admin');
    for (const slug of slugs) {
      await page.goto(base + '/calculator/' + slug);
      await page.waitForFunction(() => window.CalculatorCloud?.ready);
      if (slug === 'services') {
        await page.locator('[onclick*="classicSelectField(this,\'art\')"]').first().click();
        await page.locator('[onclick*="selectSvc(this,\'art\',\'بورتريه شخصي\')"]').first().click();
        await page.locator('[onclick*="selectLevel(this,30"]').first().click();
      }
      if (slug === 'tech') {
        await page.locator('#tech-type-web').click();
        await page.locator('#tech-lvl-2').click();
        await page.locator('#tech-design-rate').fill('100');
      }
      if (slug === 'saas') {
        await page.locator('#saas-type-saas').click();
        await page.locator('#saas-lvl-2').click();
        await page.locator('#saas-clients').fill('10');
      }
      if (slug === 'design') {
        await page.locator('#ds-type-villa').click();
        await page.locator('#ds-scope-design').click();
        await page.locator('#ds-method-sqm').click();
        await page.locator('#ds-lvl-2').click();
        await page.locator('#ds-sqm-rate').fill('100');
      }
      if (slug === 'retail') await page.locator('[onclick="addRetailRow()"]').first().click();
      if (slug === 'menu') await page.locator('[onclick="addMenuRow()"]').first().click();
      if (slug === 'packages') await page.locator('[onclick="addPkgTier()"]').first().click();
      const number = page.locator('#integrated-tools input[type="number"]:visible').first();
      const id = await number.getAttribute('id');
      await number.fill('123');
      await number.dispatchEvent('input');
      await number.dispatchEvent('change');
      await page.locator('#global-currency').selectOption({ value: 'دولار أمريكي|USD|en-US' });
      await page.evaluate(async () => { window.CalculatorReadResults(); await window.CalculatorCloud.flush(); });
      const before = await page.evaluate(() => window.CalculatorCloud.snapshot());
      await page.reload();
      await page.waitForFunction(() => window.CalculatorCloud?.ready);
      assert.equal(await page.locator('#' + id).inputValue(), '123', `${slug}: numeric field reload`);
      const after = await page.evaluate(() => window.CalculatorCloud.snapshot());
      assert.deepEqual(after.actions, before.actions, `${slug}: choice and row actions reload`);
      assert.equal(after.fields.length, before.fields.length, `${slug}: dynamic field count reload`);
      assert.equal(after.currency_code, 'USD', `${slug}: currency reload`);
      let rowIndex;
      if (['menu', 'retail'].includes(slug)) {
        const prefix = slug === 'menu' ? 'menu' : 'ret';
        await page.locator(`#${prefix}-row-1 input[type="number"]`).first().fill('0');
        rowIndex = await page.evaluate(() => window.CalculatorReadResults()[0].row_index);
      }
      const saveSelector = slug === 'services' ? '[onclick="saveProject()"]'
        : slug === 'retail' ? `[onclick="saveRetailRowToLog(${rowIndex})"]`
        : slug === 'menu' ? `[onclick="saveMenuRowToLog(${rowIndex})"]`
        : '[onclick^="saveGenericProject("]';
      await page.locator('#integrated-tools .tool-screen ' + saveSelector).first().click();
      await page.waitForFunction(() => !document.getElementById('cloudSave').disabled);
      assert.match(await page.locator('#cloudStateStatus').innerText(), /تم حفظ نتيجة جديدة/, `${slug}: cloud save`);
      await page.locator('#integrated-tools .tool-screen .share-cta').first().click();
      await page.waitForSelector('#calculator-share-dialog[open]');
      await page.locator('#share-type-merchant').click();
      await page.locator('#share-sector').selectOption({ index: 1 });
      await page.locator('#share-city').selectOption({ label: 'الرياض' });
      await page.locator('#share-product').fill('مشاركة اختبار ' + slug);
      await page.locator('#share-price').fill('123');
      await page.locator('#share-submit-btn').click();
      await page.waitForFunction(() => document.getElementById('calculator-share-status').textContent.includes('تم حفظ المشاركة'));
      assert.match(await page.locator('#share-history').innerText(), new RegExp('مشاركة اختبار ' + slug));
      assert.equal(await page.locator('#share-points-display').innerText(), String(slugs.indexOf(slug) + 1));
      if (slug === 'services') {
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => {
          const dialog = document.getElementById('calculator-share-dialog');
          return dialog.scrollWidth <= dialog.clientWidth + 1;
        }), true);
        await page.screenshot({ path: '/tmp/calculator-sharing-fixed.png' });
        await page.setViewportSize({ width: 1280, height: 720 });
      }
      await page.locator('#calculator-share-dialog [onclick="closeCalculatorShare()"]').click();
      const printSelector = slug === 'services' ? '[onclick="printServiceReport()"]'
        : slug === 'packages' ? '[onclick="printPkgReport()"]'
        : slug === 'menu' ? `[onclick="printMenuReport(${rowIndex})"]`
        : slug === 'retail' ? `[onclick="printRetailReport(${rowIndex})"]` : '[onclick^="printGenericReport("]';
      await page.locator('#integrated-tools .tool-screen ' + printSelector).first().click();
      await page.waitForSelector('#print-report.show');
      assert.match(await page.locator('#print-report').innerText(), /السعر النهائي المقترح/);
      assert.doesNotMatch(await page.locator('#print-report').innerText(), /NaN|undefined/);
      await page.locator('#calculatorReportPrint').click();
      await page.waitForFunction(() => window.__testPrintCalls === 1);
      await page.emulateMedia({ media: 'print' });
      assert.equal(await page.locator('#calculatorReportPrint').isVisible(), false);
      const pdf = await page.pdf({ format: 'A4' });
      assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
      assert.ok(pdf.length > 1000);
      await page.emulateMedia({ media: 'screen' });
      if (slug === 'services') {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ path: '/tmp/calculator-report-fixed.png' });
        await page.setViewportSize({ width: 1280, height: 720 });
      }
      await page.locator('#calculatorReportClose').click();
      console.log(`${slug}: native save, sharing, report preview/print/PDF and state reload passed`);
    }
    await page.goto(base + '/dashboard?panel=project-log');
    await page.waitForSelector('[data-restore-id]');
    assert.equal(await page.locator('[data-restore-id]').count(), 7);
    await page.locator('#panel-project-log select').selectOption('menu');
    await page.waitForFunction(() => document.querySelectorAll('[data-restore-id]').length === 1);
    await page.locator('#panel-project-log select').selectOption('');
    await page.waitForFunction(() => document.querySelectorAll('[data-restore-id]').length === 7);
    // Restore a saved result after changing its latest working state.
    await page.goto(base + '/calculator/services');
    await page.waitForFunction(() => window.CalculatorCloud?.ready);
    const servicesField = page.locator('#integrated-tools input[type="number"]:visible').first();
    const servicesId = await servicesField.getAttribute('id');
    await servicesField.fill('456');
    await page.evaluate(() => window.CalculatorCloud.flush());
    await page.goto(base + '/dashboard?panel=project-log');
    await page.waitForSelector('[data-restore-id]');
    await page.locator('[data-restore-id]').last().click();
    await page.waitForURL('**/calculator/services');
    await page.waitForFunction(() => window.CalculatorCloud?.ready);
    assert.equal(await page.locator('#' + servicesId).inputValue(), '123');
    await page.goto(base + '/dashboard?panel=project-log');
    await page.waitForSelector('[data-delete-id]');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('[data-delete-id]').first().click();
    await page.waitForFunction(() => document.querySelectorAll('[data-restore-id]').length === 6);
    await page.goto(base + '/calculator/services');
    await page.waitForFunction(() => window.CalculatorCloud?.ready);
    await page.locator('#cloudResultTitle').fill('حفظ مسمى من الشريط');
    await page.locator('#cloudSave').click();
    await page.waitForFunction(() => !document.getElementById('cloudSave').disabled);
    assert.match(await page.locator('#cloudStateStatus').innerText(), /تم حفظ نتيجة جديدة/);
    await page.reload();
    await page.waitForFunction(() => window.CalculatorCloud?.ready);
    await page.locator('#integrated-tools .share-cta').first().click();
    await page.waitForFunction(() => document.getElementById('share-points-display').textContent === '7');
    assert.match(await page.locator('#share-history').innerText(), /مشاركة اختبار design/);
    await page.locator('#calculator-share-dialog [onclick="closeCalculatorShare()"]').click();
    await page.goto(base + '/logout');
    await login('client'); // Same browser, different account.
    await page.goto(base + '/dashboard?panel=project-log');
    await page.waitForFunction(() => document.getElementById('projectLedgerStatus')?.textContent.includes('لا توجد'));
    assert.equal(await page.locator('[data-restore-id]').count(), 0);
    await page.goto(base + '/calculator/services');
    await page.waitForFunction(() => window.CalculatorCloud?.ready);
    assert.notEqual(await page.locator('#' + servicesId).inputValue(), '123');
    await page.locator('#integrated-tools .share-cta').first().evaluate(element => element.click());
    await page.waitForFunction(() => document.getElementById('share-history').textContent.includes('لا توجد'));
    assert.equal(await page.locator('#share-points-display').innerText(), '0');
    await page.locator('#calculator-share-dialog [onclick="closeCalculatorShare()"]').click();
    for (let index = 0; index < 3; index++) await page.evaluate(() => window.print());
    assert.equal(await page.evaluate(() => window.__testPrintCalls), 3);
    page.once('dialog', dialog => dialog.accept());
    await page.evaluate(() => window.print());
    assert.equal(await page.evaluate(() => window.__testPrintCalls), 3, 'PDF limit must block native print');
    assert.match(await page.locator('#cloudStateStatus').innerText(), /حد تقارير PDF/);
    await page.goto(base + '/logout');
    await login('employee');
    await page.goto(base + '/dashboard?panel=tools');
    await page.waitForSelector('#calculatorToolChoices input');
    const checks = page.locator('#calculatorToolChoices input[type="checkbox"]');
    for (const checkbox of await checks.all()) await checkbox.uncheck();
    await page.locator('#calculatorToolChoices input[value="tech"]').check();
    await page.locator('#calculatorToolChoices input[value="design"]').check();
    await page.locator('#calculatorSelectionSave').click();
    await page.waitForLoadState('load');
    await page.goto(base + '/calculator/tech');
    assert.equal(new URL(page.url()).pathname, '/calculator/tech');
    await page.goto(base + '/calculator/menu');
    assert.equal(new URL(page.url()).pathname, '/dashboard');
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('Dashboard restore/delete, same-browser account isolation and paid-tool selection passed.');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    await db.close();
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
