// The glass hero in a real browser. The H3 hero's own tests run on the homepage (`/`), where it
// shipped (openspec stone-glass-homepage, chunk 2); the lab-only and H2 tests stay on /hero-lab
// until the lab goes (chunk 8). The fit to one screen runs on `/` since chunk 3, when the
// drawing-sheet frame and bar left and the stone bar took their place. Needs a running site:
//   BASE=http://localhost:4399 node --test tests/glass-hero.e2e.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4321';
let browser;
before(async () => { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); });
after(async () => { await browser?.close(); });

async function open(q = '', { width = 1440, height = 900, reducedMotion = 'no-preference', path = '/hero-lab' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${BASE}${path}${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__glassReady === true);
  return { context, page, errors };
}
/** The homepage, where the H3 hero lives now. */
const home = (q = '', o = {}) => open(q, { ...o, path: '/' });
const HERO = '[data-glass-moment="hero"]';
/** Let the page render `n` more frames. */
const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);

// how much a card's canvas varies: an unlit or blank canvas is flat
const spread = (page, sel) => page.$$eval(sel, cs => cs.map(c => {
  const g = document.createElement('canvas'); g.width = 64; g.height = 78;
  const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 78);
  const d = x.getImageData(0, 0, 64, 78).data; let lo = 255, hi = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 250) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; lo = Math.min(lo, v); hi = Math.max(hi, v); }
  return hi - lo;
}));

test('H3: the name is real text, four cards link to their pages, every card is lit', async () => {
  const { context, page, errors } = await home();
  assert.equal((await page.textContent(`${HERO} h1`)).replace(/\s+/g, ''), 'EzraHulsman');
  const links = await page.$$eval(`${HERO} .glass-card`, as => as.map(a => [a.querySelector('.title').textContent, a.getAttribute('href')]));
  assert.deepEqual(links.map(l => l[0]), ['ANNA', 'Henk', 'Homelab', 'Claude Sandbox']);
  for (const [, href] of links) assert.match(href, /^\/projects\//);
  for (const s of await spread(page, `${HERO} .glass-card canvas`)) assert.ok(s > 40, `a lit card varies (${s})`);
  assert.deepEqual(errors, []);
  await context.close();
});

// the homepage under the stone bar: the name, the intro and the whole card row on the first screen
for (const [w, h] of [[1280, 720], [1440, 900], [1920, 1080]]) test(`hero fits the first ${w} x ${h} screen, cards included`, async () => {
  const { context, page } = await home('', { width: w, height: h });
  await page.evaluate(() => document.fonts.ready);
  const bottom = await page.$eval(`${HERO} .cards`, el => el.getBoundingClientRect().bottom);
  await context.close(); // before asserting: a context left open keeps animating and starves the next test
  assert.ok(bottom <= h, `cards end at ${bottom}`);
});

test('reduced motion: the light holds still', async () => {
  const { context, page } = await home('', { reducedMotion: 'reduce' });
  const a = await page.$eval(`${HERO} .glass-card canvas`, c => c.toDataURL());
  await frames(page, 30);
  const b = await page.$eval(`${HERO} .glass-card canvas`, c => c.toDataURL());
  assert.equal(a, b);
  await context.close();
});

test('phone width: no sideways page scroll, the cards scroll in their own row', async () => {
  const { context, page, errors } = await home('', { width: 390, height: 844 });
  const row = await page.$eval(`${HERO} .cards`, r => r.scrollWidth - r.clientWidth);
  assert.ok(row > 0, 'the row holds more than one screen of cards');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(over <= 0, `page overflows by ${over}px`);
  assert.deepEqual(errors, []);
  await context.close();
});

test('H2: the name and one lit card, ANNA', async () => {
  const { context, page, errors } = await open('?v=h2');
  assert.ok(await page.isVisible('#name-h2'));
  assert.ok(!(await page.isVisible('#name-h3')));
  assert.equal(await page.textContent('.h2 .glass-card .title'), 'ANNA');
  const [s] = await spread(page, '.h2 .glass-card canvas');
  assert.ok(s > 40, `lit (${s})`);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the four cards fill the row: no gap after the last card', async () => {
  const { context, page } = await home();
  const gap = await page.evaluate((hero) => {
    const row = document.querySelector(`${hero} .cards`).getBoundingClientRect();
    const cards = [...document.querySelectorAll(`${hero} .glass-card`)].map(c => c.getBoundingClientRect());
    return row.right - cards.at(-1).right;
  }, HERO);
  await context.close();
  assert.ok(Math.abs(gap) < 1, `${gap}px left over`);
});

test('lab: four cards by default, five with ?cards=5, Finance Bot as 05', async () => {
  for (const [q, n] of [['', 4], ['?cards=5', 5]]) {
    const { context, page, errors } = await open(q);
    const vis = await page.$$eval('.h3 .cards li', lis => lis.filter(l => getComputedStyle(l).display !== 'none').map(l => [l.querySelector('.title').textContent, l.querySelector('.idx').textContent]));
    const bottom = await page.$eval('.h3 .cards', el => el.getBoundingClientRect().bottom);
    await context.close();
    assert.equal(vis.length, n, q);
    if (n === 5) assert.deepEqual(vis[4], ['Finance Bot', '05']);
    assert.ok(bottom <= 900, `${q}: cards end at ${bottom}`);
    assert.deepEqual(errors, []);
  }
});

test('lab: ?look=before draws the earlier lights and title weight', async () => {
  const shot = async q => {
    const { context, page } = await open(q);
    const url = await page.$eval('.h3 .cards .glass-card canvas', c => c.toDataURL());
    const w = await page.$eval('.h3 .glass-card .title', t => getComputedStyle(t).fontWeight);
    await context.close();
    return { url, w };
  };
  const now = await shot('?t=2'), before = await shot('?t=2&look=before');
  assert.notEqual(now.url, before.url);
  assert.equal(now.w, '680');
  assert.equal(before.w, '640');
});

test('the lab bar is hidden; ?lab=1 brings it back', async () => {
  for (const [q, shown] of [['', false], ['?lab=1', true]]) {
    const { context, page } = await open(q);
    const vis = await page.isVisible('nav.lab');
    await context.close();
    assert.equal(vis, shown, q || 'default');
  }
});

// Phones keep only a few WebGL contexts alive and drop the oldest: with one context per pane the
// first hero cards went blank once the lab added ANNA's stack and the terminal (2026-11-09).
test('every pane draws on a phone, however many panes the page has: one WebGL context in all', async () => {
  const { context, page, errors } = await open('?lab=1', { width: 390, height: 844 });
  const kinds = await page.$$eval('.glass-card[data-light] canvas', cs => cs.map(c => (c.getContext('2d') ? '2d' : 'other')));
  const spreads = await spread(page, '.h3 li:not(.bench) .glass-card canvas');
  await context.close();
  assert.ok(kinds.length >= 12, `the lab page has many panes (${kinds.length})`);
  assert.ok(kinds.every(k => k === '2d'), 'each pane shows a copy, not its own context');
  spreads.forEach((s, i) => assert.ok(s > 40, `hero card ${i + 1} is lit (${s})`));
  assert.deepEqual(errors, []);
});
