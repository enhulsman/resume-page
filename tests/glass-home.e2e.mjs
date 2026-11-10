// The stone homepage in a real browser (openspec stone-glass-homepage): the hero and its ribbed
// glass, the arrival gone, ANNA's section and its one frosted window (her conversation itself:
// tests/glass-anna-window.e2e.mjs), the rows of type, About with the terminal's frosted window (the
// terminal itself: tests/glass-terminal.e2e.mjs) and Contact.
// Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-home.e2e.mjs
// Every wait is on state (__glassReady, __glass.slow, animation frames), never a fixed sleep.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { glassCards, glassMoments, terminalReflection } from '../src/config/glass.ts';
import { homeSections, annaLead, annaCalls, annaLevels } from '../src/config/home.ts';
import { annaDemo } from '../src/config/anna-demo.ts';
import { timeline } from '../src/scripts/glass/anna-window-model.js';
import { coverer, strings, textsUnder } from './lib/copy.mjs';
import site from '../src/config/site.ts';
import { parseColor, contrast } from './lib/contrast.mjs';

const BASE = process.env.BASE || 'http://localhost:4321';
const CARDS = '[data-glass-moment="hero"] [data-glass="ribbed"]';
let browser;
before(async () => { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); });
after(async () => { await browser?.close(); });

/** Count every canvas that got a WebGL context, before any page script runs. */
function countGL() {
  const orig = HTMLCanvasElement.prototype.getContext;
  const gl = new Set();
  window.__glCanvases = gl;
  HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
    const ctx = orig.call(this, kind, ...rest);
    if (ctx && /webgl/i.test(kind)) gl.add(this);
    return ctx;
  };
}
/** A browser without WebGL: both getContext('webgl2') and getContext('webgl') give null. */
function noGL() {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
    return /webgl/i.test(kind) ? null : orig.call(this, kind, ...rest);
  };
}

