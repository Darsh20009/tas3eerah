'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const policies = require('./policies');

test('published policy sections retain the uploaded Arabic text and its date', () => {
  const source = fs.readFileSync(path.join(
    __dirname, '..', 'attached_assets', 'Pasted--tas3eerah-com-20-2026--1790513307610_1790513307611.txt',
  ), 'utf8').trimEnd();
  assert.equal(policies.updated, 'آخر تحديث: 20 سبتمبر 2026');
  assert.equal(policies.sections.length, 5);
  const starts = policies.sections.map(section => source.indexOf(`\n${section.title}\n`) + 1);
  policies.sections.forEach((section, index) => {
    const end = starts[index + 1] ? starts[index + 1] - 1 : source.length;
    const original = source.slice(starts[index], end).trim();
    assert.equal(`${section.title}\n${section.body}`, original);
  });
  assert.ok(policies.sections.find(section => section.id === 'refund').body.includes('خلال ساعة واحدة (60 دقيقة)'));
  assert.ok(policies.sections.some(section => section.body.includes('أسعار الباقات المعروضة شاملة لضريبة القيمة المضافة')));
  assert.ok(!source.includes('الأسعار غير شاملة'));
});