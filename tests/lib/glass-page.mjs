// The homepage in a real browser, shared by its glass files: each is split in two lanes,
// tests/glass-*.e2e.mjs (run side by side on workers) and tests/glass-*.live.e2e.mjs (run one at a
// time). A live test needs the light's loop running: the loop, the arrival, the pointer's light,
// the slow-device guard, stillness when motion is switched off. Every other test holds the light
// still with ?t=2.4 (panes.js: the light frozen at that moment, no arrival, no lean, no mouse light),
// or loads with reduced motion or without WebGL, where the loop never runs. With the loop running
// SwiftShader draws the ribbed glass at 2-4 frames a second at 1440 and every frame, screenshot and
// readback waits on it; a frozen page draws once.
export const BASE = process.env.BASE || 'http://localhost:4321';
export const CARDS = '[data-glass-moment="hero"] [data-glass="ribbed"]';

/**
 * open(q, opts): the homepage (`${BASE}/${q}`) in a new context, closed after the test
 * (tests/lib/browser.mjs). `init`: scripts run before any page script; `ready`: wait for
 * __glassReady.
 */
export const opener = (pw) => async function open(q = '', { width = 1440, height = 900, reducedMotion = 'no-preference', init = [], ready = true } = {}) {
  const context = await pw.newContext({ viewport: { width, height }, reducedMotion });
  for (const s of init) await context.addInitScript(s);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${BASE}/${q}`, { waitUntil: 'load' });
  if (ready) await page.waitForFunction(() => window.__glassReady === true);
  return { context, page, errors };
};

/** Count every canvas that got a WebGL context, before any page script runs. */
export function countGL() {
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
export function noGL() {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
    return /webgl/i.test(kind) ? null : orig.call(this, kind, ...rest);
  };
}

/** Let the page render `n` more frames. */
export const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
/** Each card's canvas as a data URL, in card order. */
export const shots = (page) => page.$$eval(`${CARDS} canvas`, (cs) => cs.map((c) => c.toDataURL()));
/** How much each card's canvas varies: an unlit or blank canvas is flat. */
export const spread = (page, sel = `${CARDS} canvas`) => page.$$eval(sel, (cs) => cs.map((c) => {
  const g = document.createElement('canvas'); g.width = 64; g.height = 78;
  const x = g.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0, 64, 78);
  const d = x.getImageData(0, 0, 64, 78).data; let lo = 255, hi = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 250) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; lo = Math.min(lo, v); hi = Math.max(hi, v); }
  return hi - lo;
}));
/** The hero's cards have arrived, every light full and drawn (the arrival, sketch round 3). */
export const arrived = async (page) => { await page.waitForFunction(() => window.__glass.glow.every((g) => g === 1), null, { timeout: 10000 }); await frames(page, 3); };
export const norm = (s) => s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

// ---- the hero's arrival and the name's light: window.__hero ----

/** The hero once its driver has painted: waits on __hero, never on time. */
export const heroOpener = (open) => async function hero(q, opts = {}) {
  const r = await open(q, opts);
  await r.page.waitForFunction(() => window.__hero?.ready === true);
  await frames(r.page, 2);
  return r;
};
export const heroState = (page) => page.evaluate(() => ({
  t: window.__hero.t, lt: window.__hero.lt, spill: window.__hero.spill, layers: window.__hero.layers,
  glow: window.__glass.glow,
  opacity: [...document.querySelectorAll('[data-glass-moment="hero"] .cards > li')].map((li) => +getComputedStyle(li).opacity),
  name: (() => { const h = document.querySelector('#hero-name'); const r = h.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, opacity: +getComputedStyle(h).opacity }; })(),
  cards: [...document.querySelectorAll('[data-glass-moment="hero"] .glass-card')].map((c) => { const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right }; }),
}));
export const cardLayers = (s) => s.layers.filter((l) => l.kind === 'card');
export const near = (a, b, tol) => Math.abs(a - b) <= tol;
