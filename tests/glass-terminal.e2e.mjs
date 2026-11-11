// The terminal as a frosted glass window, on the homepage's About section (openspec
// stone-glass-homepage, chunk 6; ported from the glass lab). The window frosts a soft glow of one or
// two of the hero's lights; those lights reflect, upside down, faint and blurred, near its top;
// inside it is the real terminal. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-terminal.e2e.mjs
// Every wait is on state (__glassReady, terminal output, animation frames), never a fixed sleep.
// Lanes (tests/lib/glass-page.mjs): the light held still (?t=2.4) or reduced motion here; reduced
// motion switched on while the light runs: tests/glass-terminal.live.e2e.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useBrowser, SWIFTSHADER } from './lib/browser.mjs';
import { homeSections } from '../src/config/home.ts';
import { glassCards, terminalReflection } from '../src/config/glass.ts';

const BASE = process.env.BASE || 'http://localhost:4321';
const TERM = '[data-glass-moment="terminal"]';
const WIN = `${TERM} [data-glass="frosted"]`;
const BODY = `${WIN} .term-body`;
const pw = useBrowser({ args: SWIFTSHADER });

async function open(q = '', { width = 1440, height = 900, reducedMotion = 'no-preference' } = {}) {
  const context = await pw.newContext({ viewport: { width, height }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${BASE}/${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__glassReady === true);
  return { context, page, errors };
}
/** Let the page render `n` more frames. */
const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
const intoView = (page) => page.$eval(WIN, (w) => w.scrollIntoView({ block: 'center' }));
/** Wait for the intro to finish: the terminal's first input line. */
// the intro itself types at ?speed=10 where a test only needs it finished (src/scripts/glass/speed.js)
const ready = (page) => page.waitForFunction((sel) => document.querySelector(`${sel} .terminal-input-line`), BODY, { timeout: 90000 });
/** The commands the intro types, from the terminal's own data. */
const introCmds = (page) => page.$eval(BODY, (b) => JSON.parse(b.dataset.lines).filter((l) => l.type === 'cmd').map((l) => l.text));
/** Click into the terminal, type a command, press Enter; the output lines it printed. */
async function run(page, cmd) {
  const box = await page.locator(BODY).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 30);
  const n0 = await page.$eval(BODY, (b) => b.children.length);
  await page.keyboard.type(cmd, { delay: 15 });
  await page.keyboard.press('Enter');
  // the typed line becomes output, the output follows, and a new input line closes it
  await page.waitForFunction(([sel, n0, cmd]) => {
    const b = document.querySelector(sel), last = b.lastElementChild;
    return b.children.length > n0 && last.classList.contains('terminal-input-line') && !last.textContent.trim().endsWith(cmd);
  }, [BODY, n0, cmd], { timeout: 20000 });
  return page.$eval(BODY, (b, n0) => [...b.children].slice(n0, -1).map((d) => d.textContent.replace(/\s+/g, ' ').trim()), n0);
}

test('the terminal window: frosted, see-through, titled from config, without the drawing-sheet head bar', async () => {
  const { context, page, errors } = await open('?t=2.4');
  const look = await page.$eval(WIN, (el) => {
    const cs = getComputedStyle(el);
    const term = el.querySelector('.term');
    const head = el.querySelector('.term-head');
    return {
      backdrop: cs.backdropFilter || cs.webkitBackdropFilter, bg: cs.backgroundColor,
      title: el.querySelector('.glass-title')?.textContent,
      head: head ? getComputedStyle(head).display !== 'none' && head.getBoundingClientRect().height > 0 : false,
      border: term ? parseFloat(getComputedStyle(term).borderTopWidth) : null,
      holds: !!el.querySelector('#terminal-body'),
    };
  });
  await context.close();
  assert.match(look.backdrop, /blur\(/);
  const alpha = +(look.bg.match(/rgba?\(([^)]+)\)/)[1].split(/[ ,/]+/).filter(Boolean)[3] ?? 1);
  assert.ok(alpha < 0.8, `see-through (${look.bg})`);
  assert.equal(look.title, homeSections.terminalTitle);
  assert.equal(look.title, 'ezra@hulsman: ~');
  assert.equal(look.head, false, 'no drawing-sheet head bar');
  assert.equal(look.border, 0, 'no drawing-sheet border round the terminal');
  assert.equal(look.holds, true, 'the window holds the terminal');
  assert.deepEqual(errors, []);
});

test('one or two of the hero\'s lights reflect in it: ribbed, lit, upside down, decoration only, soft ovals', async () => {
  const { context, page } = await open('?t=2.4');
  const r = await page.$eval(`${WIN} .term-reflect`, (el) => ({
    hidden: el.getAttribute('aria-hidden'),
    panes: [...el.querySelectorAll('[data-glass="ribbed"]')].map((p) => ({ canvas: !!p.querySelector('canvas'), lit: p.classList.contains('lit'), link: p.tagName === 'A' })),
    masks: [...el.querySelectorAll('[data-glass="ribbed"]')].map((p) => { const cs = getComputedStyle(p); return cs.maskImage || cs.webkitMaskImage; }),
    flipped: getComputedStyle(el).transform,
  }));
  await context.close();
  assert.equal(r.hidden, 'true');
  assert.equal(r.panes.length, terminalReflection.panes.length);
  assert.ok(r.panes.length >= 1 && r.panes.length <= 2, `${r.panes.length} reflections`);
  for (const p of r.panes) assert.deepEqual(p, { canvas: true, lit: true, link: false });
  for (const m of r.masks) assert.match(m, /radial-gradient/, 'each pane fades out as an oval, no straight side');
  assert.match(r.flipped, /matrix\(1, 0, 0, -1/, 'mirrored top to bottom');
});

/** The hue of an "rgb(r g b / a)" or "rgb(r, g, b)" colour, with its alpha. */
const hueA = (s) => {
  const [r, g, b, a = 1] = s.match(/[\d.]+/g).map(Number);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const h = !d ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, a };
};

test('the reflection and the glow behind the window use at most two hues', async () => {
  const { context, page, errors } = await open('?t=2.4');
  const r = await page.$eval(TERM, (m) => ({
    washes: [...m.querySelectorAll('.term-reflect [data-glass="ribbed"]')].map((p) => JSON.parse(p.dataset.wash).color),
    glow: getComputedStyle(m.querySelector('[data-glow]')).backgroundImage,
  }));
  await context.close();
  // every colour stop of the glow that shows (alpha above 0), and every reflected card's wash
  const stops = (r.glow.match(/rgba?\([^)]*\)/g) ?? []).map(hueA).filter((c) => c.a > 0).map((c) => c.h);
  const hues = [...stops, ...r.washes.map((w) => hueA(`rgb(${w.join(' ')})`).h)];
  assert.ok(stops.length >= 1, `the glow has colour: ${r.glow}`);
  const fams = hues.reduce((fs, h) => (fs.some((f) => Math.min(Math.abs(f - h), 360 - Math.abs(f - h)) < 25) ? fs : [...fs, h]), []);
  assert.ok(fams.length <= 2, `hues ${hues.map(Math.round)} make ${fams.length} families`);
  // the reflected washes are the cards' own, from config
  for (const w of r.washes) assert.ok(glassCards.some((c) => c.wash.color.join() === w.join()), `wash ${w}`);
  assert.deepEqual(errors, []);
});

