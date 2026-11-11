// Wide screens (approved by the owner, 2026-11-11): past the cap (--stone-cap, 1760 px of page) no
// page stretches any further. The page is the cap-wide page, centred, with the plain stone ground on
// both sides; the bar's contents (the mark left, "Get in touch" right) and the footer's rule keep to
// the same column, and every light that belongs to a piece of content (a window's glow, a head's
// page light) moves with it. At the cap and below nothing changes. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test tests/wide-cap.e2e.mjs
//
// The cap is on the page's own width, the body's: the window less the scrollbar's gutter, which the
// root keeps stable (scrollbar-gutter), here 15 px even where no scrollbar is drawn. So the page is
// 1760 px wide at a 1775 px window.
//
// Test cost: one context, reduced motion (every window finished on arrival, the light never runs)
// and the light held still with ?t=2.4 where a page has ribbed glass. Each page type loads once at
// the cap, then the window is resized (to the cap plus the gutter, 2200, 2600 and 1440) and measured
// at each: every box in main (headings, text, links, images, windows, cards, canvases, and their
// glows), the bar's contents and the footer. Waits are on state (load, fonts, two frames after a
// resize), never a fixed sleep.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useBrowser, SWIFTSHADER } from './lib/browser.mjs';

const BASE = process.env.BASE || 'http://localhost:4321';
const CAP = 1760;
const WIDE = 2200;
const WIDER = 2600;
const HEIGHT = 1000;
// one of each page type: the homepage, the projects index, a project page (and one holding a
// drawing), the blog, a post (and one with a drawing), the résumé and contact
const PAGES = ['/', '/projects', '/projects/Henk', '/projects/PytaigaMcp', '/blog', '/blog/bible-tui', '/blog/henk-exactly-once', '/resume', '/contact'];
const RIBBED = new Set(['/', '/projects']);
const STUB = "window.turnstile={render:function(){return 'stub'},getResponse:function(){return 'stub-token'},reset:function(){}};if(window.onTurnstileLoad)window.onTurnstileLoad();";
/** The gutter at a width at or below the cap: clamp(16px, 2.2vw, 32px). */
const gutter = (w) => Math.min(32, Math.max(16, 0.022 * w));

const pw = useBrowser({ args: SWIFTSHADER });

/** Every box worth comparing, in document order; text inside a window or a card is the window's. */
function measure() {
  const SEL = 'h1, h2, h3, h4, p, li, dt, dd, a, img, svg, canvas, time, pre, figure, .glass-card, .glass-window, .glass-stage, .pc, .art-side, .art-stick, .art-window';
  const GLOW = '.page-light, .glass-glow';
  const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, width: r.width, height: r.height }; };
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    }
    return !el.closest('.hp-field, dialog:not([open])');
  };
  const main = document.querySelector('main');
  const items = [...main.querySelectorAll(SEL)]
    .filter((el) => !el.parentElement.closest('.glass-window, .glass-card, .pc, pre, svg') && shown(el))
    .map((el) => ({ key: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''), hero: el.matches('.hero-name'), ...box(el) }));
  const glows = [...main.querySelectorAll(GLOW)].filter(shown).map((el) => ({ key: el.className, ...box(el) }));
  const q = (s) => box(document.querySelector(s));
  return {
    vw: innerWidth, page: document.body.getBoundingClientRect().width, doc: document.documentElement.scrollWidth,
    items, glows,
    bar: { bar: q('.bar'), name: q('.bar-name'), cta: q('.bar-cta'), nav: [...document.querySelectorAll('.bar nav a')].map(box) },
    foot: q('.foot'),
  };
}

const settle = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

