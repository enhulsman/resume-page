// ANNA's four levels as four light shapes behind one pane, and the two stagings that use them:
//   turn:    the ANNA card turned; face-on the four overlap into one flame, turned they separate
//   journey: one tall pane; the question goes down, bends out at a connector, comes back as a message
// The shapes (all four brainstorms agreed): Identity one small near light (one person); Claude two
// tongues meeting one outlet (two backends, one interface); MCP connectors bands fanning sideways;
// Operations the broad wash under everything.
//
//   node --test tests/glass-anna-scene.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { turnScene, journeyScene, requestAt, outletY, LEVELS, TURN_PANE, JOURNEY_PANE, LABEL_Y } from '../src/scripts/glass/anna-scene.js';
import { shapeCoverage, PERIOD } from '../src/scripts/glass/model.js';
import { MAX_LAYERS } from '../src/scripts/glass/shader.js';
import { glassCards } from '../src/config/glass.ts';
import { annaLevels } from '../src/config/home.ts';

const STEP = 4;
/** How much of `level` lights each sample point, summed over its layers. */
function grid(state, pane, keep = () => true) {
  const pts = [];
  for (let Y = STEP / 2; Y < pane.h; Y += STEP) for (let X = STEP / 2; X < pane.w; X += STEP) {
    let w = 0;
    for (const L of state.layers) if (keep(L)) w += shapeCoverage(L, X, Y) * (L.opacity ?? 1);
    pts.push({ X, Y, w });
  }
  return pts;
}
function centre(state, pane, level) {
  let sx = 0, sy = 0, sw = 0;
  for (const p of grid(state, pane, (L) => L.level === level)) { sx += p.X * p.w; sy += p.Y * p.w; sw += p.w; }
  return { x: sx / sw, y: sy / sw, w: sw };
}
/** Share of the pane where `keep`'s lights cover more than `cut`. */
function area(state, pane, keep, cut = 0.3) {
  const pts = grid(state, pane, keep);
  return pts.filter((p) => p.w > cut).length / pts.length;
}
const TS = [0, 1.3, 2.4, 4.9, 7.7];