async function open(q = '', { width = 1440, height = 900, reducedMotion = 'no-preference', init = [], ready = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  for (const s of init) await context.addInitScript(s);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${BASE}/${q}`, { waitUntil: 'load' });
  if (ready) await page.waitForFunction(() => window.__glassReady === true);
  return { context, page, errors };
}
/** Let the page render `n` more frames. */
const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
/** Each card's canvas as a data URL, in card order. */
const shots = (page) => page.$$eval(`${CARDS} canvas`, (cs) => cs.map((c) => c.toDataURL()));
/** How much each card's canvas varies: an unlit or blank canvas is flat. */
const spread = (page, sel = `${CARDS} canvas`) => page.$$eval(sel, (cs) => cs.map((c) => {
  const g = document.createElement('canvas'); g.width = 64; g.height = 78;
  const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 78);
  const d = x.getImageData(0, 0, 64, 78).data; let lo = 255, hi = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 250) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; lo = Math.min(lo, v); hi = Math.max(hi, v); }
  return hi - lo;
}));
const norm = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

test('hero content: the name, the intro line verbatim, four cards in order, each to its project page', async () => {
  const { context, page, errors } = await open();
  assert.equal(norm(await page.$eval('main h1', (h) => h.textContent)), site.name);
  assert.equal(norm(await page.$eval('main h1', (h) => h.innerText)), 'Ezra Hulsman');
  const hero = norm(await page.$eval('[data-glass-moment="hero"]', (s) => s.textContent));
  assert.ok(hero.includes('I build ANNA, an AI assistant in Microsoft Teams that does the admin no one should spend their day on.'), hero);
  assert.ok(hero.includes(norm(homeSections.intro)) && hero.includes(homeSections.role), 'the role and intro from config');
  const cards = await page.$$eval(CARDS, (as) => as.map((a) => [a.querySelector('.title').textContent, a.getAttribute('href'), a.querySelector('.idx')?.textContent]));
  assert.deepEqual(cards.map((c) => c[0]), ['ANNA', 'Henk', 'Homelab', 'Claude Sandbox']);
  assert.deepEqual(cards.map((c) => c[2]), ['01', '02', '03', '04']);
  assert.deepEqual(cards.map((c) => c[1]), glassCards.map((c) => c.href));
  for (const [, href] of cards) assert.match(href, /^\/projects\//);
  // the h1 is on two lines
  const lines = await page.$eval('main h1', (h) => Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)));
  assert.equal(lines, 2);
  await context.close();
  assert.deepEqual(errors, []);
});

test('the name is plain: no glare, nothing after it, nothing moving on it', async () => {
  const { context, page } = await open();
  const h = await page.$eval('main h1', (h) => ({
    glare: h.hasAttribute('data-glare'),
    after: getComputedStyle(h, '::after').content,
    anims: h.getAnimations({ subtree: true }).length,
  }));
  await context.close();
  assert.equal(h.glare, false);
  assert.ok(h.after === 'none' || h.after === 'normal', `::after content ${h.after}`);
  assert.equal(h.anims, 0);
});

test('screen reader reads the card: the first card\'s name holds "ANNA" and "In production"; every canvas is hidden', async () => {
  const { context, page } = await open();
  const snap = await page.locator(CARDS).first().ariaSnapshot();
  const hidden = await page.$$eval('canvas', (cs) => cs.map((c) => c.getAttribute('aria-hidden')));
  await context.close();
  const name = snap.match(/link "([^"]*)"/)?.[1] ?? '';
  assert.match(name, /ANNA/, snap);
  assert.match(name, /In production/, snap);
  assert.ok(hidden.length >= 4);
  assert.ok(hidden.every((v) => v === 'true'), `aria-hidden: ${hidden.join(', ')}`);
});

test('phone: the cards scroll sideways in their own row, the page never does', async () => {
  const { context, page, errors } = await open('', { width: 390, height: 844 });
  const r = await page.$eval('[data-glass-moment="hero"] .cards', (row) => {
    const before = row.scrollLeft;
    row.scrollLeft = row.scrollWidth; // to the end: a short scroll snaps back to the first card
    return { over: row.scrollWidth - row.clientWidth, ox: getComputedStyle(row).overflowX, moved: row.scrollLeft - before };
  });
  const page_ = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
  const boxes = await page.$$eval('main > *', (els) => els.map((e) => { const b = e.getBoundingClientRect(); return [b.left, b.right]; }));
  await context.close();
  assert.ok(r.over > 0, 'the row is wider than its box');
  assert.match(r.ox, /auto|scroll/);
  assert.ok(r.moved > 0, 'and it scrolls');
  assert.ok(page_.sw <= page_.w, `page is ${page_.sw - page_.w}px wider than the screen`);
  for (const [l, rt] of boxes) assert.ok(l >= -0.5 && rt <= 390.5, `a section spans ${l}..${rt}`);
  assert.deepEqual(errors, []);
});

test('reduced motion: every card holds one still frame', async () => {
  const { context, page } = await open('', { reducedMotion: 'reduce' });
  const a = await shots(page);
  await frames(page, 30);
  const b = await shots(page);
  await context.close();
  assert.equal(a.length, 4);
  a.forEach((x, i) => assert.equal(x, b[i], `card ${i + 1} moved`));
});

test('one WebGL context for every pane: at 390 x 844 there is one, and all four cards are lit', async () => {
  const { context, page, errors } = await open('', { width: 390, height: 844, init: [countGL] });
  const n = await page.evaluate(() => window.__glCanvases.size);
  const kinds = await page.$$eval(`${CARDS} canvas`, (cs) => cs.map((c) => (c.getContext('2d') ? '2d' : 'other')));
  const s = await spread(page);
  await context.close();
  assert.equal(n, 1, 'one WebGL context on the page');
  assert.deepEqual(kinds, ['2d', '2d', '2d', '2d'], 'each pane shows a copy');
  s.forEach((v, i) => assert.ok(v > 40, `card ${i + 1} is lit (${v})`));
  assert.deepEqual(errors, []);
});

test('off screen: the light redraws in view and stops out of view', async () => {
  const { context, page } = await open('?guard=off');
  // the hero's four cards come first in page order; the terminal's reflections, far below, wait
  const n = await page.$$eval(CARDS, (cs) => cs.length);
  const a = (await page.evaluate(() => window.__glass.draws)).slice(0, n);
  await frames(page, 30);
  const b = (await page.evaluate(() => window.__glass.draws)).slice(0, n);
  assert.equal(n, 4);
  a.forEach((x, i) => assert.ok(b[i] > x, `card ${i + 1} redrew in view (${x} → ${b[i]})`));
  // room below the hero, whatever the page holds yet, then scroll the cards out of view
  await page.evaluate(() => {
    const pad = document.body.appendChild(document.createElement('div'));
    pad.style.height = `${2 * innerHeight}px`;
    const row = document.querySelector('[data-glass-moment="hero"] .cards').getBoundingClientRect();
    scrollTo(0, scrollY + row.bottom + 40);
  });
  await page.waitForFunction(() => [...document.querySelectorAll('[data-glass-moment="hero"] [data-glass="ribbed"]')].every((c) => c.getBoundingClientRect().bottom < 0));
  await frames(page, 4); // the observer reports the change
  const c = await page.evaluate(() => window.__glass.draws);
  await frames(page, 30);
  const d = await page.evaluate(() => window.__glass.draws);
  await context.close();
  assert.deepEqual(d, c, 'no redraws out of view');
});

test('the guard is wired: 30 ms of extra draw work trips it, every pane holds the still frame', async () => {
  const { context, page } = await open('?busy=30');
  await page.waitForFunction(() => window.__glass.slow === true, null, { timeout: 60000 });
  const a = await shots(page);
  await frames(page, 30);
  const b = await shots(page);
  a.forEach((x, i) => assert.equal(x, b[i], `card ${i + 1} still moves`));
  // and it is the still frame: drawn at 2.4 s again, nothing changes
  await page.evaluate(() => window.__glass.at(2.4));
  const c = await shots(page);
  await context.close();
  a.forEach((x, i) => assert.equal(x, c[i], `card ${i + 1} is not the still frame`));
});

test('the guard is wired: with ?guard=off the same work never trips it, and the cards keep changing', async () => {
  const { context, page } = await open('?guard=off&busy=30');
  // 4 s of frames
  await page.evaluate(() => new Promise((done) => { const t0 = performance.now(); const f = () => (performance.now() - t0 > 4000 ? done() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  const slow = await page.evaluate(() => window.__glass.slow);
  const a = await shots(page);
  await frames(page, 5);
  const b = await shots(page);
  await context.close();
  assert.equal(slow, false);
  assert.ok(a.some((x, i) => x !== b[i]), 'the light still moves');
});

// The busy-work hook ships with the page (the e2e suite runs against the production build in CI),
// so it must never freeze a tab: only a small finite value counts, at both entry points.
test('?busy=Infinity freezes nothing: the page gets ready and keeps drawing frames', { timeout: 60000 }, async () => {
  const { context, page } = await open('?guard=off&busy=Infinity', { ready: false });
  try {
    await page.waitForFunction(() => window.__glassReady === true, null, { timeout: 20000 });
    const t0 = Date.now();
    await frames(page, 10);
    assert.ok(Date.now() - t0 < 15000, `ten frames took ${Date.now() - t0} ms`);
  } finally { await context.close(); }
});

test('__glass.busy takes only a small finite number of ms, and says what it took', { timeout: 60000 }, async () => {
  const { context, page } = await open('?guard=off');
  try {
    assert.equal(await page.evaluate(() => window.__glass.busy(Infinity)), 0, 'Infinity adds none');
    assert.equal(await page.evaluate(() => window.__glass.busy('abc')), 0, 'not a number adds none');
    assert.equal(await page.evaluate(() => window.__glass.busy(-10)), 0, 'a negative adds none');
    assert.equal(await page.evaluate(() => window.__glass.busy(30)), 30);
    assert.equal(await page.evaluate(() => window.__glass.busy(1e9)), 50, 'clamped to 50 ms a frame');
    const t0 = Date.now();
    await frames(page, 10);
    assert.ok(Date.now() - t0 < 15000, `ten frames took ${Date.now() - t0} ms`);
  } finally { await context.close(); }
});

test('no WebGL: no error, every card keeps its link and a soft gradient of its light', async () => {
  const { context, page, errors } = await open('', { init: [noGL] });
  const hrefs = await page.$$eval(CARDS, (as) => as.map((a) => a.getAttribute('href')));
  assert.deepEqual(hrefs, glassCards.map((c) => c.href));
  for (const h of hrefs) assert.match(h, /^\/projects\//);
  // the card's ground alone: its words and rim hidden, the middle of the card sampled
  await page.addStyleTag({ content: `${CARDS} > span { visibility: hidden !important; } ${CARDS}::after { display: none !important; }` });
  const cards = page.locator(CARDS);
  for (let i = 0; i < 4; i++) {
    const png = (await cards.nth(i).screenshot()).toString('base64');
    const v = await page.evaluate(async (b64) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const w = img.width, h = img.height;
      const d = x.getImageData(Math.round(w * 0.12), Math.round(h * 0.12), Math.round(w * 0.76), Math.round(h * 0.76)).data;
      let lo = 255, hi = 0;
      for (let k = 0; k < d.length; k += 4) { const l = (d[k] + d[k + 1] + d[k + 2]) / 3; lo = Math.min(lo, l); hi = Math.max(hi, l); }
      return hi - lo;
    }, png);
    assert.ok(v > 10, `card ${i + 1} background varies by ${v} levels`);
  }
  const lit = await page.$$eval(CARDS, (as) => as.filter((a) => a.classList.contains('lit')).length);
  await context.close();
  assert.equal(lit, 0, 'no card claims a light it cannot draw');
  assert.deepEqual(errors, []);
});

test('card text reads at 4.5:1 at 20 moments of the loop: title, index and readout on every card', async () => {
  const { context, page } = await open('?t=2.4');
  const worst = await page.evaluate((cardsSel) => {
    const parse = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
    const lin = (c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
    const cards = [...document.querySelectorAll(cardsSel)];
    const out = {};
    for (let k = 0; k < 20; k++) {
      const t = (10 * k) / 20;
      window.__glass.at(t);
      for (const [ci, card] of cards.entries()) {
        const cv = card.querySelector('canvas'), x = cv.getContext('2d');
        const cb = card.getBoundingClientRect(), sx = cv.width / cb.width, sy = cv.height / cb.height;
        for (const sel of ['.title', '.idx', '.readout']) {
          const el = card.querySelector(sel);
          const ink = parse(getComputedStyle(el).color);
          const r = el.getBoundingClientRect();
          const x0 = Math.max(0, Math.floor((r.left - cb.left) * sx)), y0 = Math.max(0, Math.floor((r.top - cb.top) * sy));
          const w = Math.max(1, Math.ceil(r.width * sx)), h = Math.max(1, Math.ceil(r.height * sy));
          const d = x.getImageData(x0, y0, w, h).data;
          let lo = Infinity;
          for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 250) lo = Math.min(lo, ratio(ink, [d[i], d[i + 1], d[i + 2]]));
          const key = `card ${ci + 1} ${sel}`;
          if (!(key in out) || lo < out[key].ratio) out[key] = { ratio: lo, t };
        }
      }
    }
    return out;
  }, CARDS);
  await context.close();
  assert.equal(Object.keys(worst).length, 12);
  for (const [k, { ratio, t }] of Object.entries(worst)) assert.ok(ratio >= 4.5, `${k}: ${ratio.toFixed(2)}:1 at t = ${t}`);
});

test('arrival: the hero shows in the first painted frame, no intro class ever, the body not clipped', async () => {
  const watch = () => {
    window.__sawIntro = false;
    // before any page script, and before <html> exists: watch the whole document for it
    const look = () => { if (document.documentElement?.classList.contains('intro')) window.__sawIntro = true; };
    look();
    new MutationObserver(look).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(() => {
      const h1 = document.querySelector('main h1');
      const shown = (el) => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (+s.opacity < 1 || s.visibility !== 'visible' || s.display === 'none') return false; } return true; };
      const r = h1?.getBoundingClientRect();
      const cards = [...document.querySelectorAll('[data-glass-moment="hero"] [data-glass="ribbed"]')];
      window.__first = {
        intro: document.documentElement.classList.contains('intro'),
        h1: !!h1 && shown(h1) && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth,
        cards: cards.length === 4 && cards.every((c) => shown(c) && c.getBoundingClientRect().top < innerHeight),
        transform: getComputedStyle(document.body).transform,
      };
    }));
  };
  const { context, page } = await open('', { init: [watch] });
  const first = await page.evaluate(() => window.__first);
  const after_ = await page.evaluate(() => {
    const b = getComputedStyle(document.body);
    return { saw: window.__sawIntro, oy: b.overflowY, h: document.body.getBoundingClientRect().height, sh: document.body.scrollHeight };
  });
  await context.close();
  assert.equal(first.intro, false);
  assert.equal(first.h1, true, 'the name is on screen in the first frame');
  assert.equal(first.cards, true, 'the cards are there in the first frame');
  assert.equal(first.transform, 'none', 'the page is not tilted');
  assert.equal(after_.saw, false, 'the document never got an intro class');
  assert.ok(!['hidden', 'clip'].includes(after_.oy), `body overflow ${after_.oy}`);
  assert.ok(after_.h >= after_.sh - 1, `the body holds all it has (${after_.h} of ${after_.sh})`);
});

// ---- ANNA's section (chunk 4) ----

const ANNA = '[data-glass-moment="anna"]';
/**
 * The end of ANNA's play: `?chat=${END}` holds her finished conversation, the same page her play
 * leaves (Ezra, 2026-11-11: held at done is done). Her play itself, in real time and to the end, is
 * tests/glass-anna-window.e2e.mjs's "plays once to the end". `?speed=10` plays the artefacts and the
 * terminal's intro ten times faster (src/scripts/glass/speed.js).
 */
const END = timeline({ lines: annaCalls.work.lines, reply: annaDemo.reply }).done;
/** Scroll ANNA's window into view and wait for her conversation to finish. */
async function annaDone(page) {
  await page.evaluate(() => document.querySelector('.anna-window .aw-window').scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => window.__annaWindow?.state().done === true, null, { timeout: 40000 });
}

test('ANNA is written in config only: every text in her section, the message names too, is covered by annaLead, annaCalls and annaDemo', async () => {
  const { context, page, errors } = await open(`?chat=${END}`);
  await annaDone(page);
  const texts = await page.evaluate(([fn, sel]) => new Function(`return (${fn})`)()(document.querySelector(sel)), [textsUnder.toString(), ANNA]);
  const names = await page.$$eval(`${ANNA} .msg .who`, (els) => [...new Set(els.map((e) => e.textContent))]);
  await context.close();
  assert.deepEqual(names.sort(), [annaDemo.who, annaLead.title].sort(), 'the message names');
  assert.ok(texts.length > 20, `${texts.length} texts read`);
  const check = coverer(strings(annaLead, annaCalls, annaDemo));
  const left = texts.map(check).filter(Boolean);
  assert.deepEqual(left, [], `typed into the markup: ${JSON.stringify(left)}`);
  assert.deepEqual(errors, []);
});

test('ANNA: no run line and no levels in her section, one glass object, a frosted window', async () => {
  const { context, page, errors } = await open();
  const s = await page.$eval(ANNA, (el) => ({
    text: el.textContent,
    glass: [...el.querySelectorAll('[data-glass]')].map((g) => g.dataset.glass),
    stagings: el.querySelectorAll('.anna-turn, .anna-journey, .anna-x, .slab').length,
  }));
  await context.close();
  for (const re of [/\bv\d+\.\d+/, /\breleases?\b/i, /\btests\b/i]) assert.doesNotMatch(s.text, re);
  for (const l of annaLevels) assert.ok(!s.text.includes(l.name), `level ${l.name}`);
  assert.deepEqual(s.glass, ['frosted']);
  assert.equal(s.stagings, 0);
  assert.deepEqual(errors, []);
});

test('the four levels are not on the homepage', async () => {
  const { context, page } = await open(`?chat=${END}`);
  await annaDone(page);
  const text = await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' '));
  await context.close();
  for (const l of annaLevels) {
    assert.ok(!text.includes(l.name), `name: ${l.name}`);
    assert.ok(!text.includes(l.text), `text: ${l.text}`);
  }
});

test('the four levels live on /projects: ANNA\'s plate shows each name with its text, in order', async () => {
  const { context, page, errors } = await open('projects', { ready: false });
  const levels = await page.$$eval('.anna-plate .plate-levels li', (lis) => lis.map((li) => [li.querySelector('b').textContent, li.querySelector('span').textContent]));
  await context.close();
  assert.deepEqual(levels, annaLevels.map((l) => [l.name, l.text]));
  assert.deepEqual(errors, []);
});

test('the page matches the list: the hero, ANNA, the terminal; every canvas and every blur in main inside a moment', async () => {
  const { context, page, errors } = await open();
  const r = await page.evaluate(() => {
    const main = document.querySelector('main');
    const moments = [...main.querySelectorAll('[data-glass-moment]')].map((m) => m.dataset.glassMoment);
    const loose = [...main.querySelectorAll('*')]
      .filter((el) => el.tagName === 'CANVAS' || getComputedStyle(el).backdropFilter !== 'none')
      .filter((el) => !el.closest('[data-glass-moment]'))
      .map((el) => el.tagName + (el.className ? `.${String(el.className).split(' ').join('.')}` : ''));
    return { moments, loose };
  });
  await context.close();
  assert.deepEqual(r.moments, glassMoments);
  assert.deepEqual(r.loose, []);
  assert.deepEqual(errors, []);
});

const WINDOWS = ['anna', 'henk', 'sandbox', 'bible', 'terminal'];
for (const moment of WINDOWS) {
  test(`something behind every window (${moment}): a glow beneath it, and the area it covers is not flat stone`, async () => {
    const W = `[data-glass-moment="${moment}"] [data-glass="frosted"]`;
    const { context, page, errors } = await open('?t=2.4');
    const win = page.locator(W);
    await page.$eval(W, (w) => w.scrollIntoView({ block: 'center' }));
    await frames(page, 2);
    const under = await page.$eval(W, (w) => {
      const glow = w.parentElement.querySelector(':scope > [data-glow]');
      if (!glow) return null;
      const a = w.getBoundingClientRect(), b = glow.getBoundingClientRect();
      const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return {
        hidden: glow.getAttribute('aria-hidden'),
        before: !!(glow.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING),
        z: [+getComputedStyle(glow).zIndex, +getComputedStyle(w).zIndex],
        cover: (ix * iy) / (a.width * a.height),
      };
    });
    assert.ok(under, 'a [data-glow] beside the window, in its stage');
    assert.equal(under.hidden, 'true');
    assert.ok(under.before && under.z[0] < under.z[1], `painted beneath it (z ${under.z})`);
    assert.ok(under.cover > 0.6, `it lies behind most of the window (${under.cover.toFixed(2)})`);
    // the window's box, then the window hidden: what is left there is what it frosts
    const clip = await win.boundingBox();
    await page.addStyleTag({ content: `${W} { visibility: hidden !important; }` });
    await frames(page, 2);
    const png = (await page.screenshot({ clip })).toString('base64');
    const spread_ = await page.evaluate(async (b64) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, img.width, img.height).data;
      let out = 0;
      for (let ch = 0; ch < 3; ch++) { let lo = 255, hi = 0; for (let k = ch; k < d.length; k += 4) { lo = Math.min(lo, d[k]); hi = Math.max(hi, d[k]); } out = Math.max(out, hi - lo); }
      return out;
    }, png);
    await context.close();
    assert.ok(spread_ > 20, `the covered area varies by ${spread_} levels`);
    assert.deepEqual(errors, []);
  });
}

// ---- Projects, Experience, Writing (chunk 5): type on stone ----

import { readFileSync, readdirSync } from 'node:fs';
import * as homeConfig from '../src/config/home.ts';
import * as resumeConfig from '../src/config/resume.ts';
import { byRecency } from '../src/lib/experience.ts';
import { buildProjects, homeRows } from '../src/lib/projects.ts';
import { latestEntries } from '../src/lib/frontmatter.ts';

const sourcesIn = (dir) => {
  const url = new URL(`../${dir}`, import.meta.url);
  return Object.fromEntries(readdirSync(url).filter((f) => f.endsWith('.mdx')).map((f) => [`${dir}${f}`, readFileSync(new URL(f, url), 'utf8')]));
};
const joined = buildProjects(sourcesIn('src/pages/projects/'));
const ROWS = homeRows(joined.details, joined.register, glassCards.map((c) => c.id));
const POSTS = latestEntries(sourcesIn('src/pages/blog/'));
const SECTION = { projects: 'section[aria-labelledby="projects-h"]', experience: 'section[aria-labelledby="experience-h"]', writing: 'section[aria-labelledby="writing-h"]', contact: 'section[aria-labelledby="contact-h"]' };
const ABOUT = 'section[aria-labelledby="about-h"]';

test('the sections in order: ANNA, Projects, Experience, Writing, About, Contact, each heading from config', async () => {
  const { context, page, errors } = await open();
  const h2s = await page.$$eval('main h2', (hs) => hs.map((h) => h.textContent.trim()));
  await context.close();
  assert.deepEqual(h2s, [annaLead.title, homeSections.headings.projects, homeSections.headings.experience, homeSections.headings.writing, homeSections.headings.about, homeSections.headings.contact]);
  assert.deepEqual(h2s, ['ANNA', 'Projects', 'Experience', 'Writing', 'About', 'Contact']);
  assert.deepEqual(errors, []);
});

/** The Projects section's chapters and rows, in page order, as their words. */
const ENTRY_ORDER = ['henk', 'sandbox', 'bible', 'homelab', 'finance', 'pytaiga', null];
const byId = (id) => (id ? homeConfig.details.find((d) => d.id === id) : homeConfig.register.find((r) => r.title === 'Encrypted Chat TUI'));
const rowOf = (id) => ROWS.find((r) => r.href === byId(id).href);

test('the projects, in order: Henk, Claude Sandbox and bible-tui in their windows, then Homelab, Finance Bot, pytaiga-mcp and Encrypted Chat TUI as rows', async () => {
  const { context, page, errors } = await open();
  const entries = await page.$$eval(`${SECTION.projects} .pj-entry`, (els) => els.map((el) => ({
    chapter: el.classList.contains('pj-chapter'),
    moment: el.closest('[data-glass-moment]')?.dataset.glassMoment ?? null,
    title: el.querySelector('.title')?.textContent.trim(),
    href: el.querySelector('.title a')?.getAttribute('href'),
    idx: el.querySelector('.idx')?.textContent.trim() || null,
    what: el.querySelector('.what')?.textContent.trim(),
    status: el.querySelector('.since')?.textContent.trim(),
  })));
  const more = await page.$eval(`${SECTION.projects} a.more`, (a) => [a.getAttribute('href'), a.textContent.replace(/→/, '').trim()]);
  await context.close();
  assert.deepEqual(entries.map((e) => e.title), ENTRY_ORDER.map((id) => byId(id).title));
  assert.deepEqual(entries.map((e) => e.chapter), [true, true, true, false, false, false, false], 'three chapters, then rows');
  assert.deepEqual(entries.map((e) => e.moment), ['henk', 'sandbox', 'bible', null, null, null, null], 'each chapter its own glass moment');
  assert.deepEqual(entries.map((e) => e.idx), ['02', '04', null, '03', null, null, null], 'the card projects keep their card\'s index');
  assert.ok(!entries.some((e) => e.title === 'This site' || e.title === annaLead.title));
  for (const [i, e] of entries.entries()) {
    const r = rowOf(ENTRY_ORDER[i]);
    assert.equal(e.href, r.href);
    assert.equal(e.what, r.what);
    assert.equal(e.status, r.status);
  }
  assert.deepEqual(more, ['/projects', homeSections.links.projects]);
  assert.deepEqual(errors, []);
});

test('the number is the project\'s: set large in tabular figures, its label beside it; the register\'s entry has none', async () => {
  const { context, page, errors } = await open();
  const rows = await page.$$eval(`${SECTION.projects} .pj-entry`, (lis) => lis.map((li) => {
    const v = li.querySelector('.num .value'), l = li.querySelector('.num .label'), w = li.querySelector('.what');
    if (!v) return { title: li.querySelector('.title').textContent.trim(), value: null };
    const vs = getComputedStyle(v), vb = v.getBoundingClientRect(), lb = l.getBoundingClientRect();
    return {
      title: li.querySelector('.title').textContent.trim(),
      value: v.textContent.trim(), label: l.textContent.trim(),
      tabular: vs.fontVariantNumeric, size: parseFloat(vs.fontSize), whatSize: parseFloat(getComputedStyle(w).fontSize),
      beside: lb.left >= vb.right - 1 && lb.top < vb.bottom,
    };
  }));
  await context.close();
  assert.deepEqual(rows.map((r) => r.value), ['4', '3,700', '102', '4', '0.75', '50 → 5', null]);
  for (const [i, r] of rows.entries()) {
    if (!r.value) continue;
    const d = byId(ENTRY_ORDER[i]);
    assert.equal(r.value, d.dims[d.homeDim ?? 0].value, r.title);
    assert.equal(r.label, d.dims[d.homeDim ?? 0].label, r.title);
    assert.match(r.tabular, /tabular-nums/, `${r.title}: tabular figures`);
    assert.ok(r.size >= 2 * r.whatSize, `${r.title}: set large (${r.size}px against ${r.whatSize}px)`);
    assert.ok(r.beside, `${r.title}: the label beside the number`);
  }
  assert.deepEqual(errors, []);
});

test('Experience: one row per résumé entry, newest first, years, role and company, hairline rules, a link to /resume', async () => {
  const { context, page, errors } = await open();
  const rows = await page.$$eval(`${SECTION.experience} li.row`, (lis) => lis.map((li) => ({
    years: li.querySelector('.years').textContent.replace(/\s+/g, ''),
    role: li.querySelector('.job').textContent.trim(),
    client: li.querySelector('.client').textContent.trim(),
    rule: [getComputedStyle(li).borderTopWidth, getComputedStyle(li).borderTopStyle],
  })));
  const more = await page.$eval(`${SECTION.experience} a.more`, (a) => [a.getAttribute('href'), a.textContent.replace(/→/, '').trim()]);
  await context.close();
  assert.equal(rows.length, resumeConfig.experience.length);
  // newest first (Ezra, 2026-11-10): the jobs that run to now lead, then by end year, then by start year
  const ordered = byRecency(resumeConfig.experience);
  const nowRows = rows.map((r) => r.years.endsWith(homeSections.now));
  assert.deepEqual(nowRows, [...nowRows].sort((a, b) => b - a), `every current job above every job that ended: ${rows.map((r) => r.years)}`);
  const ends = rows.filter((r, i) => !nowRows[i]).map((r) => +r.years.slice(-4));
  assert.deepEqual(ends, [...ends].sort((a, b) => b - a), `end years descending: ${ends}`);
  assert.equal(rows[0].role, 'Forward Deployed Engineer');
  assert.ok(rows.findIndex((r) => r.role === 'Pega DevOps Engineer') < rows.findIndex((r) => r.role === 'DevOps Engineer'), 'Pega DevOps Engineer (2023 to now) above DevOps Engineer (2023 to 2024)');
  for (const [i, e] of ordered.entries()) {
    assert.equal(rows[i].role, e.role);
    assert.equal(rows[i].client, e.client);
    assert.ok(rows[i].years.startsWith(e.startDate), `${e.role}: ${rows[i].years}`);
    assert.ok(rows[i].years.endsWith(e.endDate ?? homeSections.now), `${e.role}: ${rows[i].years}`);
    assert.ok(parseFloat(rows[i].rule[0]) > 0 && parseFloat(rows[i].rule[0]) <= 1.5 && rows[i].rule[1] === 'solid', `a hairline above ${e.role}: ${rows[i].rule}`);
  }
  assert.deepEqual(more, ['/resume', homeSections.links.resume]);
  assert.deepEqual(errors, []);
});

test('Writing: the five newest posts, each with its date and one line, then a link to /blog', async () => {
  const { context, page, errors } = await open();
  const posts = await page.$$eval(`${SECTION.writing} li.row`, (lis) => lis.map((li) => ({
    title: li.querySelector('.title').textContent.trim(),
    href: li.querySelector('a').getAttribute('href'),
    label: li.querySelector('time').textContent.trim(),
    iso: li.querySelector('time').getAttribute('datetime'),
    line: li.querySelector('.line').textContent.trim(),
  })));
  const more = await page.$eval(`${SECTION.writing} a.more`, (a) => [a.getAttribute('href'), a.textContent.replace(/→/, '').trim()]);
  await context.close();
  assert.equal(posts.length, Math.min(5, POSTS.length));
  assert.deepEqual(posts, POSTS.map((p) => ({ title: p.title, href: p.href, label: p.label, iso: p.iso, line: p.line })));
  assert.deepEqual(more, ['/blog', homeSections.links.writing]);
  assert.deepEqual(errors, []);
});

test('Projects, Experience, Writing and Contact are written in config only', async () => {
  const { context, page, errors } = await open();
  const texts = await page.evaluate(([fn, sels]) => sels.flatMap((s) => new Function(`return (${fn})`)()(document.querySelector(s))), [textsUnder.toString(), Object.values(SECTION)]);
  await context.close();
  assert.ok(texts.length > 30, `${texts.length} texts read`);
  const check = coverer(strings(homeConfig, resumeConfig, site, joined.details, joined.register, POSTS));
  const left = texts.map(check).filter(Boolean);
  assert.deepEqual(left, [], `typed into the markup: ${JSON.stringify(left)}`);
  assert.deepEqual(errors, []);
});

test('no glass anywhere else: the bar, Projects\' rows, Experience, Writing and Contact hold no canvas, no glass, no blur', async () => {
  const { context, page, errors } = await open();
  const found = await page.evaluate((sels) => sels.map((s) => {
    const root = document.querySelector(s);
    if (!root) return [s, 'missing'];
    const bad = [root, ...root.querySelectorAll('*')].filter((el) => el.tagName === 'CANVAS' || el.hasAttribute('data-glass') || getComputedStyle(el).backdropFilter !== 'none');
    return [s, bad.map((el) => el.tagName)];
  }), ['header.bar', `${SECTION.projects} .pj-rows`, SECTION.experience, SECTION.writing, SECTION.contact]);
  // in Projects, every glass object lies inside one of its three chapters
  const loose = await page.$$eval(`${SECTION.projects} *`, (els) => els.filter((el) => (el.tagName === 'CANVAS' || el.hasAttribute('data-glass') || getComputedStyle(el).backdropFilter !== 'none') && !el.closest('[data-glass-moment]')).length);
  await context.close();
  for (const [s, bad] of found) assert.deepEqual(bad, [], s);
  assert.equal(loose, 0, 'Projects\' glass is all in its chapters');
  assert.deepEqual(errors, []);
});

test('no colour panels in Projects, Experience, Writing, Contact and About outside its window: every ground is stone, ink or nothing', async () => {
  const { context, page, errors } = await open();
  const panels = await page.evaluate((sels) => sels.flatMap((s) => [document.querySelector(s), ...document.querySelectorAll(`${s} *`)].filter((el) => !el.closest('[data-glass-moment], [data-glow]')).map((el) => {
    const b = el.getBoundingClientRect();
    return { sel: `${s} ${el.tagName}.${el.className}`, bg: getComputedStyle(el).backgroundColor, img: getComputedStyle(el).backgroundImage, w: b.width, h: b.height };
  })), [...Object.values(SECTION), ABOUT]);
  const ink = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--stone-ink').trim());
  await context.close();
  const ok = (bg) => { const c = parseColor(bg); return c && (c[3] === 0 || [parseColor('#EEEAE3'), parseColor(ink)].some((k) => k.slice(0, 3).every((v, j) => Math.abs(v - c[j]) < 1))); };
  const bad = panels.filter((p) => p.w >= 32 && p.h >= 32 && (!ok(p.bg) || p.img !== 'none'));
  assert.deepEqual(bad, []);
  assert.deepEqual(errors, []);
});

test('phone: Projects, Experience, Writing, About and Contact stay within the screen, the page never scrolls sideways', async () => {
  const { context, page, errors } = await open('', { width: 390, height: 844 });
  for (const s of [...Object.values(SECTION), ABOUT]) {
    await page.$eval(s, (el) => el.scrollIntoView({ block: 'start' }));
    const r = await page.$eval(s, (el) => {
      // a window's glow reaches past its sides by design; the section clips it, so it never scrolls
      const boxes = [el, ...el.querySelectorAll('*')].filter((e) => !e.closest('[data-glow]')).map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0);
      return { l: Math.min(...boxes.map((b) => b.left)), r: Math.max(...boxes.map((b) => b.right)), sw: document.documentElement.scrollWidth, w: innerWidth };
    });
    assert.ok(r.l >= -0.5 && r.r <= 390.5, `${s} spans ${r.l}..${r.r}`);
    assert.ok(r.sw <= r.w, `${s}: the page is ${r.sw - r.w}px wider than the screen`);
  }
  await context.close();
  assert.deepEqual(errors, []);
});

// ---- About and Contact (chunk 6): the terminal's frosted window, then the address ----


const CONTACT = SECTION.contact;
const TERM = '[data-glass-moment="terminal"]';
const TERM_BODY = `${TERM} [data-glass="frosted"] .term-body`;
/** Scroll the terminal into view and wait for its intro to finish (its first input line). */
async function termReady(page) {
  await page.$eval(`${TERM} [data-glass="frosted"]`, (w) => w.scrollIntoView({ block: 'center' }));
  await page.waitForFunction((sel) => document.querySelector(`${sel} .terminal-input-line`), TERM_BODY, { timeout: 90000 });
}
/** Type a command into the terminal and wait for its next input line. */
async function termRun(page, cmd) {
  const box = await page.locator(TERM_BODY).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 30);
  const n0 = await page.$eval(TERM_BODY, (b) => b.children.length);
  await page.keyboard.type(cmd, { delay: 15 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(([sel, n0, cmd]) => {
    const b = document.querySelector(sel), last = b.lastElementChild;
    return b.children.length > n0 && last.classList.contains('terminal-input-line') && !last.textContent.trim().endsWith(cmd);
  }, [TERM_BODY, n0, cmd], { timeout: 20000 });
}

test('About: every note, one plain photo with its alt from config, and one frosted window holding the terminal', async () => {
  const { context, page, errors } = await open();
  const a = await page.$eval(ABOUT, (s) => ({
    text: s.textContent.replace(/\s+/g, ' '),
    imgs: [...s.querySelectorAll('img')].map((i) => ({ alt: i.getAttribute('alt'), glass: !!i.closest('[data-glass]'), filter: getComputedStyle(i).filter, clip: getComputedStyle(i).clipPath })),
    windows: [...s.querySelectorAll('[data-glass="frosted"]')].map((w) => ({ terminal: !!w.querySelector('#terminal-body'), moment: w.closest('[data-glass-moment]')?.dataset.glassMoment })),
  }));
  await context.close();
  for (const n of homeConfig.notes) assert.ok(a.text.includes(n.replace(/\s+/g, ' ')), `note: ${n}`);
  assert.equal(a.imgs.length, 1, 'one photo');
  assert.equal(a.imgs[0].alt, homeSections.photoAlt);
  assert.deepEqual([a.imgs[0].glass, a.imgs[0].filter, a.imgs[0].clip], [false, 'none', 'none'], 'a plain image');
  assert.deepEqual(a.windows, [{ terminal: true, moment: 'terminal' }]);
  assert.deepEqual(errors, []);
});

test('Contact: the address is the largest text, a mailto link; then the contact page, LinkedIn and GitHub', async () => {
  const { context, page, errors } = await open();
  const c = await page.$eval(CONTACT, (s) => {
    const sized = [...s.querySelectorAll('*')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const big = sized.map((e) => ({ text: e.textContent.trim(), size: parseFloat(getComputedStyle(e).fontSize) })).sort((x, y) => y.size - x.size);
    return {
      big,
      mail: [...s.querySelectorAll('a[href^="mailto:"]')].map((a) => [a.getAttribute('href'), a.textContent.trim(), parseFloat(getComputedStyle(a).fontSize)]),
      links: [...s.querySelectorAll('a:not([href^="mailto:"])')].map((a) => [a.getAttribute('href'), a.textContent.replace(/→/, '').trim()]),
    };
  });
  await context.close();
  assert.deepEqual(c.mail.map((m) => m.slice(0, 2)), [[`mailto:${site.social.email}`, site.social.email]]);
  assert.equal(c.big[0].text, site.social.email, `largest: ${JSON.stringify(c.big.slice(0, 2))}`);
  assert.ok(c.big[0].size > c.big[1].size, 'larger than everything else, the heading too');
  assert.deepEqual(c.links, [
    ['/contact', homeSections.contact.message],
    [site.social.LinkedIn, homeSections.contact.linkedin],
    [site.social.GitHub, homeSections.contact.github],
  ]);
  assert.deepEqual(errors, []);
});

test('no contact strip: Contact holds no canvas, no glass and no blur', async () => {
  const { context, page } = await open();
  const bad = await page.$eval(CONTACT, (s) => [s, ...s.querySelectorAll('*')]
    .filter((el) => el.tagName === 'CANVAS' || el.hasAttribute('data-glass') || getComputedStyle(el).backdropFilter !== 'none')
    .map((el) => el.tagName));
  await context.close();
  assert.deepEqual(bad, []);
});

test('About is written in config only (the terminal\'s own output aside)', async () => {
  const { context, page, errors } = await open('?speed=10');
  await termReady(page);
  const texts = await page.evaluate(([fn, sel]) => new Function(`return (${fn})`)()(document.querySelector(sel), '.term-body'), [textsUnder.toString(), ABOUT]);
  await context.close();
  assert.ok(texts.length >= homeConfig.notes.length + 3, `${texts.length} texts read`);
  const check = coverer(strings(homeConfig, site));
  const left = texts.map(check).filter(Boolean);
  assert.deepEqual(left, [], `typed into the markup: ${JSON.stringify(left)}`);
  assert.deepEqual(errors, []);
});

test('one WebGL context for every pane: at 390 x 844 there is one, and every pane is lit, the reflections too', async () => {
  const { context, page, errors } = await open('', { width: 390, height: 844, init: [countGL] });
  const n = await page.evaluate(() => window.__glCanvases.size);
  const panes = await page.$$eval('[data-glass="ribbed"]', (ps) => ps.map((p) => ({ moment: p.closest('[data-glass-moment]')?.dataset.glassMoment, lit: p.classList.contains('lit') })));
  const s = await spread(page, '[data-glass="ribbed"] canvas');
  await context.close();
  assert.equal(n, 1, 'one WebGL context on the page');
  assert.deepEqual(panes.map((p) => p.moment), [...Array(4).fill('hero'), ...Array(terminalReflection.panes.length).fill('terminal')]);
  assert.ok(panes.every((p) => p.lit), 'every pane is lit');
  s.forEach((v, i) => assert.ok(v > 40, `pane ${i + 1} is lit (${v})`));
  assert.deepEqual(errors, []);
});

/**
 * In the page: every text element in one window that lies wholly in view (and inside its scroll
 * box), with its own colour; then that window's text made transparent and the screen captured;
 * each element's lowest contrast against the pixels behind it.
 */
async function windowContrast(page, moment, sels) {
  const W = `[data-glass-moment="${moment}"] [data-glass="frosted"]`;
  const items = await page.evaluate(([W, sels]) => {
    const w = document.querySelector(W), wb = w.getBoundingClientRect();
    return sels.flatMap((sel) => [...w.querySelectorAll(sel)].map((el) => {
      const r = el.getBoundingClientRect();
      const clip = el.closest('.term-body')?.getBoundingClientRect() ?? wb;
      const inside = r.width > 0 && r.height > 0 && el.textContent.trim()
        && r.top >= Math.max(0, clip.top, wb.top) && r.bottom <= Math.min(innerHeight, clip.bottom, wb.bottom);
      return inside ? { sel, color: getComputedStyle(el).color, box: { x: r.x, y: r.y, w: r.width, h: r.height } } : null;
    }).filter(Boolean));
  }, [W, sels]);
  const tag = await page.addStyleTag({ content: `${W}, ${W} * { color: transparent !important; text-shadow: none !important; } ${W} .aw-dot { visibility: hidden !important; } ${W} .terminal-cursor { visibility: hidden !important; }` });
  await frames(page, 2);
  const png = (await page.screenshot()).toString('base64');
  await tag.evaluate((t) => t.remove());
  return page.evaluate(async ([png, items]) => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return items.map(({ sel, color, box }) => {
      const [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
      const d = x.getImageData(Math.round(box.x), Math.round(box.y), Math.max(1, Math.round(box.w)), Math.max(1, Math.round(box.h))).data;
      let min = 99;
      for (let i = 0; i < d.length; i += 16) {
        const bg = [d[i], d[i + 1], d[i + 2]];
        const fg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
        const [hi, lo] = [L(bg), L(fg)].sort((p, q) => q - p);
        min = Math.min(min, (hi + 0.05) / (lo + 0.05));
      }
      return { sel, color, ratio: +min.toFixed(2) };
    });
  }, [png, items]);
}

/** Scroll the projects' windows into view one by one and wait until every artefact has landed. */
async function artefactsDone(page) {
  for (const id of homeConfig.projectChapters) {
    await page.$eval(`[data-glass-moment="${id}"] [data-glass="frosted"]`, (w) => w.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction((id) => document.querySelector(`[data-glass-moment="${id}"] [data-play]`)?.classList.contains('done'), id, { timeout: 20000 });
  }
}

test('window text reads at 4.5:1, measured: every window, its title, ANNA\'s work line, the artefacts, the terminal\'s prompt, dim text and errors after ls, the grain on', async () => {
  const { context, page, errors } = await open(`?t=2.4&chat=${END}&speed=10`);
  await annaDone(page);
  await frames(page, 4);
  const anna = await windowContrast(page, 'anna', ['.glass-title', '.aw-replay', '.msg .who', '.msg .text', '.aw-work-t']);
  await artefactsDone(page);
  const projects = [];
  for (const id of homeConfig.projectChapters) {
    await page.$eval(`[data-glass-moment="${id}"] [data-glass="frosted"]`, (w) => w.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await frames(page, 4);
    projects.push(...(await windowContrast(page, id, ['.glass-title', '.pw-text', '.pw-quiet', '.pw-strong', '.pw-me'])).map((w) => ({ ...w, id })));
  }
  // the terminal: help (its dim descriptions), a command it does not know (an error), then ls
  await termReady(page);
  for (const cmd of ['help', 'nosuchcommand', 'ls']) await termRun(page, cmd);
  await page.$eval(`${TERM} [data-glass="frosted"]`, (w) => w.scrollIntoView({ block: 'center' }));
  await frames(page, 4);
  const term = await windowContrast(page, 'terminal', ['.glass-title', '.terminal-user', '.terminal-separator', '.terminal-path', '.terminal-dollar', '.terminal-cmd', '.terminal-accent', '.terminal-dim', '.terminal-error', '.term-body > div']);
  await context.close();
  const all = [...anna, ...projects, ...term];
  const seen = (list, sel) => list.filter((w) => w.sel === sel);
  for (const sel of ['.glass-title', '.aw-work-t', '.msg .who']) assert.ok(seen(anna, sel).length, `ANNA's window: ${sel} measured`);
  for (const id of homeConfig.projectChapters) for (const sel of ['.glass-title', '.pw-text', '.pw-quiet']) assert.ok(projects.some((w) => w.id === id && w.sel === sel), `${id}'s window: ${sel} measured`);
  for (const sel of ['.glass-title', '.terminal-user', '.terminal-dollar', '.terminal-dim', '.terminal-error', '.terminal-accent']) assert.ok(seen(term, sel).length, `the terminal: ${sel} measured`);
  // the window titles are the one shared quiet ink (the 0.55 and 0.66 alpha inks are gone)
  for (const t of all.filter((w) => w.sel === '.glass-title')) {
    assert.equal(parseColor(t.color)[3], 1, `title ink is opaque: ${t.color}`);
    assert.ok(t.ratio >= 4.5, `title: ${t.ratio}:1`);
  }
  const low = all.filter((w) => w.ratio < 4.5);
  assert.deepEqual(low, [], JSON.stringify(low));
  assert.deepEqual(errors, []);
});

