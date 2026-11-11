// Henk's trust boundary on one frosted pane, in a real browser (openspec henk-glass-boundary:
// stone-project-pages "Henk's trust boundary is one frosted pane"). Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test tests/henk-boundary.e2e.mjs
//
// Test cost: still lane. Every load holds the light still (?t=2.4; the page has no loop of its own,
// the pane is CSS) or asks for reduced motion; each test opens its own context, closed after it
// (tests/lib/browser.mjs). Contrast is measured from rendered pixels: the diagram's text made
// transparent at once, one screenshot, the pixels behind each label sampled every 2 px. Waits are on
// state (fonts, frames), never on a fixed sleep.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useBrowser } from './lib/browser.mjs';
import { noGL } from './lib/glass-page.mjs';

const BASE = process.env.BASE || 'http://localhost:4321';
const FIG = '.art .prose [data-glass-moment="henk-boundary"]';
const PANE = `${FIG} [data-glass="frosted"]`;
const CAPTION = 'Two ways in, one way through: every tool call passes the default-deny choke point, every outcome lands in the audit log.';
// every label of the line drawing it replaces, in its order; the untrusted lanes stand on stone
// above the pane, everything inside Henk on the pane
const OUTSIDE = [
  'UNTRUSTED INPUT', 'OWNER', 'Gatus · Prometheus', 'Grafana alert rules', 'Owner on Signal', 'dedicated number',
  'ntfy henk-events', 'deny-all topic', 'signal-cli bridge', 'no published ports', 'TRUST BOUNDARY',
];
const INSIDE = [
  'Henk · rp5 · tailnet tag:henk · zero inbound', 'event intake', 'durable replay cursor', 'owner allowlist', 'others dropped + logged',
  'cadence gate', 'debounce · cooldown · cap', 'serial agent core', 'Claude Agent SDK', 'PreToolUse choke point',
  'default-deny · closed toolset', 'read-only tools', 'health · todos', 'audit log', 'append-only JSONL', 'Signal + handoff', 'owner only',
];
const LABELS = [...OUTSIDE, ...INSIDE];

const pw = useBrowser();
const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);