/** The row where `level` is brightest. */
function peakRow(state, pane, level) {
  const rows = new Map();
  for (const p of grid(state, pane, (L) => L.level === level)) rows.set(p.Y, (rows.get(p.Y) ?? 0) + p.w);
  return [...rows].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

test('the levels are home.ts\'s four, in its order', () => {
  assert.deepEqual(LEVELS, annaLevels.map((l) => l.id));
});

test('the pane is ANNA\'s card colour', () => {
  assert.deepEqual(turnScene(0).base, glassCards[0].base);
  assert.deepEqual(journeyScene(0).base, glassCards[0].base);
});

test('every level is there, and the whole scene fits the shader, at every moment and stage', () => {
  for (const t of TS) {
    for (const s of [turnScene(t, { turn: 0 }), turnScene(t, { turn: 0.5 }), turnScene(t, { turn: 1 }),
      journeyScene(t, { p: 0 }), journeyScene(t, { p: 0.55, focus: 2 }), journeyScene(t, { p: 1 })]) {
      assert.ok(s.layers.length <= MAX_LAYERS, `${s.layers.length} layers`);
      for (const id of LEVELS) assert.ok(s.layers.some((L) => L.level === id), `${id} at t=${t}`);
      for (const L of s.layers) assert.ok(LEVELS.includes(L.level), `layer without a level: ${JSON.stringify(L)}`);
    }
  }
});

test('nearest to the glass is Identity, then Claude, then the connectors; Operations is furthest', () => {
  const s = turnScene(2.4);
  const depth = (id) => Math.max(...s.layers.filter((L) => L.level === id).map((L) => L.depth));
  const nearest = (id) => Math.min(...s.layers.filter((L) => L.level === id).map((L) => L.depth));
  for (let i = 1; i < 4; i++) assert.ok(nearest(LEVELS[i]) > depth(LEVELS[i - 1]), `${LEVELS[i - 1]} before ${LEVELS[i]}`);
});

test('Identity is one small light: one person', () => {
  const s = turnScene(2.4);
  assert.equal(s.layers.filter((L) => L.level === 'identity').length, 1);
  const a = area(s, TURN_PANE, (L) => L.level === 'identity');
  assert.ok(a > 0.001 && a < 0.02, `identity covers ${a}`);
});

test('Claude is two tongues whose tips meet in one outlet: two backends, one interface', () => {
  const s = turnScene(2.4);
  const tongues = s.layers.filter((L) => L.level === 'claude');
  assert.equal(tongues.length, 2);
  assert.ok(tongues.every((L) => L.kind === 'drop'));
  // the highest and lowest lit row of each tongue
  const ends = tongues.map((L) => {
    const rows = [];
    for (let Y = 0; Y < TURN_PANE.h; Y += 2) {
      let best = -1, bx = 0;
      for (let X = 0; X < TURN_PANE.w; X += 1) { const c = shapeCoverage(L, X, Y); if (c > best) { best = c; bx = X; } }
      if (best > 0.5) rows.push({ Y, x: bx });
    }
    return { tip: rows[0], root: rows.at(-1) };
  });
  const tipGap = Math.abs(ends[0].tip.x - ends[1].tip.x), rootGap = Math.abs(ends[0].root.x - ends[1].root.x);
  assert.ok(tipGap < 10, `tips ${tipGap} px apart`);
  assert.ok(rootGap > 2.5 * tipGap + 12, `roots ${rootGap} px apart, tips ${tipGap}`);
});

test('the connectors are bands fanning sideways: long, thin, each at its own angle', () => {
  const s = turnScene(2.4);
  const bands = s.layers.filter((L) => L.level === 'connectors');
  assert.ok(bands.length >= 3, `${bands.length} bands`);
  const angles = new Set(bands.map((L) => (L.rot ?? 0).toFixed(2)));
  assert.equal(angles.size, bands.length, 'each band at its own angle');
  for (const L of bands) assert.ok(L.sx > 6 * L.sy, `band ${L.sx} x ${L.sy}`);
  for (const L of bands) assert.ok(Math.abs(L.rot ?? 0) < 0.6, 'sideways, not up');
});

test('Operations is the broad wash under everything, always on', () => {
  const s = turnScene(2.4);
  const ops = s.layers.filter((L) => L.level === 'ops');
  assert.equal(ops.length, 1);
  assert.equal(s.layers[0].level, 'ops', 'drawn first: under the rest');
  assert.ok(area(s, TURN_PANE, (L) => L.level === 'ops', 0.15) > 0.3, 'broad');
  for (const t of TS) for (const p of [0, 0.3, 0.6, 1]) {
    assert.ok(journeyScene(t, { p }).layers.find((L) => L.level === 'ops').opacity > 0.2, `journey p=${p}`);
  }
});

test('face-on, the four overlap into one flame: one axis, one place, the person its core', () => {
  const s = turnScene(2.4, { turn: 0 });
  const c = LEVELS.map((id) => centre(s, TURN_PANE, id));
  for (const [i, k] of c.entries()) assert.ok(Math.abs(k.x - TURN_PANE.w / 2) < 14, `${LEVELS[i]} at x ${k.x.toFixed(1)}`);
  const ys = c.map((k) => k.y);
  assert.ok(Math.max(...ys) - Math.min(...ys) < 75, `all within one flame: ${ys.map((y) => y.toFixed(0))}`);
  // the person's light sits inside the tongues, between the outlet and the roots
  const [tl, tr] = s.layers.filter((L) => L.level === 'claude');
  assert.ok(c[0].y > outletY(tl.cy) && c[0].y < tl.cy, `core at ${c[0].y.toFixed(0)}`);
});

test('tilted, they come apart by depth, top to bottom in level order, all four still on the pane', () => {
  const a = turnScene(2.4, { turn: 0 }), b = turnScene(2.4, { turn: 1 }), h = turnScene(2.4, { turn: 0.5 });
  const rows = LEVELS.map((id) => peakRow(b, TURN_PANE, id));
  for (let i = 1; i < 4; i++) assert.ok(rows[i] - rows[i - 1] >= 55, `${LEVELS[i - 1]} ${rows[i - 1]} then ${LEVELS[i]} ${rows[i]}`);
  // each level moves by its depth: the nearest furthest one way, the wash furthest the other
  const move = LEVELS.map((id) => peakRow(b, TURN_PANE, id) - peakRow(a, TURN_PANE, id));
  for (let i = 1; i < 4; i++) assert.ok(move[i] > move[i - 1], `moves ${move.map((m) => m.toFixed(0))}`);
  assert.ok(move[0] < -40 && move[3] > 25, `apart both ways: ${move.map((m) => m.toFixed(0))}`);
  for (const id of LEVELS) {
    const k = centre(b, TURN_PANE, id);
    assert.ok(k.x > 24 && k.x < TURN_PANE.w - 24 && k.y > 24 && k.y < TURN_PANE.h - 24, `${id} on the pane`);
  }
  // half tilted: about half as far
  const half = centre(h, TURN_PANE, 'identity').y - centre(a, TURN_PANE, 'identity').y;
  assert.ok(Math.abs(half) > 0.35 * Math.abs(move[0]) && Math.abs(half) < 0.65 * Math.abs(move[0]), `half ${half.toFixed(0)} of ${move[0].toFixed(0)}`);
});

test('turning softens what is far: the wash and the bands blur, the near light barely changes', () => {
  const a = turnScene(2.4, { turn: 0 }), b = turnScene(2.4, { turn: 1 });
  const sig = (s, id) => s.layers.find((L) => L.level === id).sigma;
  assert.ok(sig(b, 'ops') > 1.4 * sig(a, 'ops'));
  assert.ok(sig(b, 'connectors') > 1.3 * sig(a, 'connectors'));
  assert.ok(sig(b, 'identity') < 1.15 * sig(a, 'identity'));
});

test('the labels sit level with their lights', () => {
  const s = turnScene(2.4, { turn: 1 });
  for (const [i, id] of LEVELS.entries()) {
    const y = peakRow(s, TURN_PANE, id);
    assert.ok(Math.abs(LABEL_Y[i] - y) < 22, `${id}: label ${LABEL_Y[i]} vs light ${y.toFixed(0)}`);
  }
  for (let i = 1; i < 4; i++) assert.ok(LABEL_Y[i] - LABEL_Y[i - 1] >= 55, 'room for two lines of copy each');
});

test('each staging runs on the one loop: t and t + PERIOD are the same frame', () => {
  for (const [a, b] of [[turnScene(1.3, { turn: 0.4 }), turnScene(1.3 + PERIOD, { turn: 0.4 })], [journeyScene(1.3, { p: 0.5 }), journeyScene(1.3 + PERIOD, { p: 0.5 })]]) {
    a.layers.forEach((L, i) => {
      for (const k of ['cx', 'cy', 'sx', 'sy', 'rot', 'opacity', 'sigma', 'ox']) {
        if (L[k] != null) assert.ok(Math.abs(L[k] - b.layers[i][k]) < 1e-6, `${L.level}.${k}`);
      }
    });
  }
});

test('only: one level alone, for judging the shapes apart', () => {
  for (const id of LEVELS) {
    const s = turnScene(2.4, { only: id });
    assert.ok(s.layers.length > 0 && s.layers.every((L) => L.level === id), id);
  }
});

test('journey: the question starts at the top, goes down through the outlet, out along a band and back', () => {
  const at = (p) => requestAt(p);
  assert.ok(at(0).y < 110, 'starts near the top');
  const ys = [0, 0.2, 0.4, 0.5].map((p) => at(p).y);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] >= ys[i - 1], 'going down');
  const out = Math.max(...[0.5, 0.55, 0.6, 0.65, 0.7].map((p) => Math.abs(at(p).x - JOURNEY_PANE.w / 2)));
  assert.ok(out > 60, `bends out ${out.toFixed(0)} px at a connector`);
  assert.ok(Math.abs(at(0.3).x - JOURNEY_PANE.w / 2) < 2, 'straight down until then');
  const back = [0.7, 0.85, 1].map((p) => at(p).y);
  for (let i = 1; i < back.length; i++) assert.ok(back[i] < back[i - 1], 'coming back up');
});