test('a window\'s glow has no edge: a line through the middle of each window, with the windows hidden', async () => {
  const { context, page, errors } = await open('?t=2.4');
  await page.addStyleTag({ content: '[data-glass="frosted"] { visibility: hidden !important; }' });
  const worst = {};
  for (const moment of WINDOWS) {
    const W = `[data-glass-moment="${moment}"] [data-glass="frosted"]`;
    await page.$eval(W, (w) => w.scrollIntoView({ block: 'center' }));
    await frames(page, 2);
    const b = await page.$eval(W, (w) => { const r = w.getBoundingClientRect(); return { x: Math.ceil(r.left), y: Math.round(r.top + r.height / 2), w: Math.floor(r.width) }; });
    const png = (await page.screenshot({ clip: { x: b.x, y: b.y, width: b.w, height: 1 } })).toString('base64');
    worst[moment] = await page.evaluate(async (b64) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, img.width, 1).data;
      let jump = 0, lo = 255, hi = 0;
      for (let i = 4; i < d.length; i += 4) for (let ch = 0; ch < 3; ch++) jump = Math.max(jump, Math.abs(d[i + ch] - d[i - 4 + ch]));
      for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; lo = Math.min(lo, v); hi = Math.max(hi, v); }
      return { jump, spread: hi - lo, n: img.width };
    }, png);
  }
  await context.close();
  for (const [m, w] of Object.entries(worst)) {
    assert.ok(w.n > 100, `${m}: a line ${w.n}px long`);
    assert.ok(w.spread > 5, `${m}: the line crosses the glow (${w.spread} levels)`);
    assert.ok(w.jump <= 6, `${m}: neighbouring pixels differ by ${w.jump} levels`);
  }
  assert.deepEqual(errors, []);
});

