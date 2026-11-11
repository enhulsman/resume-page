// ANNA's window on the homepage, the tests that switch reduced motion on while the page runs (the
// live lane, run one at a time: tests/lib/glass-page.mjs): her conversation shows finished at once.
// The rest of her window: tests/glass-anna-window.e2e.mjs. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-anna-window.live.e2e.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useBrowser, SWIFTSHADER } from './lib/browser.mjs';
import { annaCalls } from '../src/config/home.ts';

const BASE = process.env.BASE || 'http://localhost:4321';
/** The beats in the page, in order: her work is one line (the `sources` beat); no steps list, no record. */
const BEATS = ['person', 'answer', 'sources', 'question', 'reply', 'result'];
const pw = useBrowser({ args: SWIFTSHADER });

/** The homepage (or `path`); `q` is the query string without its "?". */
async function open(q = '', { width = 1440, height = 900, reducedMotion = 'no-preference', path = '/' } = {}) {
  const context = await pw.newContext({ viewport: { width, height }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${BASE}${path}${q ? `?${q}` : ''}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__glassReady === true);
  return { context, page, errors };
}
const state = (page) => page.evaluate(() => window.__annaWindow.state());
/** Wait until `pred(state, arg)` holds and return the window's state; a timeout fails the test with what
 *  it waited for and the last state it saw, so it reads as a timeout rather than as a wrong value. */
async function until(page, pred, arg, timeout = 40000) {
  try {
    await page.waitForFunction(([src, a]) => window.__annaWindow && new Function('s', 'a', `return (${src})(s, a)`)(window.__annaWindow.state(), a), [pred.toString(), arg], { timeout });
  } catch (e) {
    if (e?.name !== 'TimeoutError') throw e;
    const last = await state(page).then((s) => JSON.stringify(s), (err) => `unreadable (${String(err?.message ?? err).split('\n')[0]})`);
    const withArg = arg === undefined || arg === null ? '' : ` with ${JSON.stringify(arg)}`;
    throw new Error(`until: timed out after ${timeout} ms waiting for ${pred}${withArg}; last state: ${last}`, { cause: e });
  }
  return state(page);
}
const intoView = (page) => page.evaluate(() => document.querySelector('.anna-window .aw-window').scrollIntoView({ block: 'center' }));
const onBeats = (page) => page.$$eval('.anna-window [data-beat]', (els) => els.filter((e) => e.classList.contains('on')).map((e) => e.dataset.beat));
const norm = (s) => s.replace(/\s+/g, ' ').trim();
/** Let the page render `n` more frames (observers and rAF callbacks run in between). */
const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
/** The work line's text as it shows (the crossfade done). */
const workLine = (page) => page.$eval('.anna-window .aw-work-t', (e) => e.textContent.trim());

test('reduced motion switched on after load, before the window is in view: the finished conversation, no replay', async () => {
  const { context, page, errors } = await open('');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const s = await until(page, (s) => s.done, undefined, 5000);
  assert.equal(s.done, true);
  await intoView(page);
  await frames(page);
  assert.deepEqual(await onBeats(page), BEATS);
  assert.equal(await page.isVisible('.anna-window .aw-replay'), false);
  assert.equal(await workLine(page), annaCalls.work.done);
  await context.close();
  assert.deepEqual(errors, []);
});

test('reduced motion switched on mid-play: it stops and shows the end', async () => {
  const { context, page, errors } = await open('');
  await intoView(page);
  await until(page, (s) => s.beat === 'answer');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const s = await until(page, (s) => s.done, undefined, 5000);
  assert.equal(s.done, true);
  assert.ok(s.t >= 18, `jumped to the end: ${s.t}`);
  assert.equal(s.typed, 0);
  assert.equal(await workLine(page), annaCalls.work.done);
  await context.close();
  assert.deepEqual(errors, []);
});
