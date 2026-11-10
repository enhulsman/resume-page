// ANNA in a glass window, in a real browser. Her section's own tests run on the homepage (`/`),
// where it shipped (openspec stone-glass-homepage, chunk 4): left, what she may do and for whom;
// right, a frosted window where anna-site's 'week' conversation plays once as it comes into view.
// The timeline itself: tests/glass-anna-window.test.mjs. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-anna-window.e2e.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { annaDemo } from '../src/config/anna-demo.ts';
import { annaLead, annaCalls, homeSections } from '../src/config/home.ts';

import { timeline, moment } from '../src/scripts/glass/anna-window-model.js';

const BASE = process.env.BASE || 'http://localhost:4321';
/** The beats in the page, in order: her work is one line (the `sources` beat); no steps list, no record. */
const BEATS = ['person', 'answer', 'sources', 'question', 'reply', 'result'];
/** Every beat of the timeline, as the window's state lists them: each step changes the work line. */
const SEEN = ['person', 'answer', 'sources', ...annaCalls.work.lines.slice(1).map((_, i) => `step-${i}`), 'question', 'typing', 'reply', 'result'];
const TL = timeline({ lines: annaCalls.work.lines, reply: annaDemo.reply });
const AT = (id) => TL.beats.find((b) => b.id === id).at;
/** The sizes the spec names: two desktops and a phone. */
const SIZES = [[1440, 900], [1280, 720], [390, 844]];
let browser;
before(async () => { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); });
after(async () => { await browser?.close(); });

/** The homepage (or `path`); `q` is the query string without its "?". */
async function open(q = '', { width = 1440, height = 900, reducedMotion = 'no-preference', path = '/' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${BASE}${path}${q ? `?${q}` : ''}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__glassReady === true);
  return { context, page, errors };
}
const state = (page) => page.evaluate(() => window.__annaWindow.state());
async function until(page, pred, arg, timeout = 40000) {
  await page.waitForFunction(([src, a]) => window.__annaWindow && new Function('s', 'a', `return (${src})(s, a)`)(window.__annaWindow.state(), a), [pred.toString(), arg], { timeout }).catch(() => {});
  return state(page);
}
const intoView = (page) => page.evaluate(() => document.querySelector('.anna-window .aw-window').scrollIntoView({ block: 'center' }));
const onBeats = (page) => page.$$eval('.anna-window [data-beat]', (els) => els.filter((e) => e.classList.contains('on')).map((e) => e.dataset.beat));
const norm = (s) => s.replace(/\s+/g, ' ').trim();
/** Let the page render `n` more frames (observers and rAF callbacks run in between). */
const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
/** The work line's text as it shows (the crossfade done). */
const workLine = (page) => page.$eval('.anna-window .aw-work-t', (e) => e.textContent.trim());

test('the left copy, verbatim', async () => {
  const { context, page, errors } = await open('');
  const copy = await page.$eval('.anna-window .aw-copy', (el) => ({
    h2: el.querySelector('h2').textContent,
    lead: el.querySelector('.aw-lead').textContent,
    h3: el.querySelector('h3').textContent,
    rules: [...el.querySelectorAll('.aw-rules > li')].map((li) => [li.querySelector('.rule'), li.querySelector('.why'), li.querySelector('.how')].map((x) => x.textContent)),
    closing: el.querySelector('.aw-closing').textContent,
    link: { text: el.querySelector('a.more').textContent, href: el.querySelector('a.more').getAttribute('href'), arrow: el.querySelector('a.more [aria-hidden="true"]')?.textContent },
  }));
  assert.equal(copy.h2, 'ANNA');
  assert.equal(copy.lead, `${annaLead.text}.`);
  assert.equal(copy.h3, 'What she may do, and for whom.');
  assert.deepEqual(copy.rules, [
    ['Everyone gets their own ANNA.', 'Profile, memory and files belong to one person; colleagues never see what you asked.', 'Entra ID identifies every request.'],
    ['Never more than the admin granted.', 'Each connector (hours, leave, documents) is switched on per person or per role.', 'MCP connectors, set per user.'],
    ['Asks before anything that can\'t be undone.', 'Every action she takes leaves a record you and your admin can see.', 'The record is kept by ANNA itself.'],
  ]);
  assert.equal(copy.closing, 'New connectors are built at each company during onboarding.');
  assert.equal(norm(copy.link.text), 'See ANNA at work →');
  assert.equal(copy.link.href, 'https://anna-site.anamata.ai');
  assert.equal(copy.link.arrow, '→');
  // the index of ANNA's card beside her heading, and the copy in order, top to bottom
  assert.equal(await page.$eval('.anna-window .aw-idx', (e) => e.textContent.trim()), '01');
  const text = norm(await page.$eval('.anna-window .aw-copy', (el) => el.textContent));
  let from = 0;
  for (const s of [annaLead.title, `${annaLead.text}.`, annaCalls.heading, ...annaCalls.rules.flatMap((r) => [r.rule, r.why, r.how]), annaCalls.closing, annaCalls.more.label]) {
    const i = text.indexOf(s, from);
    assert.ok(i >= 0, `in order: ${s}`);
    from = i + s.length;
  }
  await context.close();
  assert.deepEqual(errors, []);
});