test('no WebGL: every window still shows its content; the reflections keep their soft ground', async () => {
  const { context, page, errors } = await open(`?chat=${END}&speed=10`, { init: [noGL] });
  await annaDone(page);
  const anna = await page.$eval('[data-glass-moment="anna"] [data-glass="frosted"]', (w) => ({
    shown: getComputedStyle(w).visibility === 'visible' && w.getBoundingClientRect().height > 100,
    title: w.querySelector('.glass-title').textContent,
    beats: [...w.querySelectorAll('[data-beat]')].every((b) => b.classList.contains('on')),
  }));
  await artefactsDone(page);
  const projects = await page.$$eval('[data-glass-moment] .pj-window', (ws) => ws.map((w) => ({ shown: getComputedStyle(w).visibility === 'visible' && w.getBoundingClientRect().height > 100, done: w.querySelector('[data-play]').classList.contains('done') })));
  assert.equal(projects.length, 3);
  await termReady(page);
  const term = await page.$eval(`${TERM} [data-glass="frosted"]`, (w) => ({
    shown: getComputedStyle(w).visibility === 'visible' && w.getBoundingClientRect().height > 100,
    title: w.querySelector('.glass-title').textContent,
    cmds: w.querySelectorAll('.term-body .text-theme-primary').length,
    minis: [...w.querySelectorAll('[data-glass="ribbed"]')].map((p) => ({ lit: p.classList.contains('lit'), bg: getComputedStyle(p).backgroundImage })),
  }));
  await context.close();
  assert.deepEqual(anna, { shown: true, title: annaCalls.window, beats: true });
  for (const p of projects) assert.deepEqual(p, { shown: true, done: true }, 'a project window');
  assert.equal(term.shown, true);
  assert.equal(term.title, homeSections.terminalTitle);
  assert.ok(term.cmds >= 6, `the intro typed (${term.cmds} commands)`);
  assert.equal(term.minis.length, terminalReflection.panes.length);
  for (const m of term.minis) { assert.equal(m.lit, false); assert.match(m.bg, /radial-gradient/); }
  assert.deepEqual(errors, []);
});