// measured once, by the first test that asks (a file-level before() can run ahead of the browser's)
let measured;
const collect = () => (measured ??= sweep());
async function sweep() {
  const seen = {};
  const context = await pw.browser.newContext({ viewport: { width: CAP, height: HEIGHT }, reducedMotion: 'reduce' });
  await context.route('https://challenges.cloudflare.com/**', (r) => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  try {
    const page = await context.newPage();
    for (const path of PAGES) {
      await page.setViewportSize({ width: CAP, height: HEIGHT });
      await page.goto(BASE + path + (RIBBED.has(path) ? '?t=2.4' : ''), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await settle(page);
      // the scrollbar's gutter: the window at which the page itself is as wide as the cap
      const sb = await page.evaluate(() => innerWidth - document.body.getBoundingClientRect().width);
      const at = { sb };
      for (const w of [CAP, CAP + sb, WIDE, WIDER, 1440]) {
        await page.setViewportSize({ width: w, height: HEIGHT });
        await settle(page);
        at[w] = await page.evaluate(measure);
      }
      seen[path] = at;
    }
  } finally {
    await context.close();
  }
  return seen;
}

const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a.toFixed(2)}, expected ${b.toFixed(2)} (±${tol})`);
/** The boxes of `b` that are not those of `a` moved over by dx, at most 5 described. */
function moved(a, b, dx) {
  assert.equal(b.items.length, a.items.length, 'the same boxes shown');
  assert.equal(b.glows.length, a.glows.length, 'the same glows shown');
  const pairs = [...a.items.map((x, i) => [x, b.items[i]]), ...a.glows.map((x, i) => [x, b.glows[i]])];
  const off = pairs.filter(([x, y]) => x.key !== y.key || Math.abs(y.left - x.left - dx) > 1 || Math.abs(y.width - x.width) > 1 || Math.abs(y.top - x.top) > 1 || Math.abs(y.height - x.height) > 1);
  const say = (x) => `${x.left.toFixed(1)},${x.top.toFixed(1)} ${x.width.toFixed(1)}x${x.height.toFixed(1)}`;
  assert.deepEqual(off.slice(0, 5).map(([x, y]) => `${x.key} ${say(x)} -> ${say(y)}`), [], `${off.length} of ${pairs.length} boxes did not just move over by ${dx}`);
}
const extent = (items) => {
  const body = items.filter((i) => !i.hero);
  return { left: Math.min(...body.map((i) => i.left)), right: Math.max(...items.map((i) => i.right)) };
};

for (const path of PAGES) {
  test(`${path} at ${WIDE}: the bar's contents, the footer and the content sit in one centred column no wider than the cap`, async () => {
    const m = (await collect())[path][WIDE];
    const side = (m.page - CAP) / 2;
    const left = side + gutter(CAP), right = m.page - side - gutter(CAP);
    assert.equal(m.doc, m.page, 'no sideways scroll');
    // the bar's box and its rule may run full width; what it holds keeps to the column
    near(m.bar.name.left, left, 2, 'the mark\'s left edge');
    near(m.bar.cta.right, right, 2, '"Get in touch"\'s right edge');
    near(m.bar.name.left, m.page - m.bar.cta.right, 2, 'the bar\'s side margins');
    for (const a of m.bar.nav) assert.ok(a.left >= left && a.right <= right, 'the nav inside the column');
    near(m.foot.left, left, 2, 'the footer rule\'s left end');
    near(m.foot.right, right, 2, 'the footer rule\'s right end');
    const e = extent(m.items);
    near(e.left, left, 2, 'the content\'s left edge');
    assert.ok(e.right <= right + 2, `the content's right edge ${e.right.toFixed(1)} inside the column (${right})`);
    for (const i of m.items) assert.ok(i.left >= side - 1 && i.right <= m.page - side + 1, `${i.key} at ${i.left.toFixed(1)}–${i.right.toFixed(1)} inside the cap`);
  });

  test(`${path} past the cap is the page at the cap, centred: every box and glow moved over by the margin, none resized`, async () => {
    const at = (await collect())[path];
    const capped = at[CAP + at.sb], wide = at[WIDE], wider = at[WIDER];
    assert.equal(capped.page, CAP, 'the page as wide as the cap');
    moved(capped, wide, (wide.page - CAP) / 2);
    moved(wide, wider, (wider.page - wide.page) / 2);
  });

  test(`${path} at 1440 and at the cap: nothing moved, the bar, the footer and the content run gutter to gutter`, async () => {
    const seen = await collect();
    for (const w of [1440, CAP]) {
      const m = seen[path][w], g = gutter(w);
      assert.equal(m.doc, m.page, `no sideways scroll at ${w}`);
      near(m.bar.bar.left, 0, 0.5, `the bar starts at the screen's edge at ${w}`);
      near(m.bar.bar.width, m.page, 0.5, `the bar spans the page at ${w}`);
      near(m.bar.name.left, g, 1, `the mark at the gutter at ${w}`);
      near(m.bar.cta.right, m.page - g, 1, `"Get in touch" at the gutter at ${w}`);
      near(m.foot.left, g, 1, `the footer rule from the gutter at ${w}`);
      near(m.foot.right, m.page - g, 1, `the footer rule to the gutter at ${w}`);
      const e = extent(m.items);
      near(e.left, g, 1, `the content from the gutter at ${w}`);
      assert.ok(e.right <= m.page - g + 1, `the content's right edge ${e.right.toFixed(1)} inside the gutter at ${w}`);
    }
  });
}
