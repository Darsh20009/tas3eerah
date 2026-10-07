'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { CURRENCIES } = require('./currencies');

const SOURCE_PATH = path.resolve(__dirname, '..', 'attached_assets', 'index_1791309163811.html');
const TOOL_ALIASES = {
  calc_basic: 'services',
  calc_pkg: 'packages',
  calc_menu: 'menu',
  calc_store: 'retail',
  calc_labor: 'tech',
  calc_custom: 'saas',
  calc_office: 'design',
};
const TOOL_SLUGS = new Set(['services', 'packages', 'menu', 'retail', 'tech', 'saas', 'design', ...Object.keys(TOOL_ALIASES)]);
const COMPONENT_OVERRIDES = `
#integrated-tools {
  --bg:#F8F5ED; --surface:#EDE9DF; --card:#FFFFFF; --border:#D5CEC0;
  --gold:#C9A741; --gold-light:#A8882C; --gold-dim:#FAF3DE;
  --text:#1A2B20; --muted:#6B7C73; --soft:#2D4036;
  --green:#2E8B57; --blue:#2471A3; --red:#C0392B; --purple:#A8882C;
  font-family:'BritishCouncil','Hurme','Arial',sans-serif;
  color:var(--text);
  background:var(--bg);
  border-radius:var(--r-lg);
  overflow:hidden;
}
#integrated-tools .tool-screen,
#integrated-tools .page,
#integrated-tools .wrap,
#integrated-tools #page-log {
  background:var(--bg)!important;
  color:var(--text)!important;
}
#integrated-tools .log-topbar h2,
#integrated-tools .log-empty,
#integrated-tools .log-empty span { color:var(--text)!important; }
#integrated-tools .log-empty { color:var(--muted)!important; }
#integrated-tools .ls-cell { background:rgba(26,43,32,.06)!important; }
#integrated-tools .back-bar { display:none!important; }
 #integrated-tools #services-tabs { display:none!important; }
#integrated-tools #services-tabs #log-tab,
#integrated-tools #page-log,
#integrated-tools [id$="-log-panel"],
#integrated-tools button[onclick^="toggleGenericLog"] { display:none!important; }
#integrated-tools #platform-home {
  min-height:0!important;
  padding:0 0 24px!important;
  background:var(--bg)!important;
}
#integrated-tools .platform-header,
#integrated-tools .site-footer,
#integrated-tools #about-modal,
#integrated-tools #contact-modal,
#integrated-tools .feedback-fab { display:none!important; }
#integrated-tools .tools-section { max-width:none!important; padding:20px 0!important; }
#integrated-tools .tools-title { color:var(--text)!important; font-family:inherit!important; }
#integrated-tools .tool-card,
#integrated-tools .tool-card.gold,
#integrated-tools .tool-card.blue,
#integrated-tools .tool-card.green {
  background:var(--card)!important;
  border-color:var(--line)!important;
  box-shadow:none!important;
}
#integrated-tools .tool-card:hover,
#integrated-tools .tool-card.gold:hover,
#integrated-tools .tool-card.blue:hover,
#integrated-tools .tool-card.green:hover {
  border-color:var(--green)!important;
  box-shadow:var(--sh)!important;
  transform:translateY(-1px)!important;
}
#integrated-tools .tool-name,
#integrated-tools .tool-card.gold .tool-name,
#integrated-tools .tool-card.blue .tool-name,
#integrated-tools .tool-card.green .tool-name { color:var(--text)!important; }
#integrated-tools .tool-desc { color:var(--muted)!important; }
#integrated-tools .tool-tag {
  background:var(--surface)!important;
  color:var(--muted)!important;
  border-color:var(--line)!important;
}
#integrated-tools .tool-icon { background:var(--p-l)!important; }
#integrated-tools .tool-arrow { color:var(--green)!important; }
#integrated-tools .back-bar { background:var(--card)!important; border-color:var(--line)!important; }
#integrated-tools .back-btn { color:var(--green)!important; }
#integrated-tools .tab.active { color:var(--green)!important; border-bottom-color:var(--gold)!important; }
#integrated-tools .card,
#integrated-tools .log-item { background:var(--card)!important; border-color:var(--line)!important; }
#integrated-tools .f input,
#integrated-tools .f select,
#integrated-tools .pricing-method-wrap select {
  background:var(--surface)!important;
  border-color:var(--line)!important;
  color:var(--text)!important;
}
#integrated-tools .f input:focus,
#integrated-tools .f select:focus,
#integrated-tools .pricing-method-wrap select:focus { border-color:var(--green)!important; }
#integrated-tools .save-btn { background:var(--green)!important; color:#fff!important; }
#integrated-tools .print-btn {
  background:rgba(46,139,87,.08)!important;
  color:var(--green)!important;
  border-color:rgba(46,139,87,.25)!important;
}
#integrated-tools .tools-section > .tool-card .tool-icon {
  font-size:0!important;
  font-weight:800!important;
  letter-spacing:.02em;
}
#integrated-tools .tools-section > .tool-card .tool-icon::before { font-size:14px; content:''; }
#integrated-tools .tools-section > .tool-card:nth-of-type(1) .tool-icon::before { content:'01'; }
#integrated-tools .tools-section > .tool-card:nth-of-type(2) .tool-icon::before { content:'02'; }
#integrated-tools .tools-section > .tool-card:nth-of-type(3) .tool-icon::before { content:'03'; }
#integrated-tools .tools-section > .tool-card:nth-of-type(4) .tool-icon::before { content:'04'; }
#integrated-tools .tools-section > .tool-card:nth-of-type(5) .tool-icon::before { content:'05'; }
#integrated-tools .tools-section > .tool-card:nth-of-type(6) .tool-icon::before { content:'06'; }
#integrated-tools .tools-section > .tool-card:nth-of-type(7) .tool-icon::before { content:'07'; }
`;

