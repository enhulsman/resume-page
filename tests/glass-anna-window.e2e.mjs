// ANNA in a glass window, in a real browser. Her section's own tests run on the homepage (`/`),
// where it shipped (openspec stone-glass-homepage, chunk 4): left, what she may do and for whom;
// right, a frosted window where anna-site's 'week' conversation plays once as it comes into view.
// The lab's staging switch stays on /hero-lab until the lab goes (chunk 8). The timeline itself:
// tests/glass-anna-window.test.mjs. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-anna-window.e2e.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { annaDemo } from '../src/config/anna-demo.ts';
import { annaLead, annaCalls } from '../src/config/home.ts';

const BASE = process.env.BASE || 'http://localhost:4321';
const BEATS = ['person', 'answer', 'sources', 'step-0', 'step-1', 'step-2', 'step-3', 'question', 'typing', 'reply', 'result', 'record'];
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
async function until(page, pred, arg, timeout = 30000) {
  await page.waitForFunction(([src, a]) => window.__annaWindow && new Function('s', 'a', `return (${src})(s, a)`)(window.__annaWindow.state(), a), [pred.toString(), arg], { timeout }).catch(() => {});
  return state(page);
}
const intoView = (page) => page.evaluate(() => document.querySelector('.anna-window .aw-window').scrollIntoView({ block: 'center' }));
const onBeats = (page) => page.$$eval('.anna-window [data-beat]', (els) => els.filter((e) => e.classList.contains('on')).map((e) => e.dataset.beat));
const norm = (s) => s.replace(/\s+/g, ' ').trim();
/** Let the page render `n` more frames (observers and rAF callbacks run in between). */
const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
const gapToEnd = (page) => page.$eval('.anna-window .aw-chat', (c) => c.scrollHeight - c.clientHeight - c.scrollTop);
/** Wait until the chat has stopped moving for ten frames. */
const settled = (page) => page.waitForFunction(() => {
  const y = document.querySelector('.anna-window .aw-chat').scrollTop, w = window;
  w.__calm = y === w.__calmY ? (w.__calm || 0) + 1 : 0; w.__calmY = y;
  return w.__calm >= 10;
}, null, { polling: 'raf', timeout: 10000 });
/** The newest shown beat against the chat's visible area: how far its bottom sits above the chat's. */
const newestInView = (page) => page.evaluate(() => {
  const chat = document.querySelector('.anna-window .aw-chat');
  const on = [...chat.querySelectorAll('[data-beat].on')];
  const newest = on.at(-1), c = chat.getBoundingClientRect(), r = newest.getBoundingClientRect();
  return { beat: newest.dataset.beat, above: c.bottom - r.bottom, belowTop: r.top - c.top, gap: chat.scrollHeight - chat.clientHeight - chat.scrollTop };
});

test('lab: ?lab=1 shows the window staging by default; turn, journey and stack stay on the switch', async () => {
  for (const [q, want] of [['', 'window'], ['&anna=window', 'window'], ['&anna=turn', 'turn'], ['&anna=journey', 'journey'], ['&anna=stack', 'stack']]) {
    const { context, page, errors } = await open(`lab=1${q}`, { path: '/hero-lab' });
    for (const [sel, name] of [['.anna-window', 'window'], ['.anna-turn', 'turn'], ['.anna-journey', 'journey'], ['.anna-x', 'stack']]) {
      assert.equal(await page.isVisible(sel), want === name, `${q || 'default'}: ${name}`);
    }
    await context.close();
    assert.deepEqual(errors, []);
  }
  const { context, page } = await open('lab=1', { path: '/hero-lab' });
  const seg = await page.$$eval('.lab a[data-key="anna"]', (as) => as.map((a) => a.dataset.val));
  assert.deepEqual(seg, ['window', 'turn', 'journey', 'stack'], 'window first in the lab bar');
  const active = await page.$eval('.lab a[data-key="anna"][data-val="window"]', (a) => getComputedStyle(a).backgroundColor);
  assert.equal(active, 'rgb(238, 234, 227)', 'and marked as the one showing');
  await context.close();
  const bare = await open('', { path: '/hero-lab' });
  assert.equal(await bare.page.isVisible('.anna-window'), false, 'none without ?lab=1');
  await bare.context.close();
});

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

