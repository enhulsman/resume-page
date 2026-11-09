// ANNA's section in the glass (/hero-lab?lab=1, task 2.3): two variants under trial.
//   depth     one tall pane, a row per level, each light further behind the glass the lower it is
//   exploded  four panes pulled apart over one source at the bottom, each softer the further up
//
//   node --test tests/glass-anna.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annaDepth, annaExploded } from '../src/config/glass.ts';
import { annaLevels } from '../src/config/home.ts';
import { cardState, PERIOD, REF } from '../src/scripts/glass/model.js';
import { MAX_LAYERS } from '../src/scripts/glass/shader.js';

const variants = { depth: annaDepth, exploded: annaExploded };
const times = Array.from({ length: 40 }, (_, i) => (i / 40) * PERIOD);

for (const [name, v] of Object.entries(variants)) {
  test(`${name}: one pane per level, in home.ts order, with home.ts's words`, () => {
    assert.deepEqual(v.panes.map(p => p.id), annaLevels.map(l => l.id));
    v.panes.forEach((p, i) => {
      assert.equal(p.name, annaLevels[i].name);
      assert.equal(p.text, annaLevels[i].text);
    });
  });

  test(`${name}: every pane fits the shader's layers, wash included, at every moment`, () => {
    for (const p of v.panes) for (const t of times) {
      const s = cardState(p.light, t, p.base, p.tune, p.distance, p.wash);
      assert.ok(s.layers.length <= MAX_LAYERS, `${p.id}: ${s.layers.length} layers`);
    }
  });

  test(`${name}: every light stays inside its pane at every moment`, () => {
    for (const p of v.panes) for (const t of times) {
      const s = cardState(p.light, t, p.base, p.tune, p.distance); // no wash: it is meant to overflow
      for (const L of s.layers) {
        const cx = L.cx ?? REF.w / 2, cy = L.cy ?? L.y0;
        assert.ok(cx > 0 && cx < REF.w, `${p.id} t=${t.toFixed(2)}: cx ${cx.toFixed(1)}`);
        assert.ok(cy > 0 && cy < v.h, `${p.id} t=${t.toFixed(2)}: cy ${cy.toFixed(1)} outside 0..${v.h}`);
      }
    }
  });

  test(`${name}: every colour is in 0..255`, () => {
    for (const p of v.panes) {
      for (const x of [...p.base, ...p.wash.color]) assert.ok(x >= 0 && x <= 255);
      for (const T of p.tune ?? []) for (const k of ['color', 'color2']) for (const x of T?.set?.[k] ?? []) assert.ok(x >= 0 && x <= 255, `${p.id} ${k}`);
    }
  });
}

test('depth: each level sits further behind the glass than the one above it', () => {
  const d = annaDepth.panes.map(p => p.distance);
  for (let i = 1; i < d.length; i++) assert.ok(d[i] > d[i - 1], `${d}`);
  assert.equal(d[0], 0.35, '−1 Identity at the distance Ezra picked for ANNA\'s card');
});

test('exploded: one source for all four, sharpest at the bottom where it sits', () => {
  assert.equal(new Set(annaExploded.panes.map(p => p.light)).size, 1);
  const d = annaExploded.panes.map(p => p.distance);
  for (let i = 1; i < d.length; i++) assert.ok(d[i] < d[i - 1], `${d}`);
});

test('exploded: the light fades on its way up, each pane fainter than the one below it', () => {
  const tongue = annaExploded.panes.map(p => p.tune[2].set.opacity ?? 1);
  const halo = annaExploded.panes.map(p => p.tune[0].set.opacity ?? 1);
  for (let i = 1; i < 4; i++) {
    assert.ok(tongue[i] > tongue[i - 1], `tongue ${tongue}`);
    assert.ok(halo[i] > halo[i - 1], `halo ${halo}`);
  }
  assert.equal(tongue[3], 1, 'the bottom pane shows the flame at full strength');
});
