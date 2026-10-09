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

function localizedNumber(value) {
  const normalized = String(value).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[٬,]/g, '').replace(/٫/g, '.');
  const firstNumber = normalized.match(/-?\d+(?:\.\d+)?/);
  return firstNumber ? Number(firstNumber[0]) : NaN;
}

async function assertNumber(page, selector, expected, message) {
  const text = await page.locator(selector).first().innerText();
  const actual = localizedNumber(text);
  assert.ok(Number.isFinite(actual), `${message}: invalid number "${text}"`);
  assert.equal(actual, expected, message);
}

async function main() {
  let browser, server, mathContext;
  try {
    await db.init();
    const password = await bcrypt.hash('CalculatorTest@123', 10);
    for (const [role, plan] of [['admin', 'pro'], ['employee', 'plus'], ['client', 'free']]) {
      await db.insertDoc('users', { name: 'مستخدم اختبار ' + role, email: role + '@calculator.test',
        password_hash: password, role, plan, is_active: 1, plan_expires_at: null });
    }
    await db.insertDoc('users', { name: 'مستخدم اختبار الحسابات المرجعية', email: 'math@calculator.test',
      password_hash: password, role: 'admin', plan: 'pro', is_active: 1, plan_expires_at: null });
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
    async function login(role, target = page) {
      await target.goto(base);
      const result = await target.evaluate(async role => {
        const token = (await (await fetch('/api/auth?action=csrf')).json()).data.csrf_token;
        return (await (await fetch('/api/auth', { method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
          body: JSON.stringify({ action: 'login', email: role + '@calculator.test', password: 'CalculatorTest@123' }),
        })).json()).success;
      }, role);
      assert.equal(result, true);
    }

    // Reference-value browser checks use their own account so they cannot alter
    // the save/restore lifecycle fixtures below.
    mathContext = await browser.newContext();
    const mathPage = await mathContext.newPage();
    const mathErrors = [];
    mathPage.on('pageerror', error => mathErrors.push(error.message));
    await login('math', mathPage);
    for (const slug of slugs) {
      await mathPage.goto(base + '/calculator/' + slug);
      try {
        await mathPage.waitForFunction(() => window.CalculatorCloud?.ready);
      } catch (error) {
        console.error(`${slug}: failed to initialize`, await mathPage.title(),
          (await mathPage.locator('body').innerText()).slice(0, 500), mathErrors);
        throw error;
      }
      const fill = async (id, value) => mathPage.locator('#' + id).fill(String(value));
      if (slug === 'services') {
        await mathPage.locator('[onclick*="classicSelectField(this,\'art\')"]').first().click();
        await mathPage.locator('[onclick*="selectSvc(this,\'art\',\'بورتريه شخصي\')"]').first().click();
        await mathPage.locator('[onclick*="selectLevel(this,30"]').first().click();
        await fill('art-tools', 100);
        await fill('art-units', 3);
        await fill('art-unit-price', 40);
        await fill('fix-rent', 120);
        await fill('fix-projects', 4);
        await assertNumber(mathPage, '#r-base', 250, 'services: itemized costs and fixed-cost share');
        await assertNumber(mathPage, '#r-price', 325, 'services: 30% markup and upward-to-5 rounding');
      } else if (slug === 'packages') {
        await fill('pkg-fix-1', 100);
        await fill('pkg-subs-1', 2);
        await fill('pkg-subs-2', 0);
        await fill('pkg-subs-3', 0);
        await fill('pkg-margin-1', 25);
        await fill('pkg-var-gateway-pct', 0);
        await assertNumber(mathPage, '.pkg-result-card .pkg-result-price', 65, 'packages: 25% markup and upward-to-5 rounding');
        await fill('pkg-var-gateway-pct', 100);
        assert.equal(await mathPage.locator('#pkg-gateway-validation').isVisible(), true,
          'packages: a 100% payment fee must be rejected');
        assert.equal(await mathPage.locator('.pkg-result-card .pkg-result-price').count(), 0,
          'packages: invalid fee must not leave a stale result');
        await fill('pkg-var-gateway-pct', 0);
        await assertNumber(mathPage, '.pkg-result-card .pkg-result-price', 65, 'packages: valid result returns after correction');
      } else if (slug === 'menu') {
        await mathPage.locator('[onclick="addMenuRow()"]').first().click();
        const rowId = await mathPage.locator('#menu-rows tr[id^="menu-row-"]').last().getAttribute('id');
        const row = Number(rowId.replace('menu-row-', ''));
        await mathPage.locator(`#mcat-${row}`).selectOption({ label: 'قهوة ساخنة' });
        await fill('menu-fixed', 1200);
        await fill('menu-days', 20);
        await fill('menu-orders', 10);
        await fill(`mcost-${row}`, 10);
        await fill(`mwaste-${row}`, 10);
        const detail = await mathPage.locator(`#menu-row-${row}`).getAttribute('data-detail');
        const values = JSON.parse(detail);
        assert.equal(values.totalCost, 17, 'menu: 10% waste plus 6 fixed cost per order');
        assert.equal(values.marginPct, 30, 'menu: standard hot coffee margin');
        assert.equal(values.suggested, 22.5, 'menu: upward rounding to half a currency unit');
      } else if (slug === 'retail') {
        const electronicsValue = await mathPage.locator('#ret-sector option').evaluateAll(options =>
          options.find(option => option.textContent.includes('إلكترونيات'))?.value);
        assert.ok(electronicsValue, 'retail: electronics reference sector exists');
        await mathPage.locator('#ret-sector').selectOption(electronicsValue);
        await mathPage.locator('[onclick="addRetailRow()"]').first().click();
        const rowId = await mathPage.locator('#ret-rows tr[id^="ret-row-"]').last().getAttribute('id');
        const row = Number(rowId.replace('ret-row-', ''));
        await fill('ret-purchases', 1000);
        await fill('ret-waste', 0);
        await fill('ret-transport', 0);
        await fill('ret-storage', 0);
        await fill(`rcost-${row}`, 100);
        const values = JSON.parse(await mathPage.locator(`#ret-row-${row}`).getAttribute('data-detail'));
        assert.equal(values.realCost, 100, 'retail: no hidden cost add-ons in this reference case');
        assert.equal(values.marginPct, 18, 'retail: mid-market electronics margin');
        assert.equal(values.suggested, 118, 'retail: 18% markup and half-unit rounding');
      } else if (slug === 'tech') {
        await mathPage.locator('#tech-type-web').click();
        await mathPage.locator('#tech-lvl-2').click();
        await fill('tech-design-h', 2);
        await fill('tech-design-rate', 100);
        await fill('tech-licenses', 30);
        await fill('tech-fix-rent', 120);
        await fill('tech-fix-projects', 3);
        await fill('tech-reserve-pct', 10);
        await assertNumber(mathPage, '#tech-r-base', 297, 'tech: effort, licenses, allocated fixed cost, and reserve');
        await assertNumber(mathPage, '#tech-r-price', 500, 'tech: 35% markup and upward-to-100 rounding');
      } else if (slug === 'saas') {
        await mathPage.locator('#saas-type-saas').click();
        await mathPage.locator('#saas-lvl-2').click();
        await fill('saas-rent', 1200);
        await fill('saas-clients', 10);
        await fill('saas-var-support', 5);
        await fill('saas-reserve-pct', 0);
        await fill('saas-var-gateway-pct', 5);
        await assertNumber(mathPage, '#saas-r-price', 185, 'SaaS: gateway gross-up and upward-to-5 rounding');
        assert.match(await mathPage.locator('#saas-r-pill').innerText(), /41٪/,
          'SaaS: realized markup must subtract payment-gateway fees');
        await mathPage.locator('#saas-cycle').selectOption('3');
        await fill('saas-cycle-disc', 10);
        assert.equal(localizedNumber(await mathPage.locator('#saas-r-annual').innerText()), 500,
          'SaaS: discounted 3-month price rounds up to 500');
        await fill('saas-var-gateway-pct', 100);
        assert.equal(await mathPage.locator('#saas-gateway-validation').isVisible(), true,
          'SaaS: a 100% payment fee must be rejected');
        assert.equal(await mathPage.locator('#saas-result').isVisible(), false,
          'SaaS: invalid fee must not display a stale result');
        await fill('saas-var-gateway-pct', 0);
        await mathPage.locator('#saas-type-support').click();
        await mathPage.locator('#saas-supmode-hourly').click();
        await fill('saas-support-hours', 25);
        await fill('saas-var-gateway-pct', 5);
        await assertNumber(mathPage, '#saas-r-price', 74, 'SaaS hourly support: fees and half-unit rounding');
        assert.match(await mathPage.locator('#saas-r-pill').innerText(), /41٪/,
          'SaaS hourly support: realized markup subtracts gateway fees');
      } else if (slug === 'design') {
        await mathPage.locator('#ds-type-villa').click();
        await mathPage.locator('#ds-scope-design').click();
        await mathPage.locator('#ds-method-sqm').click();
        await mathPage.locator('#ds-lvl-1').click();
        await fill('ds-area', 25);
        await fill('ds-sqm-rate', 100);
        await fill('ds-print', 50);
        await fill('ds-fix-rent', 120);
        await fill('ds-fix-projects', 4);
        await fill('ds-reserve-pct', 10);
        await fill('ds-p1-pct', 33.3);
        await fill('ds-p2-pct', 33.3);
        await fill('ds-p3-pct', 33.4);
        await assertNumber(mathPage, '#ds-r-price', 3500, 'design: cost, reserve, 20% markup, and upward-to-100 rounding');
        const phaseAmounts = await mathPage.locator('#ds-payments-table > div').evaluateAll(cards =>
          cards.map(card => {
            const amount = card.lastElementChild.textContent.replace(/[٠-٩]/g, digit =>
              String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[٬,]/g, '').replace(/[^\d.-]/g, '');
            return Number(amount);
          }));
        assert.deepEqual(phaseAmounts, [1166, 1165, 1169], 'design: stable largest-remainder allocation');
        assert.equal(phaseAmounts.reduce((sum, amount) => sum + amount, 0), 3500,
          'design: 100% payment schedule must equal the project total exactly');
      }
      console.log(`${slug}: independent browser reference calculation passed`);
    }
    assert.equal(mathErrors.length, 0, mathErrors.join('\n'));
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
        assert.match(await page.locator('#print-report').innerText(), /أساس الحساب/);
        assert.match(await page.locator('#print-report').innerText(), /العملة المسجلة/);
        assert.match(await page.locator('#print-report').innerText(), /لا يشمل ضريبة القيمة المضافة/);
      assert.doesNotMatch(await page.locator('#print-report').innerText(), /NaN|undefined/);
        assert.equal(await page.locator('#print-report thead th').count() > 0, true, `${slug}: repeatable report table heading`);
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
    await page.locator('#projectLedgerSearch').fill('الخدمات');
    await page.waitForFunction(() => document.querySelectorAll('[data-restore-id]').length === 1);
    const ledgerStatus = await page.locator('#projectLedgerStatus').innerText();
    assert.match(ledgerStatus.replace(/[٠-٩]/g, digit =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))), /1 من 7/);
    await page.locator('#projectLedgerSearch').fill('لا توجد كلمة كهذه');
    await page.waitForFunction(() => document.querySelectorAll('[data-restore-id]').length === 0);
    assert.match(await page.locator('#projectLedgerEmpty h3').innerText(), /لا توجد نتائج مطابقة/);
    await page.locator('#projectLedgerSearch').fill('');
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
    if (mathContext) await mathContext.close();
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    await db.close();
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