/** /projects/Henk in a new context (closed after the test), the figure in view. */
async function henk({ width = 1440, height = 900, reducedMotion = 'no-preference', init = [], query = '?t=2.4' } = {}) {
  const context = await pw.newContext({ viewport: { width, height }, reducedMotion });
  for (const s of init) await context.addInitScript(s);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${BASE}/projects/Henk${query}`, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator(FIG).count(), 1, 'the diagram is the moment henk-boundary, in the prose');
  await inView(page);
  return { page, errors };
}
/** Scroll so the whole figure sits under the bar. */
async function inView(page) {
  await page.evaluate((sel) => {
    const fig = document.querySelector(sel), bar = document.querySelector('.bar').getBoundingClientRect().bottom;
    const r = fig.getBoundingClientRect();
    window.scrollBy(0, r.top - bar - 12);
  }, FIG);
  await frames(page, 3);
}

const decode = (page, png, fn, arg) => page.evaluate(async ([b64, fn, arg]) => {
  const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
  const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  return new Function(`return (${fn})`)()(x.getImageData(0, 0, img.width, img.height), arg);
}, [png.toString('base64'), fn.toString(), arg]);

/**
 * Every label of the diagram and its caption: its text, ink, box, and lowest contrast against the
 * pixels behind it. The figure is taller than a screen at 1440, so it is read a screenful at a time
 * (the figure's top under the bar, then down), each label where it lies wholly on screen.
 */
async function labels(page) {
  await inView(page);
  const done = new Map();
  let total = Infinity;
  for (let pass = 0; pass < 6 && done.size < total; pass++) {
    if (pass) {
      await page.evaluate(() => window.scrollBy(0, innerHeight - document.querySelector('.bar').getBoundingClientRect().bottom - 60));
      await frames(page, 3);
    }
    const { items, n } = await page.evaluate((sel) => {
      const fig = document.querySelector(sel), bar = document.querySelector('.bar').getBoundingClientRect().bottom;
      const out = [...fig.querySelectorAll('svg text')].map((t) => ({ text: t.textContent.trim(), color: getComputedStyle(t).fill, r: t.getBoundingClientRect() }));
      const cap = fig.querySelector('.flow-caption');
      const range = document.createRange(); range.selectNodeContents(cap);
      out.push({ text: cap.textContent.replace(/\s+/g, ' ').trim(), color: getComputedStyle(cap).color, r: range.getBoundingClientRect(), caption: true });
      const items = out.map(({ r, ...o }, k) => ({ ...o, k, on: r.top >= bar && r.bottom <= innerHeight, box: { x: r.left, y: r.top, w: r.width, h: r.height } }));
      return { items: items.filter((i) => i.on), n: items.length };
    }, FIG);
    total = n;
    const todo = items.filter((i) => !done.has(i.k));
    if (!todo.length) continue;
    const tag = await page.addStyleTag({ content: `${FIG} svg text { fill: transparent !important; stroke: transparent !important; } ${FIG} .flow-caption { color: transparent !important; }` });
    await frames(page, 2);
    const png = await page.screenshot();
    await tag.evaluate((t) => t.remove());
    await frames(page, 2);
    const ratios = await measureBehind(page, png, todo);
    todo.forEach((it, i) => done.set(it.k, { ...it, ...ratios[i] }));
  }
  return [...done.values()].sort((a, b) => a.k - b.k);
}
/** Each text's lowest contrast against the pixels behind its box in `png` (sampled every 2 px). */
function measureBehind(page, png, items) {
  return decode(page, png, (img, items) => {
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return items.map(({ color, box }) => {
      const [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
      let min = 99, n = 0;
      const x0 = Math.max(0, Math.round(box.x)), y0 = Math.max(0, Math.round(box.y));
      const x1 = Math.min(img.width, Math.round(box.x + box.w)), y1 = Math.min(img.height, Math.round(box.y + box.h));
      for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
        const i = (y * img.width + x) * 4, d = img.data;
        const bg = [d[i], d[i + 1], d[i + 2]];
        const fg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
        const [hi, lo] = [L(bg), L(fg)].sort((p, q) => q - p);
        min = Math.min(min, (hi + 0.05) / (lo + 0.05)); n++;
      }
      return { ratio: +min.toFixed(2), n };
    });
  }, items);
}
const assertReadable = (ls, where) => {
  assert.equal(ls.length, LABELS.length + 1, `${where}: every label and the caption measured`);
  assert.deepEqual(ls.filter((l) => !l.caption).map((l) => l.text), LABELS, `${where}: every label of the drawing, in order`);
  assert.equal(ls.at(-1).text, CAPTION, `${where}: the caption`);
  for (const l of ls) assert.ok(l.n > 4, `${where}: "${l.text}" sampled (${l.n} px)`);
  const translucent = ls.filter((l) => { const a = l.color.match(/[\d.]+/g).map(Number)[3]; return a !== undefined && a < 1; });
  assert.deepEqual(translucent, [], `${where}: opaque inks only`);
  const low = ls.filter((l) => l.ratio < 4.5).map(({ text, color, ratio }) => ({ text, color, ratio }));
  assert.deepEqual(low, [], `${where}: ${JSON.stringify(low)}`);
  return Math.min(...ls.map((l) => l.ratio));
};

// ---------- the pane ----------

test('One frosted pane holds the diagram: its own moment, one frosted window with a glow beneath, the lanes inside Henk on it and the untrusted lanes above it', async () => {
  const { page, errors } = await henk();
  const s = await page.evaluate(([FIG, PANE]) => {
    const fig = document.querySelector(FIG), pane = document.querySelector(PANE);
    const panes = fig.querySelectorAll('[data-glass]');
    const glow = pane.parentElement.querySelector(':scope > [data-glow]');
    const p = pane.getBoundingClientRect(), g = glow?.getBoundingClientRect();
    const cs = getComputedStyle(pane);
    const texts = [...fig.querySelectorAll('svg text')].map((t) => { const r = t.getBoundingClientRect(); return { text: t.textContent.trim(), top: r.top, bottom: r.bottom, left: r.left, right: r.right }; });
    const tiles = [...fig.querySelectorAll('svg .box')].map((b) => {
      const r = b.getBoundingClientRect();
      return { inside: r.top >= p.top && r.bottom <= p.bottom, fill: getComputedStyle(b).fill };
    });
    return {
      classic: fig.classList.contains('henk-flow'), glass: [...panes].map((e) => e.dataset.glass),
      blur: cs.backdropFilter, grain: /feTurbulence/.test(getComputedStyle(pane, '::after').backgroundImage),
      glow: glow && { hidden: glow.getAttribute('aria-hidden'), before: !!(glow.compareDocumentPosition(pane) & Node.DOCUMENT_POSITION_FOLLOWING),
        z: [+getComputedStyle(glow).zIndex, +getComputedStyle(pane).zIndex], box: [g.left - p.left, g.top - p.top, g.right - p.right, g.bottom - p.bottom] },
      pane: { left: p.left, top: p.top, right: p.right, bottom: p.bottom },
      texts, tiles,
      title: fig.querySelector('svg title')?.textContent, role: fig.querySelector('svg').getAttribute('role'),
      caption: fig.querySelector('.flow-caption').textContent.replace(/\s+/g, ' ').trim(),
    };
  }, [FIG, PANE]);
  assert.ok(s.classic, 'the figure keeps .henk-flow ("View larger" finds it)');
  assert.deepEqual(s.glass, ['frosted'], 'exactly one frosted pane, nothing ribbed');
  assert.match(s.blur, /blur\(/, 'the pane frosts what is behind it');
  assert.ok(s.grain, 'the frost\'s grain');
  assert.ok(s.glow, 'a [data-glow] beside the pane');
  assert.equal(s.glow.hidden, 'true');
  assert.ok(s.glow.before && s.glow.z[0] < s.glow.z[1], `painted beneath the pane (z ${s.glow.z})`);
  for (const d of s.glow.box) assert.ok(Math.abs(d) <= 1, `the glow's box is the pane's box (${s.glow.box})`);
  assert.equal(s.title, "Henk's trust boundary and event flow");
  assert.equal(s.role, 'img');
  assert.equal(s.caption, CAPTION);
  const at = Object.fromEntries(s.texts.map((t) => [t.text, t]));
  for (const t of INSIDE) {
    const r = at[t];
    assert.ok(r && r.top >= s.pane.top && r.bottom <= s.pane.bottom && r.left >= s.pane.left && r.right <= s.pane.right, `"${t}" on the pane`);
  }
  for (const t of OUTSIDE) assert.ok(at[t] && at[t].bottom <= s.pane.top, `"${t}" above the pane, on stone`);
  // the boxes on the pane are translucent tiles; those above it are stone
  const on = s.tiles.filter((t) => t.inside), off = s.tiles.filter((t) => !t.inside);
  assert.equal(on.length, 8, 'eight boxes on the pane');
  assert.equal(off.length, 4, 'four boxes above it');
  for (const t of on) { const a = t.fill.match(/[\d.]+/g).map(Number)[3]; assert.ok(a > 0.2 && a < 1, `a translucent tile: ${t.fill}`); }
  assert.deepEqual(errors, []);
});

test('Every label at 4.5:1, measured from rendered pixels, at 1440 and at 390', async () => {
  const mins = {};
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const { page } = await henk({ width, height });
    const ls = await labels(page);
    mins[width] = assertReadable(ls, `at ${width}`);
    console.log(`# at ${width}, the lowest: ${[...ls].sort((p, q) => p.ratio - q.ratio).slice(0, 4).map((l) => `${l.text} ${l.ratio}`).join('; ')}`);
  }
  console.log(`# lowest contrast: ${JSON.stringify(mins)}`);
});