test('before it plays: the whole conversation is already in the page, in order, out of sight, not announced', async () => {
  const { context, page, errors } = await open('');
  const s = await state(page);
  assert.equal(s.t, 0);
  assert.equal(s.beat, null);
  assert.equal(s.done, false);
  const dom = await page.$$eval('.anna-window [data-beat]', (els) => els.map((e) => ({ id: e.dataset.beat, text: e.textContent, on: e.classList.contains('on'), op: +getComputedStyle(e).opacity })));
  assert.deepEqual(dom.map((d) => d.id), BEATS.filter((b) => b !== 'typing'), 'every beat but the typing, in timeline order');
  assert.ok(dom.every((d) => !d.on && d.op === 0), 'none shown yet');
  const text = norm(dom.map((d) => d.text).join(' '));
  let from = 0;
  for (const s of [annaDemo.person, annaDemo.answer, ...annaDemo.sources, ...annaDemo.steps, annaDemo.question, annaDemo.reply, annaDemo.result, annaDemo.recordHeading, ...annaDemo.record]) {
    const i = text.indexOf(s, from);
    assert.ok(i >= 0, `in order: ${s}`);
    from = i + s.length;
  }
  assert.equal(await page.locator('.anna-window [aria-live]').count(), 0, 'nothing announces itself');
  assert.equal(await page.getAttribute('.anna-window .aw-compose', 'aria-hidden'), 'true', 'the typing box is decoration; the sent reply is the text');
  assert.equal(norm(await page.textContent('.anna-window .aw-window .glass-title')), 'Teams · ANNA');
  // in the site's language, not a chat widget's: the sources as one plain line, even corners, no chips
  assert.equal(norm(await page.textContent('.anna-window .aw-log .sources')), `Read: ${annaDemo.sources.join(' · ')}`);
  const corners = await page.$$eval('.anna-window .msg .text, .anna-window .record', (els) => els.map((e) => { const cs = getComputedStyle(e); return new Set([cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomLeftRadius, cs.borderBottomRightRadius]).size; }));
  assert.ok(corners.every((n) => n === 1), `even corners: ${corners}`);
  assert.equal(await page.$$eval('.anna-window .aw-log .sources *', (els) => els.filter((e) => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)').length), 0, 'no chips');
  assert.ok(+(await page.$eval('.anna-window .aw-compose', (e) => getComputedStyle(e).opacity)) < 0.6, 'the idle box is faded');
  await context.close();
  assert.deepEqual(errors, []);
});

test('scrolled into view it plays once to the end: every beat in order, the reply typed into the box, newest in view', async () => {
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
  assert.ok(end.t >= 12 && end.t <= 19, `took ${end.t} s`);
  assert.deepEqual(end.seen, BEATS, 'each beat once, in order');
  assert.deepEqual(await onBeats(page), BEATS.filter((b) => b !== 'typing'), 'all shown');
  assert.equal(await page.textContent('.anna-window .aw-typed'), '', 'the box is empty once sent');
  assert.equal(norm(await page.textContent('.anna-window [data-beat="reply"] .text')), annaDemo.reply);
  // the window keeps its height and has scrolled itself to the newest beat, all of it in view
  await settled(page);
  assert.ok(await page.$eval('.anna-window .aw-chat', (c) => c.scrollHeight > c.clientHeight), 'more conversation than window: it has to scroll');
  const v = await newestInView(page);
  assert.equal(v.beat, 'record');
  assert.ok(v.gap <= 1, `scrolled to the end (${v.gap}px left; 1 px is layout rounding)`);
  assert.ok(v.above >= 8, `the newest beat's bottom sits ${v.above}px inside the chat`);
  assert.equal(await page.evaluate(() => scrollY), y0, 'following the chat never scrolls the page');
  // it does not play again by itself
  await page.evaluate(() => scrollTo(0, 0));
  await frames(page);
  await intoView(page);
  await page.waitForFunction(() => (window.__f = (window.__f || 0) + 1) > 2, null, { polling: 'raf' });
  const after = await state(page);
  assert.equal(after.done, true, 'still finished');
  assert.deepEqual(after.seen, BEATS, 'not played again');
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
  assert.ok(!(await onBeats(page)).includes('record'), 'the end is hidden again');
  const end = await until(page, (s) => s.done);
  assert.equal(end.done, true);
  assert.deepEqual(end.seen, BEATS);
  await context.close();
  assert.deepEqual(errors, []);
});

test('?chat=<seconds> holds one moment', async () => {
  const { context, page, errors } = await open('chat=8.4');
  await intoView(page);
  const s = await until(page, (s) => s.beat === 'question');
  assert.equal(s.beat, 'question');
  assert.equal(s.t, 8.4);
  const on = await onBeats(page);
  assert.ok(on.includes('question') && !on.includes('reply'), on.join());
  await context.close();
  assert.deepEqual(errors, []);
});

test('reduced motion: the finished conversation at once, nothing typed, no replay', async () => {
  const { context, page, errors } = await open('', { reducedMotion: 'reduce' });
  const s = await until(page, (s) => s.done);
  assert.equal(s.done, true);
  assert.equal(s.typed, 0);
  const ops = await page.$$eval('.anna-window [data-beat]', (els) => els.map((e) => +getComputedStyle(e).opacity));
  assert.ok(ops.every((o) => o === 1), `all shown: ${ops}`);
  assert.equal(await page.textContent('.anna-window .aw-typed'), '');
  assert.equal(await page.isVisible('.anna-window .aw-replay'), false);
  await context.close();
  assert.deepEqual(errors, []);
});

test('the window is no focus trap: tabbing goes in and out again', async () => {
  const { context, page, errors } = await open('');
  await page.focus('.anna-window .aw-copy a.more');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.matches('.anna-window .aw-replay')), true, 'the next stop is Replay');
  const path = ['in'];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    path.push(await page.evaluate(() => (document.activeElement.closest('.aw-window') ? 'in' : 'out')));
  }
  assert.equal(path.at(-1), 'out', `and leaves: ${path}`);
  await context.close();
  assert.deepEqual(errors, []);
});

