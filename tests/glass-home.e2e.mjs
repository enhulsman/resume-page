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
import { glassCards, glassMoments } from '../src/config/glass.ts';
import { homeSections, annaLead, annaCalls, annaLevels } from '../src/config/home.ts';
import { annaDemo } from '../src/config/anna-demo.ts';
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
/** Scroll ANNA's window into view and wait for her conversation to finish. */
async function annaDone(page) {
  await page.evaluate(() => document.querySelector('.anna-window .aw-window').scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => window.__annaWindow?.state().done === true, null, { timeout: 40000 });
}

test('ANNA is written in config only: every text in her section, the message names too, is covered by annaLead, annaCalls and annaDemo', async () => {
  const { context, page, errors } = await open();
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
  const { context, page } = await open();
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

for (const moment of ['anna', 'terminal']) {
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

test('the rows: Henk, Homelab and Claude Sandbox first with 02 to 04, then the rest; each links to its page with its line and status', async () => {
  const { context, page, errors } = await open();
  const rows = await page.$$eval(`${SECTION.projects} li.row`, (lis) => lis.map((li) => ({
    title: li.querySelector('.title')?.textContent.trim(),
    href: li.querySelector('a')?.getAttribute('href'),
    idx: li.querySelector('.idx')?.textContent.trim() || null,
    what: li.querySelector('.what')?.textContent.trim(),
    status: li.querySelector('.since')?.textContent.trim(),
  })));
  const more = await page.$eval(`${SECTION.projects} a.more`, (a) => [a.getAttribute('href'), a.textContent.replace(/→/, '').trim()]);
  await context.close();
  assert.deepEqual(rows.map((r) => r.title), [
    homeConfig.details.find((d) => d.id === 'henk').title, homeConfig.details.find((d) => d.id === 'homelab').title, homeConfig.details.find((d) => d.id === 'sandbox').title,
    'Finance Bot', 'bible-tui', 'pytaiga-mcp', 'Encrypted Chat TUI',
  ]);
  assert.deepEqual(rows.slice(0, 3).map((r) => r.idx), ['02', '03', '04']);
  assert.ok(rows.slice(3).every((r) => r.idx === null), 'only the card projects carry an index');
  assert.ok(!rows.some((r) => r.title === 'This site' || r.title === annaLead.title));
  for (const [i, r] of rows.entries()) {
    assert.equal(r.href, ROWS[i].href);
    assert.equal(r.what, ROWS[i].what);
    assert.equal(r.status, ROWS[i].status);
  }
  assert.deepEqual(more, ['/projects', homeSections.links.projects]);
  assert.deepEqual(errors, []);
});

test('the number is the project\'s: set large in tabular figures, its label beside it; the register\'s entry has none', async () => {
  const { context, page, errors } = await open();
  const rows = await page.$$eval(`${SECTION.projects} li.row`, (lis) => lis.map((li) => {
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
  assert.deepEqual(rows.map((r) => r.value), ['4', '4', '3,700', '0.75', '102', '50 → 5', null]);
  for (const [i, r] of rows.entries()) {
    if (!r.value) continue;
    const d = homeConfig.details.find((x) => x.href === ROWS[i].href);
    assert.equal(r.value, d.dims[d.homeDim ?? 0].value, r.title);
    assert.equal(r.label, d.dims[d.homeDim ?? 0].label, r.title);
    assert.match(r.tabular, /tabular-nums/, `${r.title}: tabular figures`);
    assert.ok(r.size >= 2 * r.whatSize, `${r.title}: set large (${r.size}px against ${r.whatSize}px)`);
    assert.ok(r.beside, `${r.title}: the label beside the number`);
  }
  assert.deepEqual(errors, []);
});

test('Experience: one row per résumé entry in order, years, role and company, hairline rules, a link to /resume', async () => {
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
  for (const [i, e] of resumeConfig.experience.entries()) {
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

test('no glass anywhere else: the bar, Projects, Experience, Writing and Contact hold no canvas, no glass, no blur', async () => {
  const { context, page, errors } = await open();
  const found = await page.evaluate((sels) => sels.map((s) => {
    const root = document.querySelector(s);
    if (!root) return [s, 'missing'];
    const bad = [root, ...root.querySelectorAll('*')].filter((el) => el.tagName === 'CANVAS' || el.hasAttribute('data-glass') || getComputedStyle(el).backdropFilter !== 'none');
    return [s, bad.map((el) => el.tagName)];
  }), ['header.bar', ...Object.values(SECTION)]);
  await context.close();
  for (const [s, bad] of found) assert.deepEqual(bad, [], s);
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

import { momentsOverlap } from './lib/moments.mjs';

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
  const { context, page, errors } = await open();
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
  assert.deepEqual(panes.map((p) => p.moment), ['hero', 'hero', 'hero', 'hero', 'terminal', 'terminal', 'terminal', 'terminal']);
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
      const clip = el.closest('.term-body, .aw-chat')?.getBoundingClientRect() ?? wb;
      const inside = r.width > 0 && r.height > 0 && el.textContent.trim()
        && r.top >= Math.max(0, clip.top, wb.top) && r.bottom <= Math.min(innerHeight, clip.bottom, wb.bottom);
      return inside ? { sel, color: getComputedStyle(el).color, box: { x: r.x, y: r.y, w: r.width, h: r.height } } : null;
    }).filter(Boolean));
  }, [W, sels]);
  const tag = await page.addStyleTag({ content: `${W}, ${W} * { color: transparent !important; text-shadow: none !important; } ${W} .steps li::before { content: none !important; } ${W} .terminal-cursor { visibility: hidden !important; }` });
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

test('window text reads at 4.5:1, measured: both windows, their titles, ANNA\'s steps and record, the terminal\'s prompt, dim text and errors after ls', async () => {
  const { context, page, errors } = await open('?t=2.4');
  // ANNA's window: her conversation finished, measured with the chat at its top and at its end
  await annaDone(page);
  await frames(page, 4);
  const ANNA_SEL = ['.glass-title', '.aw-replay', '.msg .who', '.msg .text', '.sources', '.steps li', '.rec-head', '.record li'];
  await page.$eval('.anna-window .aw-chat', (c) => { c.scrollTop = 0; });
  await frames(page, 2);
  const annaTop = await windowContrast(page, 'anna', ANNA_SEL);
  await page.$eval('.anna-window .aw-chat', (c) => { c.scrollTop = c.scrollHeight; });
  await frames(page, 2);
  const annaEnd = await windowContrast(page, 'anna', ANNA_SEL);
  // the terminal: help (its dim descriptions), a command it does not know (an error), then ls
  await termReady(page);
  for (const cmd of ['help', 'nosuchcommand', 'ls']) await termRun(page, cmd);
  await page.$eval(`${TERM} [data-glass="frosted"]`, (w) => w.scrollIntoView({ block: 'center' }));
  await frames(page, 4);
  const term = await windowContrast(page, 'terminal', ['.glass-title', '.terminal-user', '.terminal-separator', '.terminal-path', '.terminal-dollar', '.terminal-cmd', '.terminal-accent', '.terminal-dim', '.terminal-error', '.term-body > div']);
  await context.close();
  const all = [...annaTop, ...annaEnd, ...term];
  const seen = (list, sel) => list.filter((w) => w.sel === sel);
  for (const sel of ['.glass-title', '.steps li', '.record li']) assert.ok(seen([...annaTop, ...annaEnd], sel).length, `ANNA's window: ${sel} measured`);
  for (const sel of ['.glass-title', '.terminal-user', '.terminal-dollar', '.terminal-dim', '.terminal-error', '.terminal-accent']) assert.ok(seen(term, sel).length, `the terminal: ${sel} measured`);
  // the window titles are the one shared quiet ink (the 0.55 and 0.66 alpha inks are gone)
  for (const t of [...seen(annaTop, '.glass-title'), ...seen(term, '.glass-title')]) {
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
  for (const moment of ['anna', 'terminal']) {
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

test('no WebGL: both windows still show their content; the reflections keep their soft ground', async () => {
  const { context, page, errors } = await open('', { init: [noGL] });
  await annaDone(page);
  const anna = await page.$eval('[data-glass-moment="anna"] [data-glass="frosted"]', (w) => ({
    shown: getComputedStyle(w).visibility === 'visible' && w.getBoundingClientRect().height > 100,
    title: w.querySelector('.glass-title').textContent,
    beats: [...w.querySelectorAll('[data-beat]')].every((b) => b.classList.contains('on')),
  }));
  await termReady(page);
  const term = await page.$eval(`${TERM} [data-glass="frosted"]`, (w) => ({
    shown: getComputedStyle(w).visibility === 'visible' && w.getBoundingClientRect().height > 100,
    title: w.querySelector('.glass-title').textContent,
    cmds: w.querySelectorAll('.term-body .text-theme-primary').length,
    minis: [...w.querySelectorAll('[data-glass="ribbed"]')].map((p) => ({ lit: p.classList.contains('lit'), bg: getComputedStyle(p).backgroundImage })),
  }));
  await context.close();
  assert.deepEqual(anna, { shown: true, title: annaCalls.window, beats: true });
  assert.equal(term.shown, true);
  assert.equal(term.title, homeSections.terminalTitle);
  assert.ok(term.cmds >= 6, `the intro typed (${term.cmds} commands)`);
  assert.equal(term.minis.length, 4);
  for (const m of term.minis) { assert.equal(m.lit, false); assert.match(m.bg, /radial-gradient/); }
  assert.deepEqual(errors, []);
});

for (const [width, height] of [[1440, 900], [1280, 720], [390, 844]]) {
  test(`one glass moment per screen at ${width} x ${height}: no two neighbouring moments can share the screen, on load and after both windows have played`, async () => {
    const { context, page, errors } = await open('', { width, height });
    const boxes = () => page.evaluate(() => [...document.querySelectorAll('[data-glass-moment]')].map((m) => {
      const rs = [...m.querySelectorAll('[data-glass]')].map((g) => g.getBoundingClientRect());
      return { id: m.dataset.glassMoment, box: [Math.min(...rs.map((r) => r.top)) + scrollY, Math.max(...rs.map((r) => r.bottom)) + scrollY] };
    }));
    const check = (list, when) => {
      assert.deepEqual(list.map((m) => m.id), glassMoments, when);
      for (let i = 1; i < list.length; i++) {
        const [a, b] = [list[i - 1], list[i]];
        assert.equal(momentsOverlap(a.box, b.box, height), false, `${when}: ${a.id} [${a.box.map(Math.round)}] and ${b.id} [${b.box.map(Math.round)}] can share a ${height}px screen`);
      }
    };
    check(await boxes(), 'on load');
    await annaDone(page);
    await termReady(page);
    check(await boxes(), 'after play');
    await context.close();
    assert.deepEqual(errors, []);
  });
}

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

for (const [width, height] of SIZES) {
  test(`scrolling the whole page at ${width} x ${height}: in steps of a tenth of the screen, never two moments with a third on screen`, async () => {
    const { context, page, errors } = await open('', { width, height });
    const walk = () => page.evaluate(async (fn) => {
      const boxes = new Function(`return (${fn})`)();
      const next = () => new Promise((r) => requestAnimationFrame(() => r()));
      const max = document.documentElement.scrollHeight - innerHeight;
      const step = innerHeight / 10, out = [];
      for (let y = 0; ; y = Math.min(max, y + step)) {
        scrollTo({ top: y, behavior: 'instant' });
        await next();
        const on = boxes().filter((b) => (Math.min(b.bottom, innerHeight) - Math.max(b.top, 0)) / (b.bottom - b.top) >= 1 / 3).map((b) => b.id);
        out.push({ y: Math.round(scrollY), on });
        if (y >= max) break;
      }
      return out;
    }, glassBoxesFn.toString());
    const first = await walk();
    await bothPlayed(page);
    const second = await walk();
    await context.close();
    for (const [when, steps] of [['on load', first], ['after play', second]]) {
      assert.ok(steps.length > 20, `${when}: ${steps.length} steps`);
      const seen = new Set(steps.flatMap((s) => s.on));
      assert.deepEqual([...seen].sort(), [...glassMoments].sort(), `${when}: every moment is seen on its own somewhere`);
      const two = steps.filter((s) => s.on.length > 1);
      assert.deepEqual(two, [], `${when}: two moments on one screen`);
    }
    assert.deepEqual(errors, []);
  });
}

test('the kinds: four ribbed cards in the hero, one frosted window for ANNA, one for the terminal with its ribbed reflections hidden from readers', async () => {
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
  assert.deepEqual(kinds.map((k) => [k.id, k.own]), [['hero', ['ribbed', 'ribbed', 'ribbed', 'ribbed']], ['anna', ['frosted']], ['terminal', ['frosted']]]);
  assert.deepEqual(kinds[0].inner, []);
  assert.deepEqual(kinds[1].inner, []);
  assert.deepEqual(kinds[2].inner, Array(4).fill({ kind: 'ribbed', hidden: true }), 'four reflection minis inside the terminal\'s window');
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
    const { context, page, errors } = await open('', { width, height });
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
  const { context, page, errors } = await open();
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
  const { context, page, errors } = await open('', { width: 390, height: 844 });
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
