'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { CURRENCIES, currencyFor, formatMoney } = require('./currencies');
const { readSource, renderClassicTools, TOOL_SLUGS } = require('./classic-tools');

test('24 supported currency units include Arab countries, dollars and euros', () => {
  assert.equal(CURRENCIES.length, 24);
  assert.equal(new Set(CURRENCIES.map(currency => currency.code)).size, 24);
  for (const code of ['SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'USD', 'EUR', 'MRU', 'KMF']) {
    assert.equal(currencyFor(code).code, code);
    assert.ok(formatMoney(100, code).endsWith(code));
  }
  assert.equal(currencyFor('INVALID'), null);
});

test('all tools use the latest uploaded document and a visible shared currency selector', () => {
  const source = readSource();
  assert.ok(source.includes('id="art-unit-price"'));
  assert.ok(source.includes('/assets/logo.png?v=20261006'));
  for (const slug of [...TOOL_SLUGS].filter(slug => !slug.startsWith('calc_'))) {
    const markup = renderClassicTools(slug);
    assert.ok(markup.includes(`id="tool-${slug}"`));
    assert.ok(markup.includes('id="global-currency"'));
    assert.ok(markup.includes('أوقية موريتانية|MRU|ar-MR'));
    assert.ok(markup.includes('/assets/js/tool-currencies.js'));
  }
});