test('reduced motion switched on after load, before the window is in view: the finished conversation, no replay', async () => {
  const { context, page, errors } = await open('');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const s = await until(page, (s) => s.done, undefined, 5000);
  assert.equal(s.done, true);
  await intoView(page);
  await frames(page);
  assert.deepEqual(await onBeats(page), BEATS.filter((b) => b !== 'typing'));
  assert.equal(await page.isVisible('.anna-window .aw-replay'), false);
  await page.waitForFunction(() => { const c = document.querySelector('.anna-window .aw-chat'); return c.scrollHeight - c.clientHeight - c.scrollTop < 4; }, null, { timeout: 5000 }).catch(() => {});
  assert.ok(await gapToEnd(page) < 4, 'at the end');
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
  assert.ok(s.t >= 15, `jumped to the end: ${s.t}`);
  assert.equal(s.typed, 0);
  await context.close();
  assert.deepEqual(errors, []);
});

test('the reader can scroll back mid-play; it is not pulled down again, nor on coming back into view', async () => {
  const { context, page, errors } = await open('');
  await intoView(page);
  await until(page, (s) => s.beat === 'result');
  const box = await page.locator('.anna-window .aw-chat').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const top0 = await page.$eval('.anna-window .aw-chat', (c) => c.scrollTop);
  await page.mouse.wheel(0, -120);
  // the wheel scrolls smoothly: wait until it has moved and then held still for ten frames
  await page.waitForFunction((top0) => {
    const y = document.querySelector('.anna-window .aw-chat').scrollTop, w = window;
    w.__still = y === w.__lastY ? (w.__still || 0) + 1 : 0; w.__lastY = y;
    return y < top0 - 40 && w.__still >= 10;
  }, top0, { polling: 'raf', timeout: 5000 }).catch(() => {});
  const read = await page.$eval('.anna-window .aw-chat', (c) => c.scrollTop);
  assert.ok(read < top0 - 40, `the reader scrolled up (${top0} -> ${read})`);
  const end = await until(page, (s) => s.done);
  assert.equal(end.done, true);
  await frames(page, 10);
  const now = await page.$eval('.anna-window .aw-chat', (c) => c.scrollTop);
  assert.ok(Math.abs(now - read) < 2, `left where the reader put it (${read} -> ${now})`);
  assert.ok(await gapToEnd(page) > 50, 'the end is below, unread');
  // away and back: still where the reader left it
  await page.evaluate(() => scrollTo(0, 0));
  await frames(page);
  await intoView(page);
  await frames(page, 10);
  assert.ok(Math.abs(await page.$eval('.anna-window .aw-chat', (c) => c.scrollTop) - read) < 2, 'no snap on re-entry');
  await context.close();
  assert.deepEqual(errors, []);
});

