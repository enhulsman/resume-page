// The terminal as a frosted glass window, on the homepage's About section (openspec
// stone-glass-homepage, chunk 6; ported from /hero-lab?lab=1). The window frosts a soft glow of the
// hero's four colours; the hero's panes reflect, upside down and faint, along its top inside edge;
// inside it is the real terminal. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-terminal.e2e.mjs
// Every wait is on state (__glassReady, terminal output, animation frames), never a fixed sleep.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { homeSections } from '../src/config/home.ts';

const BASE = process.env.BASE || 'http://localhost:4321';
const TERM = '[data-glass-moment="terminal"]';
const WIN = `${TERM} [data-glass="frosted"]`;
const BODY = `${WIN} .term-body`;
let browser;
before(async () => { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); });
after(async () => { await browser?.close(); });

async function open(q = '', { width = 1440, height = 900, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
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
  const { context, page, errors } = await open();
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

test('the hero\'s four panes reflect in it: ribbed, lit, upside down, decoration only', async () => {
  const { context, page } = await open();
  const r = await page.$eval(`${WIN} .term-reflect`, (el) => ({
    hidden: el.getAttribute('aria-hidden'),
    panes: [...el.querySelectorAll('[data-glass="ribbed"]')].map((p) => ({ canvas: !!p.querySelector('canvas'), lit: p.classList.contains('lit'), link: p.tagName === 'A' })),
    flipped: getComputedStyle(el).transform,
  }));
  await context.close();
  assert.equal(r.hidden, 'true');
  assert.equal(r.panes.length, 4);
  for (const p of r.panes) assert.deepEqual(p, { canvas: true, lit: true, link: false });
  assert.match(r.flipped, /matrix\(1, 0, 0, -1/, 'mirrored top to bottom');
});

test('the terminal still runs: it types its intro, then ls lists the project directories and whoami answers "ezra"', async () => {
  const { context, page, errors } = await open();
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
  const { context, page, errors } = await open();
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

test('reduced motion switched on mid-typing: the rest of the intro at once, an input line, a steady caret, nothing moves', async () => {
  const { context, page, errors } = await open('?guard=off');
  await intoView(page);
  // the intro is typing: a command has started, the input line is not there yet
  await page.waitForFunction((sel) => { const b = document.querySelector(sel); return b.querySelector('.text-theme-primary') && !b.querySelector('.terminal-input-line'); }, BODY, { timeout: 30000, polling: 'raf' });
  const typed = await page.$eval(BODY, (b) => b.querySelectorAll('.text-theme-primary').length);
  const cmds = await introCmds(page);
  assert.ok(typed < cmds.length, `still typing (${typed} of ${cmds.length})`);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await frames(page, 3);
  const s = await page.$eval(BODY, (b) => {
    const caret = b.querySelector('.terminal-input-line .terminal-cursor');
    return {
      cmds: [...b.querySelectorAll('.text-theme-primary')].map((e) => e.textContent),
      input: !!b.querySelector('.terminal-input-line'),
      caret: caret ? { anims: caret.getAnimations().length, name: getComputedStyle(caret).animationName } : null,
    };
  });
  assert.deepEqual(s.cmds, cmds, 'the whole intro');
  assert.equal(s.input, true, 'an input line');
  assert.ok(s.caret, 'a caret');
  assert.equal(s.caret.anims, 0, `the caret does not blink (${s.caret.name})`);

  // the cards hold the still frame: drawing the still moment again changes nothing
  const cards = '[data-glass="ribbed"] canvas';
  const a = await page.$$eval(cards, (cs) => cs.map((c) => c.toDataURL()));
  await page.evaluate(() => window.__glass.at(2.4));
  const b = await page.$$eval(cards, (cs) => cs.map((c) => c.toDataURL()));
  assert.equal(a.length, 8, 'four cards and four reflections');
  a.forEach((x, i) => assert.equal(x, b[i], `pane ${i + 1} is not the still frame`));

  // and nothing on screen moves: the terminal's passing hint gone, two screenshots 30 frames apart
  await page.waitForFunction(() => !document.querySelector('.terminal-hint'), null, { timeout: 10000 });
  await frames(page, 2);
  const p = await page.screenshot();
  await frames(page, 30);
  const q = await page.screenshot();
  await context.close();
  assert.ok(p.equals(q), 'the screen changed with reduced motion on');
  assert.deepEqual(errors, []);
});