test('before it plays: the whole conversation is already in the page, in order, out of sight, not announced; no steps list, no record', async () => {
  const { context, page, errors } = await open('');
  const s = await state(page);
  assert.equal(s.t, 0);
  assert.equal(s.beat, null);
  assert.equal(s.done, false);
  const dom = await page.$$eval('.anna-window [data-beat]', (els) => els.map((e) => ({ id: e.dataset.beat, text: e.textContent, on: e.classList.contains('on'), op: +getComputedStyle(e).opacity })));
  assert.deepEqual(dom.map((d) => d.id), BEATS, 'every beat in timeline order; her work is one line');
  assert.ok(dom.every((d) => !d.on && d.op === 0), 'none shown yet');
  const text = norm(dom.map((d) => d.text).join(' '));
  let from = 0;
  for (const s of [annaDemo.person, annaDemo.answer, annaCalls.work.done, annaDemo.question, annaDemo.reply, annaDemo.result]) {
    const i = text.indexOf(s, from);
    assert.ok(i >= 0, `in order: ${s}`);
    from = i + s.length;
  }
  // the steps list and the record left the window (Ezra, 2026-11-11): her result says what she did
  assert.equal(await page.locator('.anna-window .steps, .anna-window .record, .anna-window .rec-head, .anna-window [data-beat="record"]').count(), 0);
  assert.ok(!text.includes(annaDemo.recordHeading) && !annaDemo.record.some((r) => text.includes(r)), 'no record');
  assert.equal(await page.locator('.anna-window [aria-live]').count(), 0, 'nothing announces itself');
  assert.equal(await page.getAttribute('.anna-window .aw-compose', 'aria-hidden'), 'true', 'the typing box is decoration; the sent reply is the text');
  assert.equal(norm(await page.textContent('.anna-window .aw-window .glass-title')), 'Teams · ANNA');
  // in the site's language, not a chat widget's: even corners, the work line a plain line with a dot
  const corners = await page.$$eval('.anna-window .msg .text', (els) => els.map((e) => { const cs = getComputedStyle(e); return new Set([cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomLeftRadius, cs.borderBottomRightRadius]).size; }));
  assert.ok(corners.every((n) => n === 1), `even corners: ${corners}`);
  assert.equal(await page.locator('.anna-window .aw-work .aw-dot[aria-hidden="true"]').count(), 1, 'one dot, decoration');
  assert.ok(+(await page.$eval('.anna-window .aw-compose', (e) => getComputedStyle(e).opacity)) < 0.6, 'the idle box is faded');
  await context.close();
  assert.deepEqual(errors, []);
});