let sourceCache;
let sourceMtime = 0;

function currencyOptions() {
  return CURRENCIES.map((currency) =>
    `<option value="${currency.label}|${currency.code}|${currency.locale}">${currency.country} — ${currency.label} (${currency.code})</option>`
  ).join('');
}

function currencyControl() {
  return `<div class="tool-currency-control" style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:16px">
    <label for="global-currency">العملة</label>
    <select id="global-currency" onchange="setGlobalCurrency()" style="max-width:100%;padding:8px;background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:8px">${currencyOptions()}</select>
    <small>تغيير وحدة العملة لا يحوّل المبالغ بسعر صرف.</small>
  </div>`;
}

function readSource() {
  const stat = fs.statSync(SOURCE_PATH);
  if (!sourceCache || stat.mtimeMs !== sourceMtime) {
    sourceCache = fs.readFileSync(SOURCE_PATH, 'utf8')
      .replace(/onclick="toggleGenericLog\('[^']+'\)"/g, 'onclick="window.CalculatorCloud.openHistory()"')
      .replace(/onclick="switchTab\('log'\)"/g, 'onclick="window.CalculatorCloud.openHistory()"')
      .replace(/\blocalStorage\./g, 'window.CalculatorStorage.')
      .replace(/<script>\s*(?=let S =)/,
        '<script src="/assets/js/calculator-storage.js?v=20261007"></script><script>\n')
      .replace(/JSON\.parse\(window\.CalculatorStorage\.getItem\('(proj_log|share_history)'\)\|\|'\[\]'\)/g,
        "readCalculatorHistory('$1')")
      .replace(/currency:\s*'ريال'/g, 'currency: GLOBAL_CURR.label, currency_code: GLOBAL_CURR.code')
      .replace(/currency:\s*(CURR|MENU_CURR|PKG_CURR)\.label/g, 'currency: $1.label, currency_code: $1.code')
      .replace(/(<div class="platform-header">\s*)<svg\b[\s\S]*?<\/svg>/i,
        '$1<img src="/assets/logo.png?v=20261006" alt="تسعيرة" style="display:block;width:180px;height:auto;margin:0 auto">')
      .replace(/(<select id="global-currency"[^>]*>)[\s\S]*?<\/select>/i,
        `$1${currencyOptions()}</select>`)
      .replace('</body>', `<script>window.TAS3EERAH_CURRENCIES=${JSON.stringify(CURRENCIES)};</script><script src="/assets/js/tool-currencies.js?v=20261006"></script></body>`);
    sourceMtime = stat.mtimeMs;
  }
  return sourceCache;
}