test('The light stays inside the pane: just outside its sides, down its height, stone and never blue', async () => {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const { page } = await henk({ width, height });
    // the pane's top under the bar, then its foot near the screen's bottom: each time the points
    // beside it that are on screen
    let sampled = 0;
    for (const at of ['top', 'foot']) {
      if (at === 'foot') {
        await page.locator(PANE).evaluate((p) => window.scrollBy(0, p.getBoundingClientRect().bottom - innerHeight + 40));
        await frames(page, 3);
      }
      const { pane, bar } = await page.locator(PANE).evaluate((p) => {
        const r = p.getBoundingClientRect();
        return { pane: { left: r.left, right: r.right, top: r.top, bottom: r.bottom }, bar: document.querySelector('.bar').getBoundingClientRect().bottom };
      });
      const points = [];
      for (let y = Math.ceil(Math.max(pane.top + 8, bar + 2)); y < Math.min(pane.bottom - 8, height - 2); y += 6) {
        for (const d of [3, 6, 10, 16]) {
          if (pane.left - d >= 0) points.push({ x: Math.floor(pane.left - d), y, side: 'left', d });
          if (pane.right + d < width) points.push({ x: Math.ceil(pane.right + d), y, side: 'right', d });
        }
      }
      sampled += points.length;
      const png = await page.screenshot();
      const bad = await decode(page, png, (img, points) => {
        const STONE = [238, 234, 227];
        return points.map((p) => { const i = (p.y * img.width + p.x) * 4; return { ...p, rgb: [img.data[i], img.data[i + 1], img.data[i + 2]] }; })
          .filter(({ rgb }) => rgb[2] > rgb[0] || rgb.some((v, k) => Math.abs(v - STONE[k]) > 24));
      }, points);
      assert.deepEqual(bad.slice(0, 6), [], `at ${width} (${at}): ${bad.length} of ${points.length} points beside the pane are not stone`);
    }
    assert.ok(sampled > 200, `${sampled} points sampled at ${width}`);
  }
});