test('scrolled into view it plays once to the end: every beat in order, the reply typed into the box, all of it inside the window', async () => {
  const { context, page, errors } = await open('');
  await intoView(page);
  const y0 = await page.evaluate(() => scrollY);
  // while the reply is being typed, the box shows exactly what has been typed so far
  const mid = await until(page, (s) => s.beat === 'typing' && s.typed > 3);
  const box = await page.evaluate(() => ({ s: window.__annaWindow.state(), text: document.querySelector('.anna-window .aw-typed').textContent }));
  assert.equal(mid.beat, 'typing');
  assert.equal(box.text, annaDemo.reply.slice(0, box.s.typed));
  await page.waitForFunction(() => +getComputedStyle(document.querySelector('.anna-window .aw-compose')).opacity > 0.95, null, { timeout: 3000 }).catch(() => {});
  assert.ok(+(await page.$eval('.anna-window .aw-compose', (e) => getComputedStyle(e).opacity)) > 0.95, 'the box is there while he types');
  assert.equal(await page.$eval('.anna-window [data-beat="reply"]', (e) => e.classList.contains('on')), false, 'not sent yet');
  const end = await until(page, (s) => s.done);
  assert.equal(end.done, true);
  assert.ok(end.t >= 18 && end.t <= 23, `took ${end.t} s`);
  assert.deepEqual(end.seen, SEEN, 'each beat once, in order');
  assert.deepEqual(await onBeats(page), BEATS, 'all shown');
  assert.equal(await page.textContent('.anna-window .aw-typed'), '', 'the box is empty once sent');
  assert.equal(norm(await page.textContent('.anna-window [data-beat="reply"] .text')), annaDemo.reply);
  // no scroll inside the window: every beat lies inside it, and the chat is exactly its content
  const fit = await page.evaluate(() => {
    const w = document.querySelector('.anna-window .aw-window').getBoundingClientRect(), chat = document.querySelector('.anna-window .aw-chat');
    const out = [...chat.querySelectorAll('[data-beat]')].filter((e) => { const r = e.getBoundingClientRect(); return r.top < w.top - 1 || r.bottom > w.bottom + 1; }).map((e) => e.dataset.beat);
    return { out, over: chat.scrollHeight - chat.clientHeight };
  });
  assert.deepEqual(fit.out, [], 'every beat inside the window');
  assert.ok(fit.over <= 1, `nothing to scroll (${fit.over}px)`);
  assert.equal(await page.evaluate(() => scrollY), y0, 'playing never scrolls the page');
  // it does not play again by itself
  await page.evaluate(() => scrollTo(0, 0));
  await frames(page);
  await intoView(page);
  await page.waitForFunction(() => (window.__f = (window.__f || 0) + 1) > 2, null, { polling: 'raf' });
  const after = await state(page);
  assert.equal(after.done, true, 'still finished');
  assert.deepEqual(after.seen, SEEN, 'not played again');
  await context.close();
  assert.deepEqual(errors, []);
});

test('Replay plays it again from the start', async () => {
  const { context, page, errors } = await open('');
  await intoView(page);
  await until(page, (s) => s.done);
  await page.click('.anna-window .aw-replay');
  const again = await until(page, (s) => !s.done && s.t < 3);
  assert.equal(again.done, false);
  assert.ok(again.t < 3, `restarted: ${again.t}`);
  assert.ok(!(await onBeats(page)).includes('result'), 'the end is hidden again');
  const end = await until(page, (s) => s.done);
  assert.equal(end.done, true);
  assert.deepEqual(end.seen, SEEN);
  await context.close();
  assert.deepEqual(errors, []);
});

test('?chat=<seconds> holds one moment: her question, the work line settled', async () => {
  const t = +(AT('question') + 0.5).toFixed(2);
  const { context, page, errors } = await open(`chat=${t}`);
  await intoView(page);
  const s = await until(page, (s) => s.beat === 'question');
  assert.equal(s.beat, 'question');
  assert.equal(s.t, t);
  const on = await onBeats(page);
  assert.ok(on.includes('question') && !on.includes('reply'), on.join());
  assert.equal(await workLine(page), annaCalls.work.done);
  await context.close();
  assert.deepEqual(errors, []);
});

