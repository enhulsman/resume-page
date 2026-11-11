// The glass hero (the homepage's four cards): its cards say only what the site's data says,
// and the [04] glass behaves as the study measured it.
//
//   node --test tests/glass-hero.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { glassCards, benched } from '../src/config/glass.ts';
import { details, annaLead } from '../src/config/home.ts';
import { cardState, pixelAt, glassAt, PERIOD, REF, toRef } from '../src/scripts/glass/model.js';

test('four cards, the work Ezra stands behind, each linking to its project page', () => {
  assert.deepEqual(glassCards.map(c => c.title), ['ANNA', 'Henk', 'Homelab', 'Claude Sandbox']);
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

test('each light runs on one loop: t and t + PERIOD are the same frame', () => {
  for (let i = 0; i < 5; i++) { // all five of the study's lights, benched ones included
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
  assert.deepEqual(glassCards.map(c => c.distance), [0.35, 0.8, 0.5, 0.45]);
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

test('a light can lean: `lean` adds to its shear and keeps the sway', () => {
  const a = cardState(0, 1.1), b = cardState(0, 1.1, null, [null, null, { lean: 0.15 }]);
  assert.ok(Math.abs(b.layers[2].shear - ((a.layers[2].shear ?? 0) + 0.15)) < 1e-9);
});

test('a wash: one faint broad light under the rest, so the ribs show across the whole card', () => {
  const s = cardState(1, 2, null, null, 0.5, { color: [120, 150, 200], opacity: 0.2 });
  assert.equal(s.layers[0].kind, 'ellipse');
  assert.deepEqual(s.layers[0].color, [120, 150, 200]);
  assert.equal(s.layers[0].opacity, 0.2);
  assert.ok(s.layers[0].sx > 296 && s.layers[0].sy > 360, 'it covers the card');
  assert.equal(s.layers.length, cardState(1, 2).layers.length + 1);
});

test('a light switched off is dropped, so every card fits the shader\'s three layers', () => {
  for (const c of glassCards) {
    const s = cardState(c.light, 3, c.base, c.tune, c.distance, c.wash);
    assert.ok(s.layers.length <= 3, `${c.id}: ${s.layers.length} layers`);
    assert.ok(s.layers.every(L => (L.opacity ?? 1) > 0), `${c.id}: no dead layers`);
  }
});

test('every card has a wash in its own hue, faint', () => {
  for (const c of glassCards) {
    assert.ok(c.wash, c.id);
    assert.ok(c.wash.opacity > 0 && c.wash.opacity <= 0.25, `${c.id} ${c.wash.opacity}`);
  }
});

test('Finance Bot is benched, not deleted: its card can come back as 05', () => {
  assert.deepEqual(benched.map(c => c.title), ['Finance Bot']);
  const d = details.find(x => x.id === 'finance');
  assert.ok(d.dims.some(dim => dim.value === benched[0].value));
});

// ---- the arrival and the name's light (stone-homepage: "The hero arrives and the cards' light
// reaches the name", sketch round 3, 2026-11-11) ----
import * as A from '../src/scripts/glass/arrival-model.js';
import { readFileSync, existsSync } from 'node:fs';

test('the timeline, as functions: each card starts 160 ms after the last and is in 0.72 s later', () => {
  for (let i = 0; i < 4; i++) {
    const s = 0.12 + 0.16 * i;
    assert.ok(Math.abs(A.START(i) - s) < 1e-9, `card ${i} starts at ${s}`);
    assert.equal(A.cardIn(i, s - 0.01), 0, `card ${i} is out before its start`);
    assert.equal(A.cardIn(i, s), 0);
    assert.ok(A.cardIn(i, s + 0.36) > 0 && A.cardIn(i, s + 0.36) < 1, 'partly in');
    assert.equal(A.cardIn(i, s + 0.72), 1, `card ${i} is in 0.72 s after its start`);
    assert.equal(A.glowIn(i, s), 0, `card ${i}'s light starts dim`);
    assert.equal(A.glowIn(i, s + 1.01), 1, `card ${i}'s light is full within 1.01 s`);
  }
  // in order: at no moment is a later card further in than an earlier one
  for (let t = 0; t <= 2.5; t += 0.05) for (let i = 1; i < 4; i++) {
    assert.ok(A.cardIn(i, t) <= A.cardIn(i - 1, t), `t ${t}: card ${i} ahead of card ${i - 1}`);
    assert.ok(A.glowIn(i, t) <= A.glowIn(i - 1, t), `t ${t}: light ${i} ahead of light ${i - 1}`);
  }
  assert.equal(A.T, 5);
});

test('the spill: nothing before 1.5 s, the peak from 2.2 s to 3.7 s, then 46% of it at a card\'s brightest by 5 s', () => {
  for (const amount of [0, 0.3, 1]) {
    for (let t = 0; t < 1.5; t += 0.1) assert.equal(A.spillK(t, amount), 0, `t ${t}`);
    for (let t = 2.2; t <= 3.7; t += 0.1) assert.equal(A.spillK(t, amount), 1, `the peak at t ${t}`);
    for (let t = 0; t <= 8; t += 0.05) assert.ok(A.spillK(t, amount) <= 1, 'never above the peak');
    for (const t of [5, 6, 50]) assert.ok(Math.abs(A.spillK(t, amount) - A.restLevel(amount)) < 1e-9, `rest at ${t}`);
  }
  assert.ok(Math.abs(A.restLevel(1) - 0.46) < 1e-9, '46% at its brightest');
  assert.ok(Math.abs(A.restLevel(0) - 0.23) < 1e-9, 'half that at its dimmest');
  assert.ok(A.restLevel(0.5) > A.restLevel(0.2), 'the rest follows the light');
});

test('each card\'s light amount over the loop: 40 samples from 0 (dimmest) to 1 (brightest), wrapping', () => {
  for (const c of glassCards) {
    const row = A.loopAmounts(c);
    assert.equal(row.length, 40, c.id);
    assert.ok(row.every((v) => v >= 0 && v <= 1), `${c.id} in 0..1`);
    assert.ok(Math.min(...row) === 0 || row.every((v) => v === 1), `${c.id} reaches its dimmest`);
    assert.ok(Math.max(...row) === 1, `${c.id} reaches its brightest`);
    // interpolated between samples, and one loop on: the same
    assert.ok(Math.abs(A.amountAt(row, 0) - row[0]) < 1e-9);
    assert.ok(Math.abs(A.amountAt(row, PERIOD / 80) - (row[0] + row[1]) / 2) < 1e-9, 'halfway between two samples');
    assert.ok(Math.abs(A.amountAt(row, 3.3) - A.amountAt(row, 3.3 + PERIOD)) < 1e-9, 'loops');
    assert.ok(Math.abs(A.amountAt(row, PERIOD - 1e-9) - row[0]) < 1e-3, 'the last sample runs into the first');
  }
  // a light that barely changes stays at full: the rest never dips for a still card
  const flat = { light: 0, base: [226, 221, 213], tune: [{ set: { opacity: 0 } }, { set: { opacity: 0 } }, { set: { opacity: 0 } }], distance: 1, wash: { color: [200, 150, 100], opacity: 0.2 } };
  assert.ok(A.loopAmounts(flat).every((v) => v === 1), 'a still light is 1 throughout');
  // too few or no samples: the card shows its full rest
  assert.equal(A.amountAt([], 2), 1);
  assert.equal(A.amountAt(null, 2), 1);
});

test('a soft light: six stops from its strength to nothing, no edge', () => {
  const css = A.softLight([100, 170, 30], 0.6, 200, 120, 40.25, 300);
  assert.match(css, /^radial-gradient\(200px 120px at 40\.3px 300\.0px, /);
  const stops = [...css.matchAll(/rgb\(([\d ]+) \/ ([\d.]+)\) (\d+)%/g)].map((m) => [+m[2], +m[3]]);
  assert.equal(stops.length, 6);
  assert.deepEqual(stops.map((s) => s[1]), [0, 18, 36, 56, 76, 100]);
  assert.equal(stops[0][0], 0.6);
  assert.equal(stops.at(-1)[0], 0, 'it fades to nothing');
  for (let k = 1; k < 6; k++) assert.ok(stops[k][0] < stops[k - 1][0], 'falling all the way');
});

test('where a card\'s light sits on the name: under the letters at the card\'s centre, only the part in view, stronger on a phone', () => {
  const name = { left: 30, top: 100, width: 900, height: 380 };
  const row = { left: 0, right: 1440 };
  const card = { left: 376, top: 530, width: 330, height: 360, right: 706 };
  const d = A.spillPlace(card, row, name, 1440, false);
  assert.equal(d.x, 376 + 165 - 30, 'at the card\'s centre');
  assert.ok(d.y > name.height / 2, 'below the middle of the name');
  assert.ok(d.y <= name.height * 1.45 + 1e-9, 'never further below than 1.45 of the name');
  assert.equal(d.seen, 1);
  assert.equal(d.gain, 1);
  // a phone: the card half out of the row throws a little light, wider, and stronger
  const p = A.spillPlace({ left: 200, right: 504, top: 380, width: 304, height: 349 }, { left: 0, right: 390 }, { left: 16, top: 80, width: 340, height: 150 }, 390, true);
  assert.ok(p.seen > 0.6 && p.seen < 0.65, `seen ${p.seen}`);
  assert.equal(p.gain, 1.9);
  assert.ok(p.rx > 304 * 1.1, 'wider on a phone');
  assert.equal(p.y, 150 * 1.45, 'brought up to just under the name');
  // a card wholly out of view throws none
  assert.equal(A.spillPlace({ left: 400, right: 700, top: 380, width: 300, height: 349 }, { left: 0, right: 390 }, name, 390, true).seen, 0);
});

test('the mouse light takes the hue of the card under the pointer, blended with its neighbours', () => {
  const cards = glassCards.map((c, i) => ({ left: 32 + i * 344, width: 330, hue: c.spill }));
  const dist = (a, b) => Math.hypot(...a.map((v, j) => v - b[j]));
  cards.forEach((c, i) => {
    const h = A.hueAt(c.left + c.width / 2, cards);
    const nearest = cards.map((o) => dist(h, o.hue)).indexOf(Math.min(...cards.map((o) => dist(h, o.hue))));
    assert.equal(nearest, i, `over card ${i} the light is nearest its hue`);
  });
});

test('every hero card throws its light\'s own hue on the name: `spill` in config, near one of its light\'s colours', () => {
  const hue = ([r, g, b]) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return 0;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const apart = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  for (const c of glassCards) {
    assert.ok(Array.isArray(c.spill) && c.spill.length === 3, `${c.id} has a spill hue`);
    assert.ok(c.spill.every((v) => Number.isInteger(v) && v >= 0 && v <= 255), `${c.id} in 0..255`);
    const own = (c.tune ?? []).flatMap((t) => [t?.set?.color, t?.set?.color2]).filter(Boolean);
    assert.ok(own.some((col) => apart(hue(col), hue(c.spill)) <= 20), `${c.id}: ${c.spill} near its light`);
  }
});

test('the hero carries the arrival: Hero.astro renders the hues and amounts, the pending class, the name\'s copy; index loads arrival.js', () => {
  const hero = readFileSync(new URL('../src/components/stone/Hero.astro', import.meta.url), 'utf8');
  assert.match(hero, /"data-spill": \(c\.spill/, 'each card\'s hue from config');
  assert.match(hero, /"data-amount": loopAmounts\(c\)/, 'each card\'s light over the loop, at build time');
  assert.match(hero, /<li \{\.\.\.lights\[i\]\}>/);
  assert.match(hero, /data-ink=\{site\.name\}/, 'the copy of the name is site.name');
  assert.match(hero, /arrive-pending/);
  assert.match(hero, /content: attr\(data-ink\) \/ ""/, 'the copy is silent to readers');
  const index = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.match(index, /scripts\/glass\/arrival\.js/);
  // one panes.js: no sketch copy left behind
  assert.equal(existsSync(new URL('../src/scripts/sketches', import.meta.url)), false);
  assert.equal(existsSync(new URL('../src/pages/sketches', import.meta.url)), false);
});
