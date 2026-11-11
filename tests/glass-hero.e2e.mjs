// The glass hero in a real browser, on the homepage (`/`), where it shipped (openspec
// stone-glass-homepage, chunk 2). The fit to one screen runs since chunk 3, when the
// drawing-sheet frame and bar left and the stone bar took their place. Needs a running site:
//   BASE=http://localhost:4399 node --test tests/glass-hero.e2e.mjs
//
// Lanes (tests/lib/glass-page.mjs): this file holds the light still with ?t=2.4, or loads with
// reduced motion, and runs beside the other files; the arrival, the loop, the name's light and the
// mouse over it are in tests/glass-hero.live.e2e.mjs, which runs alone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useBrowser, SWIFTSHADER } from './lib/browser.mjs';
import { opener, heroOpener, heroState, cardLayers, near, arrived, frames, spread } from './lib/glass-page.mjs';
import { terminalReflection } from '../src/config/glass.ts';

const pw = useBrowser({ args: SWIFTSHADER });
const home = opener(pw);
const hero = heroOpener(home);
const HERO = '[data-glass-moment="hero"]';

test('H3: the name is real text, four cards link to their pages, every card is lit', async () => {
  const { context, page, errors } = await home('?t=2.4');
  await arrived(page);
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
  const { context, page } = await home('?t=2.4', { width: w, height: h });
  await page.evaluate(() => document.fonts.ready);
  const { top, bottom } = await page.$eval(`${HERO} .cards`, el => el.getBoundingClientRect());
  await context.close(); // before asserting: a context left open keeps animating and starves the next test
  // the larger name (sketch round 3): on a 720 px screen the row starts on it, 90% of it inside
  if (h === 720) assert.ok(top < h && (h - top) / (bottom - top) >= 0.9, `cards ${top}..${bottom}`);
  else assert.ok(bottom <= h, `cards end at ${bottom}`);
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
  const { context, page, errors } = await home('?t=2.4', { width: 390, height: 844 });
  const row = await page.$eval(`${HERO} .cards`, r => r.scrollWidth - r.clientWidth);
  assert.ok(row > 0, 'the row holds more than one screen of cards');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(over <= 0, `page overflows by ${over}px`);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the four cards fill the row: no gap after the last card', async () => {
  const { context, page } = await home('?t=2.4');
  const gap = await page.evaluate((hero) => {
    const row = document.querySelector(`${hero} .cards`).getBoundingClientRect();
    const cards = [...document.querySelectorAll(`${hero} .glass-card`)].map(c => c.getBoundingClientRect());
    return row.right - cards.at(-1).right;
  }, HERO);
  await context.close();
  assert.ok(Math.abs(gap) < 1, `${gap}px left over`);
});

// Phones keep only a few WebGL contexts alive and drop the oldest: with one context per pane the
// first hero cards went blank once the lab added ANNA's stack and the terminal (2026-11-09). The
// homepage has the four cards and the terminal's reflection minis.
test('every pane draws on a phone, however many panes the page has: one WebGL context in all', async () => {
  const { context, page, errors } = await home('?t=2.4', { width: 390, height: 844 });
  await arrived(page);
  const kinds = await page.$$eval('.glass-card[data-light] canvas', cs => cs.map(c => (c.getContext('2d') ? '2d' : 'other')));
  const spreads = await spread(page, `${HERO} .glass-card canvas`);
  await context.close();
  assert.ok(kinds.length >= 4 + terminalReflection.panes.length, `the homepage has the cards and the reflections (${kinds.length})`);
  assert.ok(kinds.every(k => k === '2d'), 'each pane shows a copy, not its own context');
  spreads.forEach((s, i) => assert.ok(s > 40, `hero card ${i + 1} is lit (${s})`));
  assert.deepEqual(errors, []);
});

// ---- the arrival and the name's light (stone-homepage: "The hero arrives and the cards' light
// reaches the name", sketch round 3, 2026-11-11). `?at=` holds one moment of the arrival; `?t=`
// freezes the light (no arrival). window.__hero: t (the arrival's clock, s), arrived, lt (the
// light's loop time at the last paint), spill (per card), layers (what lights the name). ----

test('phone: each card\'s hue sits on the name at its live position, a swipe moves it; stronger than on a desktop', async () => {
  const desk = await hero('?t=2.4');
  const d = await heroState(desk.page);
  await desk.context.close();
  const { context, page, errors } = await hero('?t=2.4', { width: 390, height: 844 });
  const before = await heroState(page);
  const moved = await page.$eval(`${HERO} .cards`, (row) => {
    const henk = row.querySelectorAll(':scope > li')[1];
    const from = row.scrollLeft;
    row.style.scrollSnapType = 'none';
    row.scrollLeft = henk.offsetLeft - row.firstElementChild.offsetLeft;
    return row.scrollLeft - from;
  });
  await frames(page, 4);
  const after_ = await heroState(page);
  await context.close();
  assert.deepEqual(errors, []);
  assert.ok(moved > 200, `the row scrolled (${moved})`);
  const L = (s, i) => cardLayers(s).find((l) => l.i === i);
  assert.ok(L(before, 0), 'ANNA lights the name before the swipe');
  assert.ok(!L(before, 2), 'a card out of view throws no light');
  // ANNA's light went left with her card, Henk's came in at his
  const annaAfter = L(after_, 0);
  if (annaAfter) assert.ok(near(annaAfter.x, L(before, 0).x - moved, 2), `ANNA's light followed her card: ${L(before, 0).x} -> ${annaAfter.x}`);
  const henk = L(after_, 1);
  assert.ok(henk, 'Henk lights the name after the swipe');
  const hc = after_.cards[1];
  assert.ok(near(henk.x, hc.left + hc.width / 2 - after_.name.left, 1), 'at his card\'s centre');
  assert.ok(henk.a > (L(before, 1)?.a ?? 0), 'more of Henk in view, more of his light');
  assert.ok(L(before, 0).a > L(d, 0).a * 1.2, `stronger than at 1440: ${L(before, 0).a} vs ${L(d, 0).a}`);
});


for (const [w, h, size] of [[1440, 900, 233], [1280, 800, 207], [1000, 800, 150], [390, 844, 88]]) test(`the name at ${w} x ${h}: ${size} px, clear of the intro and the cards`, async () => {
  const { context, page, errors } = await home('?t=2.4', { width: w, height: h });
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => {
    const box = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
    // the name's box, as wide as its widest line of text
    const h1 = document.querySelector('#hero-name');
    const range = document.createRange(); range.selectNodeContents(h1);
    const name = box(h1);
    name.r = Math.max(name.r, ...[...range.getClientRects()].map((b) => b.right));
    return {
      size: parseFloat(getComputedStyle(h1).fontSize),
      name: [name],
      intro: box(document.querySelector('.hero-intro')),
      cards: box(document.querySelector('[data-glass-moment="hero"] .cards')),
      over: document.documentElement.scrollWidth - innerWidth,
    };
  });
  await context.close();
  const hits = (a, b) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
  assert.ok(near(r.size, size, 1), `the name is ${r.size}px`);
  for (const line of r.name) {
    assert.ok(!hits(line, r.intro), `the name meets the intro: ${JSON.stringify(line)} ${JSON.stringify(r.intro)}`);
    assert.ok(!hits(line, r.cards), 'the name meets the cards');
  }
  assert.ok(!hits(r.intro, r.cards), 'the intro meets the cards');
  assert.ok(r.cards.t < h, `the cards start on the first screen (${r.cards.t})`);
  assert.ok(r.over <= 0, `${r.over}px of sideways scroll`);
  assert.deepEqual(errors, []);
});