test('the line of work, held at each moment: what she read, each step in turn, then the summary', async () => {
  const ids = ['sources', ...annaCalls.work.lines.slice(1).map((_, i) => `step-${i}`)];
  const holds = [...ids.map((id, i) => [+(AT(id) + 0.9).toFixed(2), annaCalls.work.lines[i]]), [+(AT('question') + 0.9).toFixed(2), annaCalls.work.done]];
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const got = [];
  for (const [t] of holds) {
    await page.goto(`${BASE}/?chat=${t}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__annaWindow);
    got.push(await workLine(page));
  }
  await context.close();
  assert.deepEqual(got, holds.map(([, text]) => text));
});

for (const [width, height] of SIZES) {
  test(`${width} x ${height}: the window never changes size while she works, and her work is one line that fits`, async () => {
    const { context, page, errors } = await open('', { width, height });
    await intoView(page);
    // every frame of the play: the window's size, the work line's height and text, and whether it fits
    const log = await page.evaluate(() => new Promise((done) => {
      const win = document.querySelector('.anna-window .aw-window'), line = document.querySelector('.anna-window .aw-work'), t = line.querySelector('.aw-work-t');
      const out = [];
      const f = () => {
        const w = win.getBoundingClientRect(), l = line.getBoundingClientRect();
        out.push({ w: w.width, h: w.height, lh: l.height, text: t.textContent.trim(), fits: t.scrollWidth <= t.clientWidth + 0.5, shown: line.classList.contains('on'), state: window.__annaWindow.state() });
        if (out.at(-1).state.done) done(out.map(({ state, ...r }) => ({ ...r, t: state.t }))); else requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    }));
    const one = await page.$eval('.anna-window .aw-work', (e) => parseFloat(getComputedStyle(e).lineHeight));
    await context.close();
    assert.ok(log.length > 30, `${log.length} frames`);
    const ws = new Set(log.map((r) => Math.round(r.w))), hs = new Set(log.map((r) => Math.round(r.h)));
    assert.equal(ws.size, 1, `the window's width: ${[...ws]}`);
    assert.equal(hs.size, 1, `the window's height: ${[...hs]}`);
    const lhs = new Set(log.map((r) => Math.round(r.lh)));
    assert.equal(lhs.size, 1, `the line's height: ${[...lhs]}`);
    assert.ok(Math.abs([...lhs][0] - one) <= 1, `one line high (${[...lhs][0]}px against a ${one}px line)`);
    // the texts it showed, in order, and each fits without an ellipsis
    const shown = log.filter((r) => r.shown).map((r) => r.text).filter((x, i, a) => x && x !== a[i - 1]);
    assert.deepEqual(shown, [...annaCalls.work.lines, annaCalls.work.done], 'what she read, each step, then the summary');
    const cut = [...new Set(log.filter((r) => r.shown && !r.fits).map((r) => r.text))];
    assert.deepEqual(cut, [], 'every line fits on one line');
    assert.deepEqual(errors, []);
  });
}

test('the window stands level with her heading, after today\'s stone under the hero', async () => {
  for (const [width, height] of [[1440, 900], [1280, 720]]) {
    const { context, page, errors } = await open('', { width, height });
    const g = await page.evaluate(() => {
      const top = (sel) => document.querySelector(sel).getBoundingClientRect().top + scrollY;
      const cards = [...document.querySelectorAll('[data-glass-moment="hero"] [data-glass="ribbed"]')].map((c) => c.getBoundingClientRect().bottom + scrollY);
      return { win: top('.anna-window .aw-window'), idx: top('.anna-window .aw-idx'), cards: Math.max(...cards) };
    });
    await context.close();
    assert.ok(Math.abs(g.win - g.idx) <= 4, `${width}: the window's top ${g.win} against the index's ${g.idx}`);
    assert.ok(g.win - g.cards < 320, `${width}: the window starts ${Math.round(g.win - g.cards)}px under the cards`);
    assert.deepEqual(errors, []);
  }
});

test('reduced motion: the finished conversation at once, the work line settled and still, nothing typed, no replay', async () => {
  const { context, page, errors } = await open('', { reducedMotion: 'reduce' });
  const s = await until(page, (s) => s.done);
  assert.equal(s.done, true);
  assert.equal(s.typed, 0);
  const ops = await page.$$eval('.anna-window [data-beat]', (els) => els.map((e) => +getComputedStyle(e).opacity));
  assert.ok(ops.every((o) => o === 1), `all shown: ${ops}`);
  assert.equal(await page.textContent('.anna-window .aw-typed'), '');
  assert.equal(await page.isVisible('.anna-window .aw-replay'), false);
  assert.equal(await workLine(page), annaCalls.work.done);
  assert.equal(await page.$eval('.anna-window .aw-dot', (e) => getComputedStyle(e).animationName), 'none', 'the dot does not pulse');
  await context.close();
  assert.deepEqual(errors, []);
});

test('the window is no focus trap: tabbing goes in, then out to the next section\'s first link', async () => {
  const { context, page, errors } = await open('');
  await page.focus('.anna-window .aw-copy a.more');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.matches('.anna-window .aw-replay')), true, 'the next stop is Replay');
  const path = ['in'];
  for (let i = 0; i < 4 && path.at(-1) === 'in'; i++) {
    await page.keyboard.press('Tab');
    path.push(await page.evaluate(() => (document.activeElement.closest('.aw-window') ? 'in' : 'out')));
  }
  assert.equal(path.at(-1), 'out', `and leaves: ${path}`);
  // out of the window, focus lands on the next section's (Projects') first link
  const landed = await page.evaluate(() => {
    const next = document.querySelector('.anna-window').nextElementSibling;
    return { next: next?.querySelector('h2')?.textContent.trim(), first: document.activeElement === next?.querySelector('a[href]'), at: document.activeElement.outerHTML.slice(0, 80) };
  });
  assert.equal(landed.next, homeSections.headings.projects, 'the section after ANNA is Projects');
  assert.equal(landed.first, true, `focus is on its first link, not ${landed.at}`);
  await context.close();
  assert.deepEqual(errors, []);
});