test('journey: it comes back as one message, wide and sharp at the top', () => {
  const s = journeyScene(2.4, { p: 1 });
  const r = s.layers.find((L) => L.request);
  assert.ok(r, 'the travelling light is marked');
  assert.ok(r.cy < 110, 'at the top');
  assert.ok(r.sx > 90 && r.sx > 3 * r.sy, `a message: ${r.sx} x ${r.sy}`);
  const start = journeyScene(2.4, { p: 0 }).layers.find((L) => L.request);
  assert.ok(start.sx < 16, 'a point at the start');
});

test('journey: the level being read comes nearest, the others recede', () => {
  for (const [k, id] of LEVELS.entries()) {
    const read = journeyScene(2.4, { p: 0.5, focus: k }), idle = journeyScene(2.4, { p: 0.5, focus: -1 });
    const sig = (s) => s.layers.filter((L) => L.level === id && !L.request).map((L) => L.sigma);
    if (!sig(read).length) continue; // identity is the request itself
    sig(read).forEach((v, j) => assert.ok(v < sig(idle)[j], `${id} sharper when read`));
    const other = LEVELS[(k + 1) % 4];
    const o = (s) => s.layers.filter((L) => L.level === other && !L.request).map((L) => L.sigma);
    o(read).forEach((v, j) => assert.ok(v >= o(idle)[j], `${other} not sharper while ${id} is read`));
  }
});

test('every light stays inside its pane', () => {
  for (const t of TS) for (const [s, pane] of [[turnScene(t, { turn: 1 }), TURN_PANE], [journeyScene(t, { p: 0.6 }), JOURNEY_PANE]]) {
    for (const id of LEVELS) {
      const c = centre(s, pane, id);
      assert.ok(c.w > 0, `${id} lights something`);
      assert.ok(c.y > 0 && c.y < pane.h, `${id} at y ${c.y}`);
    }
  }
});
