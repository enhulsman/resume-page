// The experience table's programme chart (src/scripts/overzicht/span.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chart, yearOf } from '../src/scripts/overzicht/span.js';

const p = s => parseFloat(s);

test('a date reads as its year and fraction', () => {
  assert.equal(yearOf(new Date(2026, 0, 1)), 2026);
  assert.ok(Math.abs(yearOf(new Date(2026, 6, 1)) - 2026.5) < 1e-9);
});

test('the axis runs from the first start to the current year, one column per year', () => {
  const c = chart([{ start: 2019, end: 2022 }, { start: 2025, end: null }], 2026.8);
  assert.deepEqual(c.years.map(y => y.year), [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);
  assert.equal(c.n, 8);
  assert.equal(p(c.years[0].x), 0);
  assert.equal(p(c.now), 97.5);
});

test('a closed role runs mid-year to mid-year, an open one to now', () => {
  const c = chart([{ start: 2019, end: 2022 }, { start: 2025, end: null }], 2026.8);
  assert.equal(p(c.bars[0].l), 6.25);
  assert.equal(p(c.bars[0].w), 37.5);
  assert.equal(p(c.bars[1].l) + p(c.bars[1].w), p(c.now));
});

test('in a new year the axis grows a column and the open bar keeps up', () => {
  const c = chart([{ start: 2019, end: 2022 }, { start: 2025, end: null }], 2028.2);
  assert.equal(c.years.at(-1).year, 2028);
  assert.ok(Math.abs(p(c.bars[1].l) + p(c.bars[1].w) - p(c.now)) < 0.02);
});