// ---- the whole page (chunk 7): every section together ----

import * as glassConfig from '../src/config/glass.ts';
import { diaryEntries, readFrontmatter } from '../src/lib/frontmatter.ts';
import { pageFacts } from '../src/lib/projects.ts';

const SIZES = [[1440, 900], [1280, 720], [390, 844]];
/** In the page: each moment's glass box in viewport coordinates, the union of its [data-glass]. */
const glassBoxesFn = () => [...document.querySelectorAll('[data-glass-moment]')].map((m) => {
  const rs = [...m.querySelectorAll('[data-glass]')].map((g) => g.getBoundingClientRect());
  return { id: m.dataset.glassMoment, top: Math.min(...rs.map((r) => r.top)), bottom: Math.max(...rs.map((r) => r.bottom)) };
});
/** Both windows played: ANNA's conversation at done, the terminal's intro finished and its hint gone. */
async function bothPlayed(page) {
  await annaDone(page);
  await termReady(page);
  await page.waitForFunction(() => !document.querySelector('.terminal-hint'), null, { timeout: 10000 });
}

test('the kinds: four ribbed cards in the hero, one frosted window for ANNA and each project, one for the terminal with its ribbed reflections hidden from readers', async () => {
  const { context, page, errors } = await open();
  const kinds = await page.$$eval('[data-glass-moment]', (ms) => ms.map((m) => {
    const own = [...m.querySelectorAll('[data-glass]')].filter((g) => !g.parentElement.closest('[data-glass]'));
    const inner = [...m.querySelectorAll('[data-glass] [data-glass]')];
    return {
      id: m.dataset.glassMoment,
      own: own.map((g) => g.dataset.glass),
      inner: inner.map((g) => ({ kind: g.dataset.glass, hidden: !!g.closest('[aria-hidden="true"]') })),
    };
  }));
  await context.close();
  assert.deepEqual(kinds.map((k) => [k.id, k.own]), [['hero', ['ribbed', 'ribbed', 'ribbed', 'ribbed']], ['anna', ['frosted']], ['henk', ['frosted']], ['sandbox', ['frosted']], ['bible', ['frosted']], ['terminal', ['frosted']]]);
  for (const k of kinds.slice(0, 5)) assert.deepEqual(k.inner, [], k.id);
  assert.deepEqual(kinds[5].inner, Array(terminalReflection.panes.length).fill({ kind: 'ribbed', hidden: true }), 'the reflection minis inside the terminal\'s window');
  assert.deepEqual(errors, []);
});