test('the transcript is a region named from config, and nothing in it scrolls (so it needs no keyboard stop of its own)', async () => {
  const { context, page, errors } = await open('chat=30');
  const chat = await page.$eval('.anna-window .aw-chat', (c) => ({ role: c.getAttribute('role'), label: c.getAttribute('aria-label'), tabindex: c.getAttribute('tabindex'), over: c.scrollHeight - c.clientHeight, overflow: getComputedStyle(c).overflowY }));
  await context.close();
  assert.equal(chat.role, 'region');
  assert.equal(chat.label, annaCalls.chat);
  assert.ok(annaCalls.chat?.length > 3, 'the name is in config');
  assert.equal(chat.tabindex, null, 'no tab stop for a box that does not scroll');
  assert.ok(chat.over <= 1 && chat.overflow !== 'auto' && chat.overflow !== 'scroll', JSON.stringify(chat));
  assert.deepEqual(errors, []);
});

test('without JavaScript the whole conversation shows, from its first message, and no dead Replay', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.locator('.anna-window .aw-window').scrollIntoViewIfNeeded();
  const beats = await page.$$eval('.anna-window [data-beat]', (els) => els.map((e) => ({ id: e.dataset.beat, op: +getComputedStyle(e).opacity })));
  assert.deepEqual(beats.map((b) => b.id), BEATS);
  assert.ok(beats.every((b) => b.op === 1), `all shown: ${JSON.stringify(beats)}`);
  assert.equal(norm(await page.textContent('.anna-window .aw-work-t')), annaCalls.work.done, 'the work line, settled');
  const first = await page.evaluate(() => {
    const c = document.querySelector('.anna-window .aw-chat'), f = c.querySelector('[data-beat]');
    const cr = c.getBoundingClientRect(), fr = f.getBoundingClientRect();
    return fr.top >= cr.top - 1 && fr.bottom <= cr.bottom + 1;
  });
  assert.equal(first, true, 'the first message is in view');
  assert.equal(await page.isVisible('.anna-window .aw-replay'), false, 'Replay needs the script');
  await context.close();
});

