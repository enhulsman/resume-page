// The homepage's arrival: walking up to the table. On a first visit the sheet settles in as
// its ink develops, the name is lettered between guide lines, and a dimension line gives the
// name's real width. It never plays twice in a session, never on reduced motion, never on an
// inner page, and never hides content without JS. Needs a running site:
//
//   BASE=http://localhost:4321 node --test tests/intro.e2e.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4321';
const SETTLED = 2600; // the whole arrival is about 1.6 s; this leaves margin on a slow box

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

async function open(path = '/', { width = 1440, height = 900, reducedMotion = 'no-preference', js = true, hasTouch = false, colorScheme = 'light', isMobile = false, theme } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, javaScriptEnabled: js, hasTouch, isMobile, colorScheme });
  if (theme) await context.addInitScript(t => localStorage.setItem('theme', t), theme);
  // when the intro class came and went, and when the terminal first printed anything
  await context.addInitScript(() => {
    window.__log = { intro: null, arrived: null, typed: null };
    // the init script runs before <html> exists: watch the document for it
    const seen = () => {
      const html = document.documentElement;
      if (!html) return;
      if (html.classList.contains('intro') && window.__log.intro == null) window.__log.intro = performance.now();
      if (window.__log.intro != null && !html.classList.contains('intro') && window.__log.arrived == null) window.__log.arrived = performance.now();
    };
    new MutationObserver(seen).observe(document, { attributes: true, childList: true, subtree: true, attributeFilter: ['class'] });
    document.addEventListener('DOMContentLoaded', () => {
      seen();
      const term = document.getElementById('terminal-body');
      if (term) new MutationObserver(() => { if (window.__log.typed == null && term.textContent.trim()) window.__log.typed = performance.now(); }).observe(term, { childList: true, subtree: true, characterData: true });
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(BASE + path, { waitUntil: 'load' });
  return { context, page, errors };
}

const log = page => page.evaluate(() => window.__log);
const nameWidth = page => page.evaluate(() => Math.max(...[...document.querySelectorAll('.name span')].map(s => {
  const r = document.createRange(); r.selectNodeContents(s); return r.getBoundingClientRect().width;
})));

test('a first visit plays the arrival once, then leaves the page as it always is', async () => {
  const { context, page, errors } = await open('/');
  assert.ok((await log(page)).intro != null, 'the intro class was set before the page settled');
  await page.waitForTimeout(SETTLED);
  const l = await log(page);
  assert.ok(l.arrived != null, 'the intro class is removed once it is over');
  assert.ok(l.arrived - l.intro < 2400, `over in under 2.4 s (${Math.round(l.arrived - l.intro)} ms)`);
  // nothing is left transformed, clipped or faded
  assert.equal(await page.locator('main').evaluate(m => getComputedStyle(m).transform), 'none');
  for (const c of await page.locator('.name span').evaluateAll(ss => ss.map(s => getComputedStyle(s).clipPath))) assert.equal(c, 'none');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).color), 'rgb(43, 39, 102)', 'full ink');
  assert.equal(await page.locator('.name-guides').count(), 0, 'the guide lines are erased');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('ovz-arrived')), '1');
  assert.deepEqual(errors, []);
  await context.close();
});

test('the arrival develops the ink and letters the name, without hiding the page', async () => {
  const { context, page } = await open('/');
  const anims = await page.evaluate(() => document.getAnimations().map(a => a.animationName).filter(Boolean));
  for (const name of ['develop', 'approach', 'ink']) assert.ok(anims.includes(name), `${name} runs (got ${anims.join(', ')})`);
  // develop fades ink, never opacity: the page reads from the first frame
  assert.equal(await page.locator('main').evaluate(m => getComputedStyle(m).opacity), '1');
  assert.equal(await page.locator('.lede').evaluate(m => getComputedStyle(m).opacity), '1');
  await context.close();
});

test('the name gets a dimension line with its real width', async () => {
  const { context, page } = await open('/');
  await page.waitForTimeout(SETTLED);
  const dim = page.locator('.name-dim');
  assert.equal(await dim.count(), 1);
  const w = await nameWidth(page);
  assert.equal((await dim.locator('text').textContent()).trim(), String(Math.round(w)));
  const [d, n] = await Promise.all([dim.boundingBox(), page.locator('.name').boundingBox()]);
  assert.ok(Math.abs(d.width - w) < 12, `as wide as the name (${Math.round(d.width)} vs ${Math.round(w)})`);
  assert.ok(d.y + d.height <= n.y + 4, 'drawn above the name');
  assert.equal(await dim.getAttribute('aria-hidden'), 'true');
  await context.close();
});

test('the dimension follows the name when the window changes size', async () => {
  const { context, page } = await open('/');
  await page.waitForTimeout(SETTLED);
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.waitForTimeout(300);
  assert.equal((await page.locator('.name-dim text').textContent()).trim(), String(Math.round(await nameWidth(page))));
  await context.close();
});

