// Words behind the glass (/hero-lab?lab=1): the name resolving behind glass on arrival.
// (A terminal whose old output sank behind the ribs was tried and dropped, 2026-11-09: mirrored
// text read as broken.)
//
//   node --test tests/glass-words.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revealAt, REVEAL } from '../src/scripts/glass/words-model.js';

test('the name: blurred and far at first, then sharp behind the ribs, then the glass lifts off', () => {
  const a = revealAt(0), mid = revealAt(REVEAL.resolve * 0.5), sharp = revealAt(REVEAL.resolve), end = revealAt(REVEAL.total);
  assert.ok(a.lod > mid.lod && mid.lod > sharp.lod, 'it comes into focus');
  assert.equal(sharp.lod, 0);
  assert.equal(a.glass, 1);
  assert.equal(sharp.glass, 1, 'still behind the glass when sharp');
  assert.equal(end.glass, 0, 'then the glass is gone and the real text stands');
  assert.ok(REVEAL.total <= 3, 'over in three seconds');
  for (let t = 0; t < REVEAL.total; t += 0.05) assert.ok(revealAt(t + 0.05).lod <= revealAt(t).lod + 1e-9, `never blurs again (${t})`);
});

test('the name: after the end, nothing changes', () => {
  assert.deepEqual(revealAt(REVEAL.total + 5), revealAt(REVEAL.total));
});