// At every size the spec names, the finished conversation ends with its newest beat wholly in
// view, and a window made shorter afterwards scrolls to keep it there. The follow eases towards
// its target in sub-pixel steps; the browser rounds scrollTop, so it must never stall a few
// pixels short (the lab's flaky 4-5 px).
for (const [width, height] of SIZES) {
  test(`${width} x ${height}: the newest beat stays wholly in view, also in a shorter window`, async () => {
    const { context, page, errors } = await open('', { width, height });
    await intoView(page);
    assert.equal((await until(page, (s) => s.done, undefined, 40000)).done, true);
    await settled(page);
    const v = await newestInView(page);
    assert.equal(v.beat, 'record');
    assert.ok(v.gap <= 1, `scrolled to the end (${v.gap}px left; 1 px is layout rounding)`);
    assert.ok(v.above >= 8 && v.belowTop >= 0, `wholly inside the chat (${v.belowTop}px below its top, ${v.above}px above its bottom)`);
    const h0 = await page.$eval('.anna-window .aw-chat', (c) => c.clientHeight);
    await page.setViewportSize({ width, height: Math.round(height * 0.72) });
    await page.waitForFunction((h0) => document.querySelector('.anna-window .aw-chat').clientHeight < h0 - 40, h0, { timeout: 5000 }).catch(() => {});
    assert.ok(await page.$eval('.anna-window .aw-chat', (c) => c.clientHeight) < h0 - 40, 'the window got shorter');
    await page.waitForFunction(() => { const c = document.querySelector('.anna-window .aw-chat'); return c.scrollHeight - c.clientHeight - c.scrollTop <= 1; }, null, { timeout: 5000 }).catch(() => {});
    await settled(page);
    const w = await newestInView(page);
    assert.ok(w.gap <= 1, `scrolled to the end again (${w.gap}px left)`);
    assert.ok(w.above >= 8, `the newest beat's bottom sits ${w.above}px inside the chat`);
    await context.close();
    assert.deepEqual(errors, []);
  });
}

test('the quiet text is readable: at least 4.5:1 against what is behind it', async () => {
  const { context, page, errors } = await open('chat=16');
  await intoView(page);
  await until(page, (s) => s.done);
  await frames(page, 4);
  const SEL = ['.anna-window .msg .who', '.anna-window .rec-head', '.anna-window .aw-replay', '.anna-window .aw-rules .how', '.anna-window .aw-log .sources', '.anna-window .steps li', '.anna-window .record li', '.anna-window .glass-title'];
  // each text's own colour, then the same boxes with the text hidden: the pixels behind it
  const items = await page.evaluate((SEL) => SEL.flatMap((sel) => [...document.querySelectorAll(sel)].map((el) => {
    const r = el.getBoundingClientRect();
    return { sel, color: getComputedStyle(el).color, box: { x: r.x, y: r.y, w: r.width, h: r.height } };
  })).filter((i) => i.box.w > 0 && i.box.y >= 0 && i.box.y + i.box.h <= innerHeight), SEL);
  await page.addStyleTag({ content: '.anna-window, .anna-window * { color: transparent !important; caret-color: transparent !important; } .steps li::before { content: none !important; }' });
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
  assert.ok(worst.length >= 8, `measured ${worst.length}`);
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
