// The glass hero prototype (/hero-lab): its cards say only what the site's data says,
// and the [04] glass behaves as the study measured it.
//
//   node --test tests/glass-hero.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { glassCards, h2Card } from '../src/config/glass.ts';
import { details, annaLead } from '../src/config/home.ts';
import { cardState, pixelAt, glassAt, PERIOD, REF, toRef } from '../src/scripts/glass/model.js';

test('five cards, in the order of the sketch, each linking to its project page', () => {
  assert.deepEqual(glassCards.map(c => c.title), ['ANNA', 'Henk', 'Finance Bot', 'Homelab', 'Claude Sandbox']);
  assert.equal(glassCards[0].href, annaLead.href);
  for (const c of glassCards.slice(1)) {
    const d = details.find(x => x.id === c.id);
    assert.ok(d, `${c.id} is a project on the homepage`);
    assert.equal(c.href, d.href);
  }
});

test('every readout number is one of the project\'s own dimensions, never typed in twice', () => {
  for (const c of glassCards.slice(1)) {
    const d = details.find(x => x.id === c.id);
    assert.ok(d.dims.some(dim => dim.value === c.value), `${c.id}: ${c.value} is in home.ts`);
    assert.ok(c.readout.startsWith(c.value), `${c.id}: readout leads with its number`);
  }
  // ANNA's one fact is the one annaLead states
  assert.match(annaLead.text, /in production/i);
  assert.match(glassCards[0].readout, /^In production/);
});

test('the H2 card is ANNA', () => {
  assert.equal(h2Card.id, 'anna');
  assert.equal(h2Card.href, annaLead.href);
});

test('each light runs on one loop: t and t + PERIOD are the same frame', () => {
  for (let i = 0; i < 5; i++) {
    for (const [u, v] of [[60, 90], [148, 200], [230, 300]]) {
      const a = pixelAt(cardState(i, 1.3), u, v), b = pixelAt(cardState(i, 1.3 + PERIOD), u, v);
      a.forEach((x, j) => assert.ok(Math.abs(x - b[j]) < 1e-6, `light ${i} at ${u},${v}`));
    }
  }
});

test('glass touches only the light: an unlit card shows exactly its own colour, ribs and all', () => {
  for (const base of [[40, 40, 40], [226, 221, 213]]) {
    const flat = { base, layers: [] };
    for (let u = 0.5; u < 32; u += 0.5) {
      const p = pixelAt(flat, u, 100);
      p.forEach((x, j) => assert.ok(Math.abs(x - base[j]) < 1e-6, `${base} at u=${u}: ${p}`));
    }
  }
});

test('the groove still darkens a light where it crosses a seam', () => {
  const lit = { base: [40, 40, 40], layers: [{ kind: 'ellipse', cx: 0, cy: 100, sx: 4000, sy: 4000, sigma: 0.1, color: [200, 200, 200] }] };
  const mid = pixelAt(lit, 4, 100)[0], seam = Math.min(...[7.5, 7.75, 8, 8.25].map(u => pixelAt(lit, u, 100)[0]));
  assert.ok(seam < mid - 5, `seam ${seam} vs rib ${mid}`);
});

test('the refraction is mirrored: across one rib the sample runs backwards about 2.5x', () => {
  const a = glassAt(2.5).xs, b = glassAt(5.5).xs;
  const slope = (b - a) / 3;
  assert.ok(slope < -2 && slope > -3, `slope ${slope}`);
});

test('a card of any size maps onto the study\'s 296 x 360 card', () => {
  assert.deepEqual(REF, { w: 296, h: 360 });
  assert.equal(toRef(250), 296 / 250);
  assert.equal(toRef(592), 0.5);
});

test('a card tunes a light: new colours and edges, shape scaled and moved, motion kept', () => {
  const a = cardState(3, 3.1);
  const b = cardState(3, 3.1, [226, 221, 213], [{ scale: 1.5, dy: 10, set: { sigma: 0.05, color: [10, 20, 30] } }, null]);
  assert.deepEqual(b.base, [226, 221, 213]);
  assert.deepEqual(b.layers[0].color, [10, 20, 30]);
  assert.equal(b.layers[0].sigma, 0.05);
  assert.ok(Math.abs(b.layers[0].sx - 1.5 * a.layers[0].sx) < 1e-9);
  assert.ok(Math.abs(b.layers[0].cy - (a.layers[0].cy + 10)) < 1e-9);
  assert.equal(b.layers[0].cx, a.layers[0].cx);
  assert.deepEqual(b.layers[1], a.layers[1]);
  // a band scales its half-height and moves its centre line
  const t0 = cardState(1, 2), t1 = cardState(1, 2, null, [{ scale: 2, dy: 5 }]);
  assert.ok(Math.abs(t1.layers[0].half - 2 * t0.layers[0].half) < 1e-9);
  assert.ok(Math.abs(t1.layers[0].y0 - (t0.layers[0].y0 + 5)) < 1e-9);
});

test('all five cards stand on one stone, within a few levels', () => {
  for (const c of glassCards) c.base.forEach((v, j) => assert.ok(Math.abs(v - [226, 221, 213][j]) <= 8, `${c.id} ${c.base}`));
});

test('every tuned colour is in 0..255', () => {
  for (const c of glassCards) for (const t of c.tune ?? []) for (const k of ['color', 'color2']) {
    const col = t?.set?.[k];
    if (!col) continue;
    assert.equal(col.length, 3);
    for (const v of col) assert.ok(v >= 0 && v <= 255);
  }
});

