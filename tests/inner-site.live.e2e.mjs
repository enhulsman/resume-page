// Every inner page is still on request, the case that needs the light running (the live lane, run
// one at a time; tests/lib/glass-page.mjs): /projects with its lights running and ANNA playing holds
// still at once when reduced motion comes on. The rest of the inner pages at once:
// tests/inner-site.e2e.mjs. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/inner-site.live.e2e.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useBrowser } from './lib/browser.mjs';

const BASE = process.env.BASE || 'http://localhost:4321';
// its context is closed after the test, passed or failed (tests/lib/browser.mjs)
const pw = useBrowser();

test('Switched on after load: /projects with its lights running and ANNA playing holds still at once when reduced motion comes on', async () => {
  // which frames change is all this reads: at half the device pixels each draw costs a quarter
  const ctx = await pw.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference', deviceScaleFactor: 0.5 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${BASE}/projects?guard=off`, { waitUntil: 'load' });
  await p.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  await p.waitForFunction(() => window.__glassReady === true);
  const f = (n) => p.evaluate((n) => new Promise((done) => { const g = (k) => (k ? requestAnimationFrame(() => g(k - 1)) : done()); g(n); }), n);
  // ANNA's window plays once it is in view; the cards' lights run
  await p.locator('.pi-lead .anna-window').scrollIntoViewIfNeeded();
  await p.waitForFunction(() => { const s = window.__annaWindow?.state(); return s && s.t > 0 && !s.done; }, null, { timeout: 15000 });
  const card = p.locator('[data-glass-moment="project-cards"] .pc').first();
  await card.evaluate((c) => c.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const canvases = () => card.evaluate((c) => [...c.querySelectorAll('canvas')].filter((x) => x.width).map((x) => x.toDataURL()).join());
  const c0 = await canvases();
  await f(20);
  assert.notEqual(c0, await canvases(), 'the lights run before');
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await f(3);
  const s = await p.evaluate(() => window.__annaWindow.state());
  assert.equal(s.done, true, 'the conversation shows finished');
  // the cards where the page now stands, then ANNA's window at the top: each screen still for 30 frames
  const a = await p.screenshot();
  await f(30);
  const b = await p.screenshot();
  await p.evaluate(() => window.scrollTo(0, 0));
  await f(3);
  const c = await p.screenshot();
  await f(30);
  const d = await p.screenshot();
  await ctx.close();
  assert.ok(a.equals(b), 'the cards hold the still frame');
  assert.ok(c.equals(d), 'ANNA\'s window holds still');
  assert.deepEqual(errs, []);
});