test('the terminal waits for the arrival before it types', async () => {
  const { context, page } = await open('/');
  await page.waitForFunction(() => window.__log.typed != null, null, { timeout: 8000 });
  const l = await log(page);
  assert.ok(l.typed >= l.arrived, `typed at ${Math.round(l.typed)} ms, arrival over at ${Math.round(l.arrived)} ms`);
  await context.close();
});

test('the canvas takes its ink after the arrival, not the developing grey', async () => {
  const { context, page } = await open('/');
  await page.waitForTimeout(SETTLED);
  await page.locator('#anna').scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(2500);
  // the darkest stroke on the canvas is full ink, not the hairline grey it started from
  const darkest = await page.evaluate(() => {
    const c = document.querySelector('canvas.drawing');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let min = 765;
    for (let i = 0; i < d.length; i += 4 * 7) if (d[i + 3] > 200) min = Math.min(min, d[i] + d[i + 1] + d[i + 2]);
    return min;
  });
  assert.ok(darkest < 300, `darkest canvas pixel sums to ${darkest}`);
  await context.close();
});

test('on a desktop the crosshair travels to the name by itself', async () => {
  const { context, page } = await open('/');
  await page.waitForTimeout(700);
  assert.equal(await page.locator('.xhair').evaluate(x => x.classList.contains('on')), true, 'the crosshair is out, with no mouse moved');
  assert.match(await page.locator('.xhair-read').textContent(), /^x \d+ {2}y \d+$/);
  await context.close();
});

test('a second visit in the same session skips straight to the dimension', async () => {
  const { context, page } = await open('/');
  await page.waitForTimeout(SETTLED);
  await page.reload({ waitUntil: 'load' });
  assert.equal((await log(page)).intro, null, 'no intro on the second visit');
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.name-dim').count(), 1);
  await context.close();
});

test('?intro=1 replays it, ?intro=0 skips it', async () => {
  const { context, page } = await open('/');
  await page.waitForTimeout(SETTLED);
  await page.goto(BASE + '/?intro=1', { waitUntil: 'load' });
  assert.ok((await log(page)).intro != null, 'replayed');
  await context.close();
  const fresh = await open('/?intro=0');
  assert.equal((await log(fresh.page)).intro, null, 'skipped');
  await fresh.context.close();
});

test('reduced motion: no arrival, the dimension is simply there', async () => {
  const { context, page } = await open('/', { reducedMotion: 'reduce' });
  assert.equal((await log(page)).intro, null);
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.name-dim').count(), 1);
  await context.close();
});

test('without JS nothing is hidden and nothing animates', async () => {
  const { context, page } = await open('/', { js: false });
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('intro')), false);
  for (const c of await page.locator('.name span').evaluateAll(ss => ss.map(s => getComputedStyle(s).clipPath))) assert.equal(c, 'none');
  await context.close();
});

test('inner pages and links into the page never play it', async () => {
  for (const path of ['/projects', '/blog', '/#contact']) {
    const { context, page } = await open(path);
    assert.equal((await log(page)).intro, null, `${path} plays no intro`);
    await context.close();
  }
});

test('on a phone it plays without the crosshair, and the dimension fits the screen', async () => {
  const { context, page, errors } = await open('/', { width: 390, height: 844, hasTouch: true, isMobile: true });
  assert.ok((await log(page)).intro != null);
  await page.waitForTimeout(SETTLED);
  assert.equal(await page.locator('.xhair').evaluate(x => getComputedStyle(x).display), 'none');
  const d = await page.locator('.name-dim').boundingBox();
  assert.ok(d.x >= 0 && d.x + d.width <= 390);
  assert.deepEqual(errors, []);
  await context.close();
});

test('in the dark theme the light table switches on, and ends on the dark sheet', async () => {
  const { context, page } = await open('/', { colorScheme: 'dark' });
  const anims = await page.evaluate(() => document.getAnimations().map(a => a.animationName));
  assert.ok(anims.includes('lamp'), `the lamp flickers on (got ${anims.join(', ')})`);
  await page.waitForTimeout(SETTLED);
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(22, 20, 29)');
  await context.close();
});

test('the name is lettered in full ink while the rest develops, in either dark theme too', async () => {
  for (const [opts, ink] of [[{}, 'rgb(43, 39, 102)'], [{ colorScheme: 'dark' }, 'rgb(216, 212, 240)'], [{ theme: 'dark' }, 'rgb(216, 212, 240)']]) {
    const { context, page } = await open('/', opts);
    assert.ok((await log(page)).intro != null);
    assert.equal(await page.locator('.name').evaluate(n => getComputedStyle(n).color), ink, JSON.stringify(opts));
    await context.close();
  }
});
