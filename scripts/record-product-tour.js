'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const baseUrl = process.env.SMOKE_URL || 'http://127.0.0.1:5000';
const outDir = path.join(process.cwd(), 'generated-artifacts', 'product-tour');
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  const frames = [];
  const captions = [
    'تسعيرة، طريقة أوضح لتنظيم أسعار أعمالك',
    'لوحة العميل: تسعيراتك وعروضك في مكان واحد',
    'لوحة الموظف: أنشئ العروض وتابع العملاء',
    'لوحة المدير: مؤشرات وإدارة النظام',
    'سبعة قطاعات، وأداة تناسب طبيعة نشاطك',
    'الخدمات والمشاريع والباقات',
    'المطاعم والتجزئة',
    'المشاريع التقنية والشركات التقنية',
    'التصميم الداخلي والمعماري',
    'احفظ النتائج وتابع عروض الأسعار',
  ];
  async function caption(text) {
    await page.evaluate(value => {
      let layer = document.getElementById('tourVideoCaption');
      if (!layer) {
        layer = document.createElement('div');
        layer.id = 'tourVideoCaption';
        layer.innerHTML = '<img src="/assets/logo.png" alt=""><span></span>';
        Object.assign(layer.style, {
          position: 'fixed', zIndex: '2147483647', left: '7%', right: '7%', bottom: '5%',
          minHeight: '90px', display: 'flex', alignItems: 'center', gap: '20px',
          padding: '16px 22px', color: '#fff', background: 'rgba(9,42,29,.93)',
          border: '1px solid rgba(206,176,81,.72)', borderRadius: '12px',
          boxShadow: '0 8px 25px rgba(0,0,0,.18)', direction: 'rtl',
          font: '700 28px/1.5 Arial,sans-serif',
        });
        Object.assign(layer.querySelector('img').style, {
          width: '76px', height: '58px', objectFit: 'contain', background: '#f8f5ed',
          borderRadius: '5px', padding: '3px',
        });
        document.body.appendChild(layer);
      }
      layer.querySelector('span').textContent = value;
    }, text);
    await page.waitForTimeout(900);
    const framePath = path.join(outDir, `frame-${String(frames.length + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: framePath, animations: 'disabled' });
    frames.push(framePath);
    await page.waitForTimeout(350);
  }
  async function demoLogin(role) {
    const result = await page.evaluate(async role => {
      const token = (await (await fetch('/api/auth?action=csrf')).json()).data.csrf_token;
      const response = await fetch('/api/auth?action=demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify({ role }),
      });
      return response.json();
    }, role);
    if (!result.success) throw new Error(`Demo login failed for ${role}`);
  }
  try {
    await page.goto(baseUrl, { waitUntil: 'load' });
    await caption(captions[0]);

    await demoLogin('client');
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'load' });
    await caption(captions[1]);

    await demoLogin('employee');
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'load' });
    await caption(captions[2]);

    await demoLogin('admin');
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'load' });
    await caption(captions[3]);
    await page.evaluate(() => navDirect('tools'));
    await caption(captions[4]);

    const tools = [
      ['services', captions[5]], ['packages', captions[5]], ['menu', captions[6]],
      ['retail', captions[6]], ['tech', captions[7]], ['saas', captions[7]], ['design', captions[8]],
    ];
    for (const [slug, text] of tools) {
      await page.goto(`${baseUrl}/calculator/${slug}`, { waitUntil: 'load' });
      await caption(text);
    }
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'load' });
    await page.evaluate(() => navDirect('quotes'));
    await caption(captions[9]);
    await page.evaluate(() => navDirect('project-log'));
    await caption(captions[9]);
  } finally {
    await context.close();
    await browser.close();
  }
  if (!frames.length) throw new Error('No product tour screenshots were produced');
  const concatList = frames.map(frame => `file '${frame}'\nduration 2.7`).join('\n') +
    `\nfile '${frames[frames.length - 1]}'\n`;
  fs.writeFileSync(path.join(outDir, 'frames.txt'), concatList);
  console.log(`Captured ${frames.length} real application screens in ${outDir}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