function extractTag(source, tagName) {
  const expression = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}\\s*>`, 'i');
  return source.match(expression)?.[1] ?? '';
}

function extractBody(source) {
  return extractTag(source, 'body') || source;
}

function findElementById(markup, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const openTagExpression = new RegExp(`<([a-z][\\w:-]*)\\b(?=[^>]*\\bid\\s*=\\s*(["'])${escapedId}\\2)[^>]*>`, 'i');
  const match = openTagExpression.exec(markup);
  if (!match) return '';

  const tagName = match[1].toLowerCase();
  const start = match.index;
  const openTagEnd = start + match[0].length;
  const tokenExpression = new RegExp(`<\\/?${tagName}\\b[^>]*>|<!--(?:[\\s\\S]*?)-->|<script\\b[^>]*>[\\s\\S]*?<\\/script\\s*>|<style\\b[^>]*>[\\s\\S]*?<\\/style\\s*>`, 'gi');
  tokenExpression.lastIndex = start;

  let depth = 0;
  let token;
  while ((token = tokenExpression.exec(markup))) {
    const text = token[0];
    if (/^<!--|^<script\b|^<style\b/i.test(text)) continue;
    if (/^<\//.test(text)) {
      depth -= 1;
      if (depth === 0) return markup.slice(start, tokenExpression.lastIndex);
    } else if (!/\/>$/.test(text)) {
      depth += 1;
    }
  }
  return markup.slice(start, openTagEnd);
}

function renameLegacyGlobals(markup) {
  return markup
    // The uploaded document initializes every tool together. Per-tool pages
    // must skip setup for panels that are not mounted, without aborting globals.
    .replace('function updateBadge(){', "function updateBadge(){ if(!document.getElementById('log-count')) return;")
    .replace('function renderLog(){', "function renderLog(){ if(!document.getElementById('log-list')) return;")
    .replace('function initPkgTiers(){', "function initPkgTiers(){ if(!document.getElementById('tool-packages')) return;")
    .replace("function addRetailRow(name='', unit='قطعة', cost=0){", "function addRetailRow(name='', unit='قطعة', cost=0){ if(!document.getElementById('tool-retail')) return;")
    .replace('function addMenuRowBase(cat=\'\', name=\'\', cost=0, waste=\'\', margin=30, current=0){', "function addMenuRowBase(cat='', name='', cost=0, waste='', margin=30, current=0){ if(!document.getElementById('tool-menu')) return;")
    .replace('function loadMenuState(){', "function loadMenuState(){ if(!document.getElementById('tool-menu')) return false;")
    .replace("function addMenuRow(cat='', name='', cost=0, waste=10, margin=null, current=0){", "function addMenuRow(cat='', name='', cost=0, waste=10, margin=null, current=0){ if(!document.getElementById('tool-menu')) return;")
    .replace('function loadRetailState(){', "function loadRetailState(){ if(!document.getElementById('tool-retail')) return false;")
    .replace(/\bopenTool\s*\(/g, 'classicOpenTool(')
    .replace(/\bselectField\s*\(/g, 'classicSelectField(')
    .replace(/\bcalcPkg\s*\(/g, 'classicCalcPkg(')
    .replace(/\bfmt\s*\(/g, 'classicFmt(')
    .replace(/\b(const|let|var)\s+fmt(?=\s*=)/g, '$1 classicFmt')
    .replace(/function loadRetailState\(\)\s*\{/, 'function loadRetailState(){ return false;')
    .replace(/function loadMenuState\(\)\s*\{/, 'function loadMenuState(){ return false;');
}

function removeDecorativeEmoji(markup) {
  return markup.replace(
    /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0E}\u{FE0F}\u{200D}]/gu,
    ''
  );
}

function extractScripts(body) {
  return [...body.matchAll(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi)]
    .map((match) => match[0])
    .join('\n');
}

function scopeLegacyCss(css) {
  return css
    .replace(/:root\s*\{/g, '#integrated-tools{')
    .replace(/(?<![A-Za-z0-9_-])body\s*\{/g, '#integrated-tools{')
    .replace(/(?<![A-Za-z0-9_-])body\s+/g, '#integrated-tools ');
}

function renderClassicTools(toolSlug = null) {
  const source = readSource();
  const sourceBody = removeDecorativeEmoji(renameLegacyGlobals(extractBody(source)))
    .replaceAll('<span class="ftick"></span>', '<span class="ftick">✓</span>')
    .replaceAll('<span class="stk"></span>', '<span class="stk">✓</span>');
  const scripts = extractScripts(sourceBody);
  const sourceCss = extractTag(source, 'style');
  const css = scopeLegacyCss(sourceCss);

  let content = sourceBody;
  if (toolSlug !== null && toolSlug !== undefined && toolSlug !== '') {
    const requestedSlug = String(toolSlug);
    const slug = TOOL_ALIASES[requestedSlug] || requestedSlug;
    if (!TOOL_SLUGS.has(slug)) {
      throw new RangeError(`Unknown pricing tool: ${slug}`);
    }
    const selected = findElementById(sourceBody, `tool-${slug}`);
    if (!selected) {
      throw new Error(`Pricing tool markup is missing: ${slug}`);
    }
    const activeSelected = selected.replace(
      /class=(["'])([^"']*\btool-screen\b[^"']*)\1/i,
      (_match, quote, className) => `class=${quote}${className} active${quote}`
    );
    const share = findElementById(sourceBody, 'tool-share')
      .replace('class="tool-screen"', 'class="calculator-share-panel"')
      .replace(/<div class="back-bar">[\s\S]*?<\/div>/, '')
      .replace('بياناتك <b>مجهولة الهوية تماماً</b> — لا اسم ولا معلومات شخصية. فقط السعر والقطاع والمدينة لبناء بيانات السوق.',
        'مشاركات الأسعار تُحفظ ضمن حسابك، ولا تُعرض معلومات حسابك في هذه المشاركة.')
      .replace(/background:linear-gradient\([^)]*\)/g, 'background:var(--card)');
    content = `${currencyControl()}\n${activeSelected}
      <dialog id="calculator-share-dialog" aria-label="مشاركة السعر">
        <header class="calculator-share-header"><strong>مشاركة السعر</strong>
          <button class="btn btn-ghost btn-sm" type="button" onclick="closeCalculatorShare()">إغلاق</button>
        </header>${share}
      </dialog>\n${scripts}`;
  }

  return `<style id="integrated-tools-source-style">\n@scope (#integrated-tools) {\n${css}\n}\n${COMPONENT_OVERRIDES}\n</style>\n<div id="integrated-tools" class="integrated-tools">${content}</div>`;
}

module.exports = {
  readSource,
  TOOL_SLUGS,
  renderClassicTools,
};