test('no glass anywhere else on the whole page: every canvas, glass object and blur, bar and footer included, lies inside a moment in main', async () => {
  const { context, page, errors } = await open();
  const r = await page.evaluate(() => ({
    loose: [...document.body.querySelectorAll('*')]
      .filter((el) => el.tagName === 'CANVAS' || el.hasAttribute('data-glass') || getComputedStyle(el).backdropFilter !== 'none')
      .filter((el) => !el.closest('main [data-glass-moment]'))
      .map((el) => el.tagName + (el.className && typeof el.className === 'string' ? `.${el.className.split(' ').join('.')}` : '')),
    outside: [...document.querySelectorAll('[data-glass-moment]')].filter((m) => !m.closest('main')).length,
  }));
  await context.close();
  assert.deepEqual(r.loose, []);
  assert.equal(r.outside, 0);
  assert.deepEqual(errors, []);
});

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`no colour panels on the whole page at ${width} x ${height}: outside the glass and its glows, every ground is stone, ink or nothing`, async () => {
    const { context, page, errors } = await open(`?chat=${END}&speed=10`, { width, height });
    await bothPlayed(page);
    const all = await page.evaluate(() => [...document.body.querySelectorAll('*')].filter((el) => !el.closest('[data-glass-moment], [data-glow]')).map((el) => {
      const b = el.getBoundingClientRect(), s = getComputedStyle(el);
      return { el: `${el.tagName}.${typeof el.className === 'string' ? el.className : ''}`, bg: s.backgroundColor, img: s.backgroundImage, w: b.width, h: b.height };
    }));
    const ink = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--stone-ink').trim());
    await context.close();
    assert.ok(all.length > 150, `${all.length} elements read`);
    const ok = (bg) => { const c = parseColor(bg); return c && (c[3] === 0 || [parseColor('#EEEAE3'), parseColor(ink)].some((k) => k.slice(0, 3).every((v, j) => Math.abs(v - c[j]) < 1))); };
    const bad = all.filter((p) => p.w >= 32 && p.h >= 32 && (!ok(p.bg) || p.img !== 'none'));
    assert.deepEqual(bad, []);
    assert.deepEqual(errors, []);
  });
}

test('the rendered page is all config: every text, alt, title and aria-label in main and the footer (the terminal\'s own output aside)', async () => {
  const { context, page, errors } = await open(`?chat=${END}&speed=10`);
  await bothPlayed(page);
  const texts = await page.evaluate((fn) => {
    const under = new Function(`return (${fn})`)();
    return [...under(document.querySelector('main'), '.term-body'), ...under(document.querySelector('footer'), '.term-body')];
  }, textsUnder.toString());
  await context.close();
  const projectSrc = sourcesIn('src/pages/projects/');
  const blogSrc = sourcesIn('src/pages/blog/');
  const corpus = strings(
    homeConfig, resumeConfig, site, glassConfig, { annaDemo },
    Object.values(projectSrc).map(readFrontmatter), Object.values(blogSrc).map(readFrontmatter),
    buildProjects(projectSrc), diaryEntries(blogSrc), Object.values(projectSrc).map(pageFacts),
  );
  assert.ok(texts.length > 120, `${texts.length} texts read`);
  const check = coverer(corpus);
  const left = texts.map(check).filter(Boolean);
  assert.deepEqual(left, [], `typed into the markup: ${JSON.stringify(left)}`);
  assert.deepEqual(errors, []);
});

