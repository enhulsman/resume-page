// ANNA's section in the glass (/hero-lab?lab=1, task 2.3): four panes over one flame.
// It comes apart as you scroll in, the level you are reading comes forward and sharpens,
// and you can turn it by hand. (The "depth" variant was dropped, 2026-11-09: it said nothing.)
//
//   node --test tests/glass-anna.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annaExploded } from '../src/config/glass.ts';
import { annaLevels } from '../src/config/home.ts';
import { cardState, PERIOD, REF } from '../src/scripts/glass/model.js';
import { MAX_LAYERS } from '../src/scripts/glass/shader.js';
import { paneTarget, gapShare, turnBy, TURN } from '../src/scripts/glass/anna-model.js';

const v = annaExploded;
const times = Array.from({ length: 40 }, (_, i) => (i / 40) * PERIOD);

test('one pane per level, in home.ts order, with home.ts\'s words', () => {
  assert.deepEqual(v.panes.map(p => p.id), annaLevels.map(l => l.id));
  v.panes.forEach((p, i) => {
    assert.equal(p.name, annaLevels[i].name);
    assert.equal(p.text, annaLevels[i].text);
  });
});

test('every pane fits the shader\'s layers, wash included, at every moment', () => {
  for (const p of v.panes) for (const t of times) {
    const s = cardState(p.light, t, p.base, p.tune, p.distance, p.wash);
    assert.ok(s.layers.length <= MAX_LAYERS, `${p.id}: ${s.layers.length} layers`);
  }
});

test('every light stays inside its pane at every moment', () => {
  for (const p of v.panes) for (const t of times) {
    const s = cardState(p.light, t, p.base, p.tune, p.distance);
    for (const L of s.layers) {
      assert.ok(L.cx > 0 && L.cx < REF.w, `${p.id} t=${t.toFixed(2)}: cx ${L.cx.toFixed(1)}`);
      assert.ok(L.cy > 0 && L.cy < v.h, `${p.id} t=${t.toFixed(2)}: cy ${L.cy.toFixed(1)}`);
    }
  }
});

test('one source for all four, sharpest at the bottom where it sits', () => {
  assert.equal(new Set(v.panes.map(p => p.light)).size, 1);
  const d = v.panes.map(p => p.distance);
  for (let i = 1; i < d.length; i++) assert.ok(d[i] < d[i - 1], `${d}`);
});

test('the light fades on its way up, each pane fainter than the one below it', () => {
  const tongue = v.panes.map(p => p.tune[2].set.opacity);
  const halo = v.panes.map(p => p.tune[0].set.opacity);
  for (let i = 1; i < 4; i++) {
    assert.ok(tongue[i] > tongue[i - 1], `tongue ${tongue}`);
    assert.ok(halo[i] > halo[i - 1], `halo ${halo}`);
  }
  assert.equal(tongue[3], 1, 'the bottom pane shows the flame at full strength');
});

// ---- coming apart, focus, turning (anna-model.js) ----

const open = (i, active = -1) => paneTarget(v.panes[i], i, { open: 1, active });
const shut = (i) => paneTarget(v.panes[i], i, { open: 0, active: -1 });

test('opened and unread, each pane is exactly as configured', () => {
  v.panes.forEach((p, i) => {
    const t = open(i);
    assert.equal(t.distance, p.distance);
    assert.equal(t.tongue, p.tune[2].set.opacity);
    assert.equal(t.halo, p.tune[0].set.opacity);
    assert.equal(t.slide, 0);
  });
});

test('pressed together, the light comes through every layer: softer and fainter in each pane', () => {
  v.panes.forEach((p, i) => {
    assert.ok(shut(i).distance > open(i).distance, `${p.id} distance`);
    assert.ok(shut(i).tongue < open(i).tongue, `${p.id} tongue`);
  });
});

test('the pane being read comes forward: sharpest of the four, at full strength, slid out', () => {
  for (let a = 0; a < 4; a++) {
    const ts = v.panes.map((_, i) => open(i, a));
    const sharpest = ts.reduce((m, t, i) => (t.distance < ts[m].distance ? i : m), 0);
    assert.equal(sharpest, a, `reading ${a}`);
    assert.equal(ts[a].tongue, 1);
    assert.ok(ts[a].slide > 0);
    ts.forEach((t, i) => { if (i !== a) { assert.equal(t.slide, 0); assert.ok(t.distance > open(i).distance, `${i} recedes while ${a} is read`); } });
  }
});

test('the gap grows with the opening, from nearly touching to apart', () => {
  assert.ok(gapShare(0) < 0.1);
  assert.equal(gapShare(1), 1);
  for (let k = 1; k <= 10; k++) assert.ok(gapShare(k / 10) >= gapShare((k - 1) / 10));
});

test('turning: any amount round, the tilt kept between nearly flat and edge-on', () => {
  let s = { ...TURN.rest };
  s = turnBy(s, 400, 0);
  assert.ok(Number.isFinite(s.rz));
  s = turnBy(s, 0, 10000);
  assert.equal(s.rx, TURN.maxTilt);
  s = turnBy(s, 0, -10000);
  assert.equal(s.rx, TURN.minTilt);
  assert.ok(TURN.maxTilt <= 90 && TURN.minTilt >= 0);
});