test('the distance dial: 0 keeps the tuned edge, 1 is the study\'s softness, above 1 softer still', () => {
  const tune = [{ set: { sigma: 0.05 } }];
  const study = cardState(3, 2.2).layers[0].sigma;
  assert.equal(cardState(3, 2.2, null, tune, 0).layers[0].sigma, 0.05);
  assert.ok(Math.abs(cardState(3, 2.2, null, tune, 1).layers[0].sigma - study) < 1e-9);
  assert.ok(Math.abs(cardState(3, 2.2, null, tune, 0.5).layers[0].sigma - (0.05 + study) / 2) < 1e-9);
  assert.ok(Math.abs(cardState(3, 2.2, null, tune, 1.4).layers[0].sigma - 1.4 * study) < 1e-9);
  // a layer the card does not retune follows the dial too above 1, and is the study's below
  assert.equal(cardState(3, 2.2, null, tune, 0).layers[1].sigma, cardState(3, 2.2).layers[1].sigma);
  assert.ok(Math.abs(cardState(3, 2.2, null, tune, 1.4).layers[1].sigma - 1.4 * cardState(3, 2.2).layers[1].sigma) < 1e-9);
});

test('the readout band is quiet: the light fades toward the card behind it, not to nothing above it', () => {
  const lit = { base: [226, 221, 213], layers: [{ kind: 'ellipse', cx: 148, cy: 180, sx: 4000, sy: 4000, sigma: 0.1, color: [40, 80, 160] }] };
  const quiet = { ...lit, quiet: { y0: 290, y1: 330, keep: 0.25 } };
  const above = pixelAt(quiet, 100, 200), below = pixelAt(quiet, 100, 345), free = pixelAt(lit, 100, 345);
  assert.deepEqual(above.map(Math.round), pixelAt(lit, 100, 200).map(Math.round));
  // behind the readout only a quarter of the light's difference from the card survives
  below.forEach((v, j) => assert.ok(Math.abs((v - 226 + [0, 5, 13][j]) - 0.25 * (free[j] - [226, 221, 213][j])) < 1.5, `${below} vs ${free}`));
});

test('a ground: fixed height, its top edge following the study\'s, its study edge the same in px', () => {
  for (const t of [0, 5]) {
    const a = cardState(3, t, null, null, 1), b = cardState(3, t, null, [null, { ground: 150, dy: -50 }], 1);
    assert.equal(b.layers[1].sy, 150);
    assert.ok(Math.abs((b.layers[1].cy - 150) - (a.layers[1].cy - a.layers[1].sy - 50)) < 1e-9);
    assert.ok(Math.abs(b.layers[1].sigma * 150 - a.layers[1].sigma * a.layers[1].sy) < 1e-6);
  }
});

test('a light can be stretched on one axis, its study edge kept the same width in px', () => {
  const a = cardState(3, 1.7, null, null, 1), b = cardState(3, 1.7, null, [null, { stretch: [2, 8] }], 1);
  assert.ok(Math.abs(b.layers[1].sx - 2 * a.layers[1].sx) < 1e-9);
  assert.ok(Math.abs(b.layers[1].sy - 8 * a.layers[1].sy) < 1e-9);
  assert.ok(Math.abs(b.layers[1].sigma * b.layers[1].sy - a.layers[1].sigma * a.layers[1].sy) < 1e-6);
});

test('each card sits at its own distance behind the glass', () => {
  assert.deepEqual(glassCards.map(c => c.distance), [0.35, 0.8, 0.5, 0.5, 0.45]);
});

test('the sun sets into the ground: below the horizon it never shows, at any moment', () => {
  const homelab = glassCards.find(c => c.id === 'homelab');
  for (let t = 0; t < 10; t += 0.25) {
    const s = cardState(homelab.light, t, homelab.base, homelab.tune, homelab.distance);
    const ground = s.layers[1];
    const top = ground.cy - ground.sy;
    assert.ok(top > 200 && top < 240, `t=${t}: the horizon stays put, near 60% height (${top.toFixed(0)})`);
    assert.ok(ground.cy + ground.sy > 360, `t=${t}: the ground reaches the card's bottom`);
    // 30 px under the horizon, straight below the sun: the ground's colour, not the sun's
    const y = top + 30;
    const p = pixelAt(s, s.layers[0].cx, y), g = ground.color;
    assert.ok(ground.sx > 600, `t=${t}: the ground runs past both card edges`);
    assert.ok(Math.abs(p[0] - p[2]) < 60, `t=${t}: sun shows under the horizon (${p.map(Math.round)}) vs ground ${g}`);
  }
});

test('a layer can sit nearer the glass than its card: `dist` scales the card\'s distance for it', () => {
  const tune = [{ dist: 0.5, set: { sigma: 0.05 } }, { set: { sigma: 0.05 } }];
  const study = cardState(3, 2.2).layers.map(L => L.sigma);
  const s = cardState(3, 2.2, null, tune, 0.6);
  assert.ok(Math.abs(s.layers[0].sigma - (0.05 * 0.7 + study[0] * 0.3)) < 1e-9);
  assert.ok(Math.abs(s.layers[1].sigma - (0.05 * 0.4 + study[1] * 0.6)) < 1e-9);
});

test('Homelab: the sun is nearer than the ground, and the ground fades out before the readout', () => {
  const h = glassCards.find(c => c.id === 'homelab');
  assert.ok(h.tune[0].dist < 1);
  const g = h.tune[1].set;
  assert.ok(g.g1 <= 300, `ground has faded to stone by y ${g.g1}`);
  assert.ok(g.color.reduce((a, b) => a + b) / 3 > 120, 'the ground is a muted plum, not near-black');
});