for (const [width, height] of [[1440, 900], [390, 844]]) test(`the reflection has no straight hard edge at ${width} x ${height}: the window's top half, its words hidden, changes softly everywhere`, async () => {
  const { context, page, errors } = await open('?t=2.4', { width, height });
  await intoView(page);
  // the reflection and the glow alone: the title bar, its rule and the terminal's text hidden, and
  // the frost's grain (2026-11-11, B2: fine noise over the whole window, not an edge of the reflection)
  await page.addStyleTag({ content: `${WIN} .glass-bar, ${WIN} .term { visibility: hidden !important; } ${WIN}::after { content: none !important; }` });
  await frames(page, 3);
  // inside the window's rim (its light inset edge), down to half its height
  const b = await page.$eval(WIN, (w) => { const r = w.getBoundingClientRect(); return { x: Math.ceil(r.left) + 14, y: Math.ceil(r.top) + 6, w: Math.floor(r.width) - 28, h: Math.floor(r.height / 2) }; });
  const png = (await page.screenshot({ clip: { x: b.x, y: b.y, width: b.w, height: b.h } })).toString('base64');
  const m = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height).data, W = img.width, H = img.height;
    const L = (i, j) => { const k = (j * W + i) * 4; return (d[k] + d[k + 1] + d[k + 2]) / 3; };
    // a straight edge is a step that holds along its own length: each step between neighbouring
    // pixels, across and down, averaged over 5 px along the edge (the blur's own dither averages out)
    const R = 2; let jump = 0, lo = 255, hi = 0;
    for (let j = R; j < H - R; j++) for (let i = 1; i < W; i++) {
      let s = 0; for (let k = -R; k <= R; k++) s += L(i, j + k) - L(i - 1, j + k);
      jump = Math.max(jump, Math.abs(s) / (2 * R + 1));
    }
    for (let i = R; i < W - R; i++) for (let j = 1; j < H; j++) {
      let s = 0; for (let k = -R; k <= R; k++) s += L(i + k, j) - L(i + k, j - 1);
      jump = Math.max(jump, Math.abs(s) / (2 * R + 1));
    }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { lo = Math.min(lo, L(i, j)); hi = Math.max(hi, L(i, j)); }
    return { jump, spread: hi - lo, w: W, h: H };
  }, png);
  await context.close();
  assert.ok(m.w > 200 && m.h > 100, `a band ${m.w} x ${m.h}`);
  assert.ok(m.spread > 5, `the band holds the reflection and the glow (${m.spread.toFixed(1)} levels)`);
  // the four-pane row stepped by 3.6 to 4.3 levels along its panes' sides (measured 2026-11-10);
  // soft light, by about 2
  assert.ok(m.jump <= 3, `a step of ${m.jump.toFixed(2)} levels holds along a 5 px edge`);
  assert.deepEqual(errors, []);
});

