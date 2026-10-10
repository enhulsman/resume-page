// The ANNA drawing's painting order (src/scripts/overzicht/depth.js): solids that touch or
// stand apart are painted far side first, whatever their average depths say.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paintOrder } from '../src/scripts/overzicht/depth.js';

const solid = (min, max, d, rect = { x0: 0, y0: 0, x1: 10, y1: 10 }) => ({ min: { x: min[0], y: min[1], z: min[2] }, max: { x: max[0], y: max[1], z: max[2] }, d, rect });
const floor = d => solid([-2.42, -0.24, -1.9], [2.42, 0, 1.9], d);
const leftWall = d => solid([-2.42, 0, -1.9], [-2.22, 2.8, 1.9], d);
const backWall = d => solid([-2.22, 0, -1.9], [2.22, 2.8, -1.62], d);
const fromAboveRight = { x: 0.5, y: 0.6, z: 0.6 };

test('a wall stands on the floor: the floor is painted first, even when its mean depth is nearer', () => {
  assert.deepEqual(paintOrder([leftWall(0), floor(5)], fromAboveRight), [1, 0]);
  assert.deepEqual(paintOrder([backWall(-3), floor(9)], fromAboveRight), [1, 0]);
});

test('two walls that meet keep one precedence for the side the camera is on', () => {
  // seen from +x the left wall is the far one; seen from -x the back wall is
  assert.deepEqual(paintOrder([leftWall(4), backWall(1)], { x: 0.4, y: 0.5, z: 0.7 }), [0, 1]);
  assert.deepEqual(paintOrder([leftWall(1), backWall(4)], { x: -0.4, y: 0.5, z: 0.7 }), [1, 0]);
});

test('the room stays in one order through the turn, the floor always first', () => {
  for (let th = -1.4; th <= 0.2; th += 0.05) {
    const toward = { x: Math.sin(-th) * 0.8, y: 0.6, z: Math.cos(th) * 0.8 };
    // mean depths that cross over as the model turns, the way the faces' did
    const order = paintOrder([floor(Math.sin(th * 3)), leftWall(Math.cos(th * 2)), backWall(th)], toward);
    assert.equal(order[0], 0, `floor first at ${th.toFixed(2)}`);
  }
});

test('solids that do not overlap on screen, or that interpenetrate, fall back to depth', () => {
  const apart = [solid([0, 0, 0], [1, 1, 1], 3, { x0: 0, y0: 0, x1: 1, y1: 1 }), solid([0, 0, 2], [1, 1, 3], 1, { x0: 5, y0: 5, x1: 6, y1: 6 })];
  assert.deepEqual(paintOrder(apart, fromAboveRight), [1, 0]);
  const inside = [solid([0, 0, 0], [2, 2, 2], 3), solid([0.5, 0.5, 0.5], [1, 1, 1], 1)];
  assert.deepEqual(paintOrder(inside, fromAboveRight), [1, 0]);
});

test('every solid is painted exactly once, even if the constraints form a cycle', () => {
  const ring = [solid([0, 0, 0], [1, 1, 1], 0), solid([1, 0, 0], [2, 1, 1], 1), solid([0.5, 0, 1], [1.5, 1, 2], 2)];
  const order = paintOrder(ring, { x: 0.5, y: 0.5, z: -0.5 });
  assert.deepEqual([...order].sort(), [0, 1, 2]);
});
