// The stone homepage in a real browser (openspec stone-glass-homepage): the hero and its ribbed
// glass, the arrival gone, ANNA's section and its one frosted window (her conversation itself:
// tests/glass-anna-window.e2e.mjs). Later chunks add the rows, About and Contact here.
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
  const a = await page.evaluate(() => window.__glass.draws);
  await frames(page, 30);
  const b = await page.evaluate(() => window.__glass.draws);
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

test('the page matches the list so far: the hero, then ANNA; every canvas and every blur in main inside a moment', async () => {
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
  // the terminal joins in chunk 6, with About
  assert.deepEqual(r.moments, glassMoments.slice(0, 2));
  assert.deepEqual(r.loose, []);
  assert.deepEqual(errors, []);
});

test('something behind ANNA\'s window: a glow beneath it, and the area it covers is not flat stone', async () => {
  const { context, page, errors } = await open('?t=2.4');
  const win = page.locator(`${ANNA} [data-glass="frosted"]`);
  await win.scrollIntoViewIfNeeded();
  const under = await page.$eval(`${ANNA} [data-glass="frosted"]`, (w) => {
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
  await page.addStyleTag({ content: `${ANNA} [data-glass="frosted"] { visibility: hidden !important; }` });
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