test('with JavaScript the transcript never shows before playback: hidden from the moment its messages are parsed', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // before any page script: note the section's state the moment each message enters the page
  await context.addInitScript(() => {
    window.__beatsSeen = [];
    const once = new WeakSet();
    new MutationObserver((ms) => {
      for (const m of ms) for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        for (const b of [n, ...n.querySelectorAll('*')].filter((e) => e.matches('.anna-window [data-beat]') && !once.has(e))) {
          once.add(b);
          window.__beatsSeen.push({ id: b.dataset.beat, op: +getComputedStyle(b).opacity, cls: b.closest('.anna-window')?.className ?? '' });
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__glassReady === true);
  const seen = await page.evaluate(() => window.__beatsSeen);
  assert.equal(seen.length, BEATS.length, 'every message observed');
  assert.ok(seen.every((s) => s.op === 0), `hidden as parsed: ${JSON.stringify(seen)}`);
  await context.close();
  assert.deepEqual(errors, []);
});

test('with JavaScript on but the window\'s script never loading, the conversation still shows after load', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  // every script file fails (a blocked or broken bundle); the page's inline scripts still run
  await page.route('**/*', (r) => (r.request().resourceType() === 'script' ? r.abort() : r.continue()));
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => [...document.querySelectorAll('.anna-window [data-beat]')].every((e) => +getComputedStyle(e).opacity === 1), null, { timeout: 10000 }).catch(() => {});
  const ops = await page.$$eval('.anna-window [data-beat]', (els) => els.map((e) => +getComputedStyle(e).opacity));
  assert.ok(ops.every((o) => o === 1), `all shown: ${ops}`);
  await context.close();
});

test('reduced motion switched on after load, before the window is in view: the finished conversation, no replay', async () => {
  const { context, page, errors } = await open('');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const s = await until(page, (s) => s.done, undefined, 5000);
  assert.equal(s.done, true);
  await intoView(page);
  await frames(page);
  assert.deepEqual(await onBeats(page), BEATS);
  assert.equal(await page.isVisible('.anna-window .aw-replay'), false);
  assert.equal(await workLine(page), annaCalls.work.done);
  await context.close();
  assert.deepEqual(errors, []);
});

test('reduced motion switched on mid-play: it stops and shows the end', async () => {
  const { context, page, errors } = await open('');
  await intoView(page);
  await until(page, (s) => s.beat === 'answer');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const s = await until(page, (s) => s.done, undefined, 5000);
  assert.equal(s.done, true);
  assert.ok(s.t >= 18, `jumped to the end: ${s.t}`);
  assert.equal(s.typed, 0);
  assert.equal(await workLine(page), annaCalls.work.done);
  await context.close();
  assert.deepEqual(errors, []);
});

test('the quiet text is readable: at least 4.5:1 against what is behind it', async () => {
  const { context, page, errors } = await open('chat=30');
  await intoView(page);
  await until(page, (s) => s.done);
  await frames(page, 4);
  const SEL = ['.anna-window .msg .who', '.anna-window .aw-replay', '.anna-window .aw-rules .how', '.anna-window .aw-work-t', '.anna-window .msg .text', '.anna-window .glass-title'];
  // each text's own colour, then the same boxes with the text hidden: the pixels behind it
  const items = await page.evaluate((SEL) => SEL.flatMap((sel) => [...document.querySelectorAll(sel)].map((el) => {
    const r = el.getBoundingClientRect();
    return { sel, color: getComputedStyle(el).color, box: { x: r.x, y: r.y, w: r.width, h: r.height } };
  })).filter((i) => i.box.w > 0 && i.box.y >= 0 && i.box.y + i.box.h <= innerHeight), SEL);
  await page.addStyleTag({ content: '.anna-window, .anna-window * { color: transparent !important; caret-color: transparent !important; } .anna-window .aw-dot { visibility: hidden !important; }' });
  await frames(page, 2);
  const png = (await page.screenshot()).toString('base64');
  const worst = await page.evaluate(async ([png, items]) => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
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
      return { sel, ratio: +min.toFixed(2) };
    });
  }, [png, items]);
  assert.ok(worst.length >= 9, `measured ${worst.length}`);
  const low = worst.filter((w) => w.ratio < 4.5);
  assert.deepEqual(low, [], JSON.stringify(low));
  await context.close();
  assert.deepEqual(errors, []);
});

test('phone 390 x 844: copy first, window below, no sideways scroll', async () => {
  const { context, page, errors } = await open('', { width: 390, height: 844 });
  const geo = await page.evaluate(() => {
    const c = document.querySelector('.anna-window .aw-copy').getBoundingClientRect();
    const w = document.querySelector('.anna-window .aw-window').getBoundingClientRect();
    return { copyBottom: c.bottom, winTop: w.top, winLeft: w.left, winRight: w.right };
  });
  assert.ok(geo.winTop >= geo.copyBottom, 'stacked, copy first');
  assert.ok(geo.winLeft >= 0 && geo.winRight <= 390, `window within the screen: ${geo.winLeft}..${geo.winRight}`);
  for (const k of [0, 0.5, 1]) {
    await page.evaluate((k) => { const el = document.querySelector('.anna-window'); scrollTo(0, el.getBoundingClientRect().top + scrollY + k * el.offsetHeight - innerHeight / 2); }, k);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(over <= 0, `at ${k}: ${over}px over`);
  }
  await intoView(page);
  const s = await until(page, (s) => s.done);
  assert.equal(s.done, true);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'still none, finished');
  await context.close();
  assert.deepEqual(errors, []);
});