test('the terminal still runs: it types its intro, then ls lists the project directories and whoami answers "ezra"', async () => {
  const { context, page, errors } = await open('?t=2.4&speed=10');
  await intoView(page);
  await ready(page);
  const home = await run(page, 'ls');
  assert.ok(home.join(' ').split(/\s+/).includes('projects/'), `ls: ${JSON.stringify(home)}`);
  const listed = (await run(page, 'ls projects')).join(' ').split(/\s+/).filter(Boolean);
  // the directories are the terminal's projects, as today: each title as a slug
  const slugs = await page.$eval('#terminal-data', (d) => JSON.parse(d.textContent).projects.map((p) => p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')));
  assert.ok(slugs.length >= 4);
  assert.deepEqual([...listed].sort(), [...slugs].sort());
  assert.deepEqual(await run(page, 'whoami'), ['ezra']);
  await context.close();
  assert.deepEqual(errors, []);
});

test('theme answers plainly that there is one theme, and changes nothing', async () => {
  const { context, page, errors } = await open('?t=2.4&speed=10');
  await intoView(page);
  await ready(page);
  for (const cmd of ['theme', 'theme dark', 'theme toggle']) {
    const out = await run(page, cmd);
    assert.equal(out.length, 1, `${cmd}: ${JSON.stringify(out)}`);
    assert.match(out[0], /one theme/i, cmd);
    assert.doesNotMatch(out[0], /switched|unknown/i, cmd);
  }
  const after_ = await page.evaluate(() => ({ attr: document.documentElement.getAttribute('data-theme'), err: document.querySelectorAll('.term-body .terminal-error').length }));
  await context.close();
  assert.equal(after_.attr, null, 'nothing sets a theme on the page');
  assert.equal(after_.err, 0);
  assert.deepEqual(errors, []);
});

test('reduced motion from the start: the whole intro at once, an input line, a caret that does not blink', async () => {
  const { context, page, errors } = await open('', { reducedMotion: 'reduce' });
  await ready(page);
  const s = await page.$eval(BODY, (b) => {
    const caret = b.querySelector('.terminal-input-line .terminal-cursor');
    return { cmds: [...b.querySelectorAll('.text-theme-primary')].map((e) => e.textContent), anims: caret ? caret.getAnimations().length : -1 };
  });
  assert.deepEqual(s.cmds, await introCmds(page));
  assert.equal(s.anims, 0, 'the caret is steady');
  await context.close();
  assert.deepEqual(errors, []);
});
