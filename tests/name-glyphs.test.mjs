// The arrival draws the homepage name from src/data/name-glyphs.json, written by
// scripts/name-glyphs.mjs. If the name changes and the data is not regenerated, the drawn
// letters would spell the old name: this fails first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const at = p => new URL(p, import.meta.url);
const data = JSON.parse(readFileSync(at('../src/data/name-glyphs.json'), 'utf8'));
const name = readFileSync(at('../src/config/site.ts'), 'utf8').match(/^\s*name:\s*'([^']+)'/m)[1];

test('the glyph data is for the name the site carries', () => {
  assert.equal(data.name, name, 'run `npm run name-glyphs`');
  // split as YouSheet splits it: first name, then the rest
  const [first, ...rest] = name.split(' ');
  assert.deepEqual(data.lines.map(l => l.text), [first, rest.join(' ')]);
});

test('every letter of each line has an outline, in reading order', () => {
  for (const line of data.lines) {
    assert.equal(line.glyphs.map(g => g.char).join(''), line.text.replace(/\s/g, ''));
    for (const g of line.glyphs) {
      assert.match(g.d, /^M-?\d/, `${g.char} has a path`);
      assert.ok(g.box[2] > g.box[0] && g.box[3] > g.box[1], `${g.char} has a box`);
    }
    const xs = line.glyphs.map(g => g.x);
    assert.deepEqual(xs, [...xs].sort((a, b) => a - b), 'left to right');
  }
});

test('the outlines are the name weight and width the page sets', () => {
  const css = readFileSync(at('../src/styles/overzicht.css'), 'utf8');
  const rule = css.match(/\n\.name \{([^}]*)\}/)[1];
  assert.match(rule, new RegExp(`font-weight: ${data.wght}\\b`));
  assert.match(rule, new RegExp(`font-stretch: ${data.wdth}%`));
  assert.match(rule, new RegExp(`letter-spacing: ${String(data.tracking).replace('0.', '.')}em`));
});