test('reduced motion from the start: the hero, ANNA\'s window and the terminal each hold still for 30 frames; her conversation and the intro are whole', async () => {
  const { context, page, errors } = await open('', { reducedMotion: 'reduce' });
  const still = {};
  for (const [name, sel] of [['hero', CARDS], ['anna', '[data-glass-moment="anna"] [data-glass="frosted"]'], ['terminal', `${TERM} [data-glass="frosted"]`]]) {
    await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    if (name === 'anna') await page.waitForFunction(() => window.__annaWindow?.state().done === true, null, { timeout: 20000 });
    if (name === 'terminal') {
      await page.waitForFunction((b) => document.querySelector(`${b} .terminal-input-line`), TERM_BODY, { timeout: 20000 });
      await page.waitForFunction(() => !document.querySelector('.terminal-hint'), null, { timeout: 10000 });
    }
    await frames(page, 2);
    const a = await page.screenshot();
    await frames(page, 30);
    const b = await page.screenshot();
    still[name] = a.equals(b);
  }
  const anna = await page.$$eval('.anna-window [data-beat]', (els) => els.map((e) => +getComputedStyle(e).opacity));
  const lines = await page.$$eval('[data-play] .b', (els) => els.map((e) => +getComputedStyle(e).opacity));
  assert.ok(lines.length > 10 && lines.every((o) => o === 1), `every artefact line shown at once: ${lines}`);
  const term = await page.$eval(TERM_BODY, (b) => ({
    cmds: [...b.querySelectorAll('.text-theme-primary')].map((e) => e.textContent),
    intro: JSON.parse(b.dataset.lines).filter((l) => l.type === 'cmd').map((l) => l.text),
    input: !!b.querySelector('.terminal-input-line'),
  }));
  await context.close();
  assert.deepEqual(still, { hero: true, anna: true, terminal: true });
  assert.ok(anna.length > 3 && anna.every((o) => o === 1), `every beat shown: ${anna}`);
  assert.deepEqual(term.cmds, term.intro, 'the whole intro');
  assert.equal(term.input, true, 'an input line');
  assert.deepEqual(errors, []);
});

test('no running animations with reduced motion: after load, and after the page has been scrolled to its end', async () => {
  const { context, page, errors } = await open('', { reducedMotion: 'reduce' });
  const running = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').map((a) => `${a.constructor.name} ${a.animationName ?? a.transitionProperty ?? ''} on ${a.effect?.target?.tagName}.${a.effect?.target?.className}`));
  await frames(page, 2);
  const atLoad = await running();
  await bothPlayed(page);
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await frames(page, 4);
  const atEnd = await running();
  await context.close();
  assert.deepEqual(atLoad, [], 'after load');
  assert.deepEqual(atEnd, [], 'after scrolling to the end');
  assert.deepEqual(errors, []);
});

test('phone width over the whole page: at 390 x 844, in steps of half a screen, before and after play, nothing wider than the screen', async () => {
  const { context, page, errors } = await open('?speed=10', { width: 390, height: 844 });
  const walk = () => page.evaluate(async () => {
    const next = () => new Promise((r) => requestAnimationFrame(() => r()));
    const max = document.documentElement.scrollHeight - innerHeight, out = [];
    for (let y = 0; ; y = Math.min(max, y + innerHeight / 2)) {
      scrollTo({ top: y, behavior: 'instant' });
      await next();
      const sections = [...document.querySelectorAll('main > section')].map((s) => { const r = s.getBoundingClientRect(); return [s.className, Math.round(r.left * 10) / 10, Math.round(r.right * 10) / 10]; });
      const bad = sections.filter(([, l, r]) => l < -0.5 || r > 390.5);
      out.push({ y, sw: document.documentElement.scrollWidth, w: innerWidth, n: sections.length, bad });
      if (y >= max) break;
    }
    return out;
  });
  const first = await walk();
  await bothPlayed(page);
  const second = await walk();
  await context.close();
  for (const [when, steps] of [['on load', first], ['after play', second]]) {
    assert.ok(steps.length > 8, `${when}: ${steps.length} steps`);
    assert.ok(steps.every((s) => s.n === 7), `${when}: seven sections`);
    const wide = steps.filter((s) => s.sw > s.w || s.bad.length);
    assert.deepEqual(wide, [], `${when}: wider than the screen`);
  }
  assert.deepEqual(errors, []);
});

// ---- Sketch round 2 decisions (2026-11-11): glass wherever it holds something, the projects'
// windows, the pointer as a light, grain in the frost ----

test('every glass object holds something: each ribbed pane lit, each frosted window with words and a glow beneath', async () => {
  const { context, page, errors } = await open('?t=2.4');
  const r = await page.evaluate(() => ({
    ribbed: [...document.querySelectorAll('[data-glass="ribbed"]')].map((p) => p.classList.contains('lit')),
    frosted: [...document.querySelectorAll('[data-glass="frosted"]')].map((w) => ({
      moment: w.closest('[data-glass-moment]')?.dataset.glassMoment,
      words: w.textContent.replace(/\s+/g, ' ').trim().length,
      glow: !!w.parentElement.querySelector(':scope > [data-glow]'),
    })),
  }));
  await context.close();
  assert.ok(r.ribbed.length >= 4 && r.ribbed.every(Boolean), `every ribbed pane lit: ${r.ribbed}`);
  assert.deepEqual(r.frosted.map((w) => w.moment), ['anna', 'henk', 'sandbox', 'bible', 'terminal']);
  for (const w of r.frosted) assert.ok(w.words > 20 && w.glow, `${w.moment}: ${JSON.stringify(w)}`);
  assert.deepEqual(errors, []);
});

for (const [width, height] of SIZES) {
  test(`no glass is faded or hidden on scroll at ${width} x ${height}; two moments may share a screen`, async () => {
    const { context, page, errors } = await open('', { width, height });
    const steps = await page.evaluate(async () => {
      const next = () => new Promise((r) => requestAnimationFrame(() => r()));
      const max = document.documentElement.scrollHeight - innerHeight, out = [];
      for (let y = 0; ; y = Math.min(max, y + innerHeight / 10)) {
        scrollTo({ top: y, behavior: 'instant' });
        await next();
        const glass = [...document.querySelectorAll('[data-glass]')].filter((g) => !g.closest('[aria-hidden="true"]')).map((g) => {
          const r = g.getBoundingClientRect(), cs = getComputedStyle(g);
          return { m: g.closest('[data-glass-moment]').dataset.glassMoment, onScreen: r.bottom > 0 && r.top < innerHeight, whole: r.top >= 0 && r.bottom <= innerHeight, op: +cs.opacity, vis: cs.visibility };
        });
        out.push({ y, faded: glass.filter((g) => g.onScreen && (g.op < 1 || g.vis !== 'visible')), wholeProjects: glass.filter((g) => g.whole && ['henk', 'sandbox', 'bible'].includes(g.m)).length });
        if (y >= max) break;
      }
      return out;
    });
    await context.close();
    assert.ok(steps.length > 20, `${steps.length} steps`);
    assert.deepEqual(steps.filter((s) => s.faded.length), [], 'glass faded or hidden on screen');
    if (width === 1440) assert.ok(steps.some((s) => s.wholeProjects >= 2), 'two project windows on one screen, as one group');
    assert.deepEqual(errors, []);
  });
}

/** The chapters' and rows' boxes in page coordinates: text and window together for a chapter. */
const projectBoxes = (page) => page.$$eval(`${SECTION.projects} .pj-chapter, ${SECTION.projects} .pj-rows`, (els) => els.map((el) => {
  const r = el.getBoundingClientRect();
  return { id: el.dataset.glassMoment ?? 'rows', left: r.left, right: r.right, top: r.top + scrollY, bottom: r.bottom + scrollY };
}));

for (const [width, height] of [[1440, 900], [1280, 720]]) {
  test(`two offset columns at ${width} x ${height}: Henk and bible-tui left, Claude Sandbox right and lower, the rows under it`, async () => {
    const { context, page, errors } = await open('', { width, height });
    const b = Object.fromEntries((await projectBoxes(page)).map((x) => [x.id, x]));
    await context.close();
    assert.ok(b.henk.right <= b.sandbox.left && b.bible.right <= b.sandbox.left, 'Henk and bible-tui in the left column');
    assert.ok(Math.abs(b.henk.left - b.bible.left) < 1, 'one column');
    assert.ok(Math.abs(b.sandbox.left - b.rows.left) < 1, 'the sandbox and the rows share the right column');
    assert.ok(b.sandbox.top >= b.henk.top + 120, `the sandbox starts lower (${Math.round(b.sandbox.top - b.henk.top)}px)`);
    assert.ok(b.bible.top > b.henk.bottom && b.rows.top > b.sandbox.bottom, 'each under the one before');
    assert.ok(b.bible.top - b.henk.bottom <= 120, `stone between Henk and bible-tui: ${Math.round(b.bible.top - b.henk.bottom)}px`);
    assert.ok(b.rows.top - b.sandbox.bottom <= 120, `stone between the sandbox and the rows: ${Math.round(b.rows.top - b.sandbox.bottom)}px`);
    assert.deepEqual(errors, []);
  });
}

