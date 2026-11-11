// Ink: text (or any drawing) placed behind the glass, in the same field as the lights, so the
// ribs break it the way they break a light. The CPU twin here, the shader's in shader.js.
//
//   node --test tests/glass-ink.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pixelAt, GLASS } from '../src/scripts/glass/model.js';

const BASE = [238, 234, 227];
const plain = { base: BASE, layers: [] };
const withInk = (sample, extra = {}) => ({ ...plain, ink: { sample, color: [17, 17, 16], strength: 1, ...extra } });
const close = (a, b, tol = 0.6) => a.every((x, j) => Math.abs(x - b[j]) <= tol);

test('ink that covers nothing leaves the pane exactly as it was', () => {
  const s = withInk(() => 0);
  for (const [u, v] of [[10.5, 20.5], [148.5, 180.5], [290.5, 350.5]]) assert.deepEqual(pixelAt(s, u, v), pixelAt(plain, u, v));
});

test('ink over the whole pane shows its colour mid-rib; the grooves pull it toward the pane, as they do a light', () => {
  const s = withInk(() => 1);
  for (let k = 0; k < 30; k++) {
    const mid = k * GLASS.pitch + GLASS.pitch / 2 + (GLASS.offset ?? 0);
    assert.ok(close(pixelAt(s, mid, 100.5), [17, 17, 16], 1), `rib ${k}: ${pixelAt(s, mid, 100.5)}`);
    const seam = pixelAt(s, k * GLASS.pitch + (GLASS.offset ?? 0) + 0.25, 100.5);
    seam.forEach((x, j) => assert.ok(x >= 17 - 1 && x <= BASE[j] + 1, `seam ${k}: ${seam}`));
  }
});

test('strength mixes it toward the pane: half strength sits halfway', () => {
  const s = withInk(() => 1, { strength: 0.5 });
  const want = BASE.map((b, j) => (b + [17, 17, 16][j]) / 2);
  assert.ok(close(pixelAt(s, 148.5, 100.5), want, 1), `${pixelAt(s, 148.5, 100.5)} vs ${want}`);
});

test('a hard ink edge is broken by the ribs: ink shows past it, and pane shows before it', () => {
  // ink left of x = 150; without glass every pixel left is ink and every pixel right is pane
  const s = withInk((X) => (X < 150 ? 1 : 0));
  const dark = (u) => pixelAt(s, u + 0.5, 100.5)[0] < 128;
  const near = Array.from({ length: Math.ceil(GLASS.pitch * 2) }, (_, k) => 150 - GLASS.pitch + k);
  assert.ok(near.some((u) => u >= 150 && dark(u)), 'some ink is refracted past the edge');
  assert.ok(near.some((u) => u < 149 && !dark(u)), 'some pane shows on the ink side');
});

test('ink sits over the light: where both are, the ink wins', () => {
  const light = { kind: 'ellipse', cx: 148, cy: 180, sx: 300, sy: 300, sigma: 0.05, color: [255, 120, 40] };
  const s = { base: BASE, layers: [light], ink: { sample: () => 1, color: [250, 240, 220], strength: 1 } };
  assert.ok(close(pixelAt(s, 148.5, 180.5), [250, 240, 220]));
});