test('At 1440 and 390 no sideways scroll; the figure, its pane and its svg within the screen', async () => {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const { page } = await henk({ width, height });
    const m = await page.evaluate(([FIG, PANE]) => {
      const W = innerWidth, fig = document.querySelector(FIG);
      const boxes = [fig, document.querySelector(PANE), fig.querySelector('svg')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; });
      return { sw: document.documentElement.scrollWidth, W, boxes };
    }, [FIG, PANE]);
    assert.ok(m.sw <= m.W, `at ${width}: scrollWidth ${m.sw}`);
    for (const [l, r] of m.boxes) assert.ok(l >= 0 && r <= m.W, `at ${width}: a box at ${l}..${r}`);
  }
});

// ---------- still, without WebGL, in print ----------

test('Reduced motion: the pane holds still under the mouse; two captures 30 frames apart are identical, nothing animates in the figure', async () => {
  const { page } = await henk({ reducedMotion: 'reduce', query: '' });
  const r = await page.locator(PANE).evaluate((p) => { const b = p.getBoundingClientRect(); return { x: b.left + b.width * 0.4, y: b.top + b.height * 0.6 }; });
  await page.mouse.move(r.x, r.y, { steps: 4 });
  await frames(page, 3);
  const fig = page.locator(FIG);
  const a = await fig.screenshot();
  await page.mouse.move(r.x + 60, r.y - 40, { steps: 4 });
  await frames(page, 30);
  const b = await fig.screenshot();
  assert.ok(a.equals(b), 'two captures differ');
  const running = await page.evaluate((sel) => document.getAnimations().filter((x) => x.playState === 'running' && document.querySelector(sel).contains(x.effect?.target)).length, FIG);
  assert.equal(running, 0);
});

test('Without WebGL: no error, the same frosted pane, every label at 4.5:1', async () => {
  const { page, errors } = await henk({ init: [noGL] });
  assert.match(await page.locator(PANE).evaluate((p) => getComputedStyle(p).backdropFilter), /blur\(/);
  assertReadable(await labels(page), 'without WebGL');
  assert.deepEqual(errors, []);
});

test('Print: the light goes, the pane is plain, every label at 4.5:1', async () => {
  const { page } = await henk();
  await page.emulateMedia({ media: 'print' });
  await frames(page, 3);
  await inView(page);
  const glow = await page.locator(`${FIG} [data-glow]`).evaluate((g) => getComputedStyle(g).display);
  assert.equal(glow, 'none', 'no light in print');
  assertReadable(await labels(page), 'in print');
});
