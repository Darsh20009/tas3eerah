'use strict';

(function () {
  const catalog = window.TAS3EERAH_CURRENCIES || [];
  const select = document.getElementById('global-currency');
  if (!select || !catalog.length) return;
  const root = document.getElementById('integrated-tools') || document.body;
  let current = catalog.find((currency) => currency.code === 'SAR');
  let observer;
  const units = [...catalog.map(currency => currency.label), 'ريال', 'ر.س', 'SAR']
    .sort((a, b) => b.length - a.length)
    .map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const unitPattern = `(?<![\\u0600-\\u06ffA-Za-z])(?:${units.join('|')})(?![\\u0600-\\u06ffA-Za-z])`;

  function money(amount) {
    return `${Math.round(Number(amount) || 0).toLocaleString(current.locale)} ${current.label}`;
  }

  // These formatters in the supplied file use hard-coded Saudi currency units.
  for (const name of ['tfmt', 'sfmt', 'dfmt']) {
    if (typeof window[name] === 'function') window[name] = money;
  }

  function updateLabels() {
    if (observer) observer.disconnect();
    root.querySelectorAll('[data-tool-currency]').forEach((element) => {
      element.textContent = current.label;
    });
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement || node.parentElement.closest(
        'script,style,select,textarea,input,[data-tool-currency],.user-content,.log-item,.log-summary,.li-cell'
      )) continue;
      if (new RegExp(unitPattern, 'u').test(node.nodeValue)) nodes.push(node);
    }
    for (const text of nodes) {
      const parts = text.nodeValue.split(new RegExp(`(${unitPattern})`, 'u'));
      const fragment = document.createDocumentFragment();
      parts.forEach((part, index) => {
        if (index % 2) {
          const span = document.createElement('span');
          span.dataset.toolCurrency = '';
          span.textContent = current.label;
          fragment.append(span);
        } else fragment.append(document.createTextNode(part));
      });
      text.replaceWith(fragment);
    }
    if (observer) observer.observe(root, { childList: true, subtree: true, characterData: true });
  }

  function recalculate() {
    const slug = window.CALCULATOR_CONTEXT?.slug ||
      root.querySelector('.tool-screen.active')?.id.replace('tool-', '');
    const calculators = {
      services: 'calc', packages: typeof window.classicCalcPkg === 'function' ? 'classicCalcPkg' : 'calcPkg',
      menu: 'calcMenuAll', retail: 'calcRetail', tech: 'calcTech', saas: 'calcSaas', design: 'calcDesign',
    };
    const calculate = window[calculators[slug]];
    if (typeof calculate === 'function') calculate();
  }

  window.setGlobalCurrency = function () {
    const code = select.value.split('|')[1];
    current = catalog.find((currency) => currency.code === code) || catalog[0];
    const curr = { label: current.label, code: current.code, locale: current.locale };
    GLOBAL_CURR = curr;
    PKG_CURR = curr;
    MENU_CURR = curr;
    CURR = curr;
    try { localStorage.setItem('tas3eerah.currency', current.code); } catch {}
    recalculate();
    updateLabels();
    window.dispatchEvent(new CustomEvent('tas3eerah:currencychange', { detail: curr }));
  };
  window.ToolCurrency = { get current() { return current; } };

  function initialize() {
    let saved;
    try { saved = localStorage.getItem('tas3eerah.currency'); } catch {}
    const chosen = catalog.find((currency) => currency.code === saved) || current;
    select.value = `${chosen.label}|${chosen.code}|${chosen.locale}`;
    observer = new MutationObserver(updateLabels);
    window.setGlobalCurrency();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
