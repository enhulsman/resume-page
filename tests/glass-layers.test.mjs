// Layers that move and turn: each light can be offset sideways (parallax) and rotated about a
// pivot, and a pane can hold enough of them for ANNA's four levels. CPU twin here, GLSL in shader.js.
//
//   node --test tests/glass-layers.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shapeCoverage } from '../src/scripts/glass/model.js';
import { packLayers, MAX_LAYERS, STRIDE } from '../src/scripts/glass/shader.js';

const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

test('a pane holds at least eight lights', () => {
  assert.ok(MAX_LAYERS >= 8, `MAX_LAYERS ${MAX_LAYERS}`);
});

test('ox slides a light sideways, every kind alike', () => {
  const shapes = [
    { kind: 'ellipse', cx: 100, cy: 120, sx: 30, sy: 50, sigma: 0.2 },
    { kind: 'drop', cx: 100, cy: 200, sx: 20, sy: 20, h: 3, sigma: 0.1 },
    { kind: 'band', y0: 150, amp: 12, lam: 90, phase: 0.4, half: 14, sigma: 0.2 },
  ];
  for (const L of shapes) {
    for (const [X, Y] of [[100, 120], [92, 150], [130, 190], [70, 210]]) {
      assert.ok(near(shapeCoverage({ ...L, ox: 37 }, X + 37, Y), shapeCoverage(L, X, Y)), `${L.kind} at ${X},${Y}`);
    }
  }
});

test('rot turns a light about its own centre: a long flat light stood on end', () => {
  const flat = { kind: 'ellipse', cx: 148, cy: 200, sx: 80, sy: 6, sigma: 0.05 };
  const upright = { ...flat, rot: Math.PI / 2 };
  assert.ok(shapeCoverage(flat, 148 + 60, 200) > 0.9);
  assert.ok(shapeCoverage(flat, 148, 200 + 60) < 0.05);
  assert.ok(shapeCoverage(upright, 148, 200 + 60) > 0.9);
  assert.ok(shapeCoverage(upright, 148 + 60, 200) < 0.05);
});

test('positive rot turns clockwise on screen (y runs down)', () => {
  // a flat light turned a little clockwise: its right end dips (larger y), its left end rises
  const L = { kind: 'ellipse', cx: 148, cy: 200, sx: 90, sy: 5, sigma: 0.05, rot: 0.2 };
  const dy = 70 * Math.tan(0.2);
  assert.ok(shapeCoverage(L, 148 + 70, 200 + dy) > shapeCoverage(L, 148 + 70, 200 - dy) + 0.5);
  assert.ok(shapeCoverage(L, 148 - 70, 200 - dy) > shapeCoverage(L, 148 - 70, 200 + dy) + 0.5);
});

test('rot about a pivot: the light swings round it', () => {
  // a small light 50 px right of the pivot, turned a quarter clockwise, sits 50 px below it
  const L = { kind: 'ellipse', cx: 198, cy: 200, sx: 8, sy: 8, sigma: 0.05, rot: Math.PI / 2, px: 148, py: 200 };
  assert.ok(shapeCoverage(L, 148, 250) > 0.9);
  assert.ok(shapeCoverage(L, 198, 200) < 0.05);
});

test('offset and turn pack into the layer\'s last slot for the shader', () => {
  const a = packLayers([{ kind: 'ellipse', cx: 10, cy: 20, sx: 5, sy: 5, sigma: 0.1, color: [1, 2, 3], ox: 7, rot: 0.3, px: 40, py: 50 }]);
  const o = (STRIDE - 1) * 4;
  assert.deepEqual([...a.slice(o, o + 4)].map(x => +x.toFixed(4)), [7, 0.3, 40, 50]);
  // no pivot given: the light's own centre
  const b = packLayers([{ kind: 'ellipse', cx: 10, cy: 20, sx: 5, sy: 5, sigma: 0.1, color: [1, 2, 3] }]);
  assert.deepEqual([...b.slice(o, o + 4)], [0, 0, 10, 20]);
  assert.equal(a.length, MAX_LAYERS * STRIDE * 4);
});