test('tight chapters on a phone: one column in page order, at most 96 px of stone between chapters, within the screen', async () => {
  const { context, page, errors } = await open('', { width: 390, height: 844 });
  const list = await projectBoxes(page);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await context.close();
  assert.deepEqual(list.map((x) => x.id), ['henk', 'sandbox', 'bible', 'rows']);
  for (let i = 1; i < list.length; i++) {
    assert.ok(list[i].top > list[i - 1].bottom, `${list[i].id} under ${list[i - 1].id}`);
    if (i < 3) assert.ok(list[i].top - list[i - 1].bottom <= 96, `${list[i].id}: ${Math.round(list[i].top - list[i - 1].bottom)}px of stone`);
  }
  for (const x of list) assert.ok(x.left >= -0.5 && x.right <= 390.5, `${x.id}: ${x.left}..${x.right}`);
  assert.ok(over <= 0, `${over}px sideways`);
  assert.deepEqual(errors, []);
});

test('each chapter holds its artefact, every word from projectWindows', async () => {
  const { context, page, errors } = await open('?speed=10');
  await artefactsDone(page);
  const w = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.pj-chapter')].map((c) => [c.dataset.glassMoment, {
    windows: c.querySelectorAll('[data-glass="frosted"]').length,
    title: c.querySelector('.glass-title').textContent.trim(),
    text: c.querySelector('[data-play]').textContent.replace(/\s+/g, ' ').trim(),
  }])));
  const texts = await page.evaluate((fn) => new Function(`return (${fn})`)()(document.querySelector('section[aria-labelledby="projects-h"]')), textsUnder.toString());
  await context.close();
  const pw = homeConfig.projectWindows;
  const n = (x) => x.replace(/\s+/g, ' ').trim();
  for (const id of homeConfig.projectChapters) {
    assert.equal(w[id].windows, 1, id);
    assert.equal(w[id].title, pw[id].title, id);
  }
  for (const s of [pw.henk.alert.from, pw.henk.alert.text, ...pw.henk.messages.map((m) => m.text)]) assert.ok(w.henk.text.includes(n(s)), `Henk: ${s}`);
  for (const s of [pw.sandbox.command, ...pw.sandbox.lines.map((l) => l.value), pw.sandbox.risk.score, ...pw.sandbox.risk.why]) assert.ok(w.sandbox.text.includes(n(s)), `sandbox: ${s}`);
  for (const s of [pw.bible.book, pw.bible.translation, ...pw.bible.verses, pw.bible.keys]) assert.ok(w.bible.text.includes(n(s)), `bible: ${s}`);
  const left = texts.map(coverer(strings(homeConfig, site, joined.details, joined.register))).filter(Boolean);
  assert.deepEqual(left, [], `typed into the markup: ${JSON.stringify(left)}`);
  assert.deepEqual(errors, []);
});

test('the artefacts land once: hidden out of view, all shown once well in view, and not again', async () => {
  const { context, page, errors } = await open('?speed=10');
  const before = await page.$$eval('[data-play]', (ps) => ps.map((p) => [...p.querySelectorAll('.b')].filter((b) => +getComputedStyle(b).opacity > 0).length));
  assert.deepEqual(before, [0, 0, 0], 'nothing shown before they are in view');
  await artefactsDone(page);
  const after = await page.$$eval('[data-play]', (ps) => ps.map((p) => [...p.querySelectorAll('.b')].every((b) => b.classList.contains('on'))));
  assert.deepEqual(after, [true, true, true]);
  await page.evaluate(() => scrollTo(0, 0));
  await frames(page, 4);
  await page.$eval('[data-glass-moment="henk"] [data-play]', (p) => p.scrollIntoView({ block: 'center' }));
  await frames(page, 4);
  assert.ok(await page.$eval('[data-glass-moment="henk"] [data-play]', (p) => [...p.querySelectorAll('.b')].every((b) => b.classList.contains('on'))), 'still all shown, not replayed');
  await context.close();
  assert.deepEqual(errors, []);
});

test('without JavaScript every artefact shows whole', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  const ops = await page.$$eval('[data-play] .b', (els) => els.map((e) => +getComputedStyle(e).opacity));
  await context.close();
  assert.ok(ops.length > 10 && ops.every((o) => o === 1), `${ops}`);
});

test('the pointer is a light: a mouse on Henk\'s card brings its light nearer, ANNA\'s leans toward it; gone when the mouse leaves', async () => {
  const { context, page, errors } = await open('?guard=off');
  const box = await page.locator(CARDS).nth(1).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await page.waitForFunction(() => window.__glass.lean[1].near > 0.9 && window.__glass.lean[0].x > 5, null, { timeout: 10000 }).catch(() => {});
  const on = await page.evaluate(() => window.__glass.lean);
  assert.ok(on[1].near > 0.9, `Henk's light nearer: ${JSON.stringify(on[1])}`);
  assert.ok(on[0].x > 5, `ANNA's light leans right, toward the pointer: ${JSON.stringify(on[0])}`);
  // the mouse leaves the page
  await page.mouse.move(box.x + box.width / 2, -20);
  await page.dispatchEvent('html', 'pointerleave');
  await page.waitForFunction(() => window.__glass.lean.every((l) => Math.abs(l.x) < 0.5 && Math.abs(l.y) < 0.5 && l.near < 0.05), null, { timeout: 10000 }).catch(() => {});
  const off = await page.evaluate(() => window.__glass.lean);
  await context.close();
  assert.ok(off.every((l) => Math.abs(l.x) < 0.5 && Math.abs(l.y) < 0.5 && l.near < 0.05), `back to rest: ${JSON.stringify(off)}`);
  assert.deepEqual(errors, []);
});

test('a phone is unaffected: tapping a card leans no light, and the sheen stays put', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?guard=off`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__glassReady === true);
  await page.evaluate(() => document.querySelector('[data-glass-moment="hero"] .cards').addEventListener('click', (e) => e.preventDefault(), true));
  const box = await page.locator(CARDS).first().boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await frames(page, 30);
  const lean = await page.evaluate(() => window.__glass.lean);
  const sheen = await page.$eval('[data-glass-moment="anna"] [data-glass="frosted"]', (w) => [w.style.getPropertyValue('--sx'), w.style.getPropertyValue('--sy')]);
  await context.close();
  assert.ok(lean.every((l) => l.x === 0 && l.y === 0 && l.near === 0), JSON.stringify(lean));
  assert.deepEqual(sheen, ['', ''], 'the sheen is where it rests');
  assert.deepEqual(errors, []);
});

test('reduced motion: the mouse leans no light and the card holds its still frame', async () => {
  const { context, page, errors } = await open('', { reducedMotion: 'reduce' });
  const a = await shots(page);
  const box = await page.locator(CARDS).nth(1).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await frames(page, 30);
  const b = await shots(page);
  const lean = await page.evaluate(() => window.__glass.lean);
  await context.close();
  assert.ok(lean.every((l) => l.x === 0 && l.y === 0 && l.near === 0), JSON.stringify(lean));
  assert.deepEqual(a, b, 'the cards did not change');
  assert.deepEqual(errors, []);
});

test('the sheen follows the mouse over a frosted window', async () => {
  const { context, page, errors } = await open();
  const W = '[data-glass-moment="anna"] [data-glass="frosted"]';
  await page.$eval(W, (w) => w.scrollIntoView({ block: 'center' }));
  const b = await page.locator(W).boundingBox();
  await page.mouse.move(b.x + b.width * 0.25, b.y + b.height * 0.6, { steps: 3 });
  await page.waitForFunction((W) => document.querySelector(W).style.getPropertyValue('--sx') !== '', W, { timeout: 5000 }).catch(() => {});
  const v = await page.$eval(W, (w) => [w.style.getPropertyValue('--sx'), w.style.getPropertyValue('--sy')].map(parseFloat));
  await context.close();
  assert.ok(Math.abs(v[0] - 25) <= 2 && Math.abs(v[1] - 60) <= 2, `the sheen at ${v}`);
  assert.deepEqual(errors, []);
});

test('grain in the frost: every frosted window carries noise under its text; the stone carries none', async () => {
  const { context, page, errors } = await open();
  const r = await page.evaluate(() => ({
    windows: [...document.querySelectorAll('[data-glass="frosted"]')].map((w) => {
      const a = getComputedStyle(w, '::after');
      const kids = [...w.children].map((k) => +getComputedStyle(k).zIndex).filter((z) => !Number.isNaN(z));
      return { noise: /feTurbulence/.test(a.backgroundImage), z: +a.zIndex, under: kids.length > 0 && kids.some((z) => z > +a.zIndex), events: a.pointerEvents };
    }),
    stone: [...document.body.querySelectorAll('*')].filter((el) => !el.closest('[data-glass="frosted"]'))
      .filter((el) => /feTurbulence/.test(getComputedStyle(el).backgroundImage) || /feTurbulence/.test(getComputedStyle(el, '::before').backgroundImage) || /feTurbulence/.test(getComputedStyle(el, '::after').backgroundImage))
      .map((el) => el.tagName + '.' + el.className),
  }));
  await context.close();
  assert.equal(r.windows.length, 5);
  for (const w of r.windows) assert.deepEqual([w.noise, w.under, w.events], [true, true, 'none'], JSON.stringify(w));
  assert.deepEqual(r.stone, []);
  assert.deepEqual(errors, []);
});

test('with JavaScript on but the artefacts\' script never loading, every artefact still shows after load', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.route('**/*', (r) => (r.request().resourceType() === 'script' ? r.abort() : r.continue()));
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => [...document.querySelectorAll('[data-play] .b')].every((e) => +getComputedStyle(e).opacity === 1), null, { timeout: 10000 }).catch(() => {});
  const ops = await page.$$eval('[data-play] .b', (els) => els.map((e) => +getComputedStyle(e).opacity));
  await context.close();
  assert.ok(ops.length > 10 && ops.every((o) => o === 1), `${ops}`);
});
