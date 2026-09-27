'use strict';

const fs = require('node:fs');
const path = require('node:path');

const source = path.join(__dirname, '..', 'attached_assets', 'Pasted--tas3eerah-com-20-2026--1790513307610_1790513307611.txt');
const text = fs.readFileSync(source, 'utf8').trimEnd();
const names = [
  { id: 'terms', title: '١. الشروط والأحكام' },
  { id: 'acceptable-use', title: '٢. سياسة الاستخدام المقبول' },
  { id: 'refund', title: '٣. سياسة الاسترجاع' },
  { id: 'intellectual-property', title: '٤. سياسة الملكية الفكرية' },
  { id: 'privacy', title: '٥. سياسة البيانات والخصوصية' },
];

const positions = names.map(({ title }) => text.indexOf(`\n${title}\n`));
if (positions.some(position => position < 0) || positions.some((position, index) => index && position <= positions[index - 1])) {
  throw new Error('Policy document is missing a section or its order has changed.');
}
const introduction = text.slice(0, positions[0]).trim();
const lines = introduction.split('\n').filter(Boolean);
if (lines.length !== 9 || lines[3] !== 'المحتويات' ||
    names.some((section, index) => lines[index + 4] !== section.title.slice(3))) {
  throw new Error('Policy document heading or contents have changed.');
}
const sections = names.map((section, index) => {
  const start = positions[index] + 1;
  const end = index + 1 < positions.length ? positions[index + 1] : text.length;
  const complete = text.slice(start, end).trimEnd();
  if (!complete.startsWith(section.title)) throw new Error(`Policy section ${section.id} is invalid.`);
  return { ...section, body: complete.slice(section.title.length + 1) };
});

module.exports = {
  title: lines[0],
  site: lines[1],
  updated: lines[2],
  contentsTitle: lines[3],
  sections,
};