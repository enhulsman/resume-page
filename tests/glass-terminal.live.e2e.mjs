// The terminal's window on the homepage, the test that needs the light running (the live lane;
// tests/lib/glass-page.mjs): reduced motion switched on mid-typing stops the intro, the caret and
// the cards' light at once. The rest of the terminal: tests/glass-terminal.e2e.mjs. Needs a running
// site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-terminal.live.e2e.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useBrowser, SWIFTSHADER } from './lib/browser.mjs';
import { opener, frames } from './lib/glass-page.mjs';
import { terminalReflection } from '../src/config/glass.ts';

const TERM = '[data-glass-moment="terminal"]';
const WIN = `${TERM} [data-glass="frosted"]`;
const BODY = `${WIN} .term-body`;
const pw = useBrowser({ args: SWIFTSHADER });
const open = opener(pw);
const intoView = (page) => page.$eval(WIN, (w) => w.scrollIntoView({ block: 'center' }));
/** The commands the intro types, from the terminal's own data. */
const introCmds = (page) => page.$eval(BODY, (b) => JSON.parse(b.dataset.lines).filter((l) => l.type === 'cmd').map((l) => l.text));

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
  assert.equal(a.length, 4 + terminalReflection.panes.length, 'four cards and the reflections');
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
