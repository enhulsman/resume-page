// The stone article on project pages, in a real browser (openspec stone-inner-pages:
// stone-article-layout and stone-project-pages, chunk 3: the layout, the head, the facts, the
// numbers and the three existing windows). Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/inner-article.e2e.mjs
//
// Test cost: each route loads once per motion setting and is reused across widths with
// setViewportSize; every project page is surveyed in one pass. Waits are on state (fonts, the
// contents link turning current, the window's lines landed), never on a fixed sleep.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { innerGlass, glassCards, hueInk } from '../src/config/glass.ts';
import { projectWindows, annaCalls } from '../src/config/home.ts';
import { pageWords } from '../src/config/pages.ts';
import { readFrontmatter } from '../src/lib/frontmatter.ts';

const BASE = process.env.BASE || 'http://localhost:4321';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const PROJECTS = readdirSync(new URL('../src/pages/projects/', import.meta.url)).filter((f) => f.endsWith('.mdx')).map((f) => `/projects/${f.slice(0, -4)}`);
// The windows built so far: every project page's (chunk 4 added homelab, finance, pytaiga and ANNA's).
const BUILT_WINDOWS = ['henk', 'sandbox', 'bible', 'homelab', 'finance', 'pytaiga', 'anna'];
const windowOf = (route) => (innerGlass[route] ?? []).find((m) => BUILT_WINDOWS.includes(m));
const norm = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const rgb = (s) => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).join(',');

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

// one context per route and motion setting, reused across widths and tests
const pages = new Map();
async function at(path, { width = 1440, height = 900, motion = 'reduce', query = '' } = {}) {
  const key = `${path}?${query}|${motion}`;
  let p = pages.get(key);
  if (!p) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: motion });
    const page = await context.newPage();
    await page.goto(BASE + path + (query ? `?${query}` : ''), { waitUntil: 'load' });
    await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
    await page.evaluate(() => document.fonts.ready);
    p = { context, page };
    pages.set(key, p);
  } else {
    await p.page.setViewportSize({ width, height });
  }
  await p.page.evaluate(() => window.scrollTo(0, 0));
  await frames(p.page);
  return p.page;
}
after(async () => { for (const { context } of pages.values()) await context.close(); });

/** Let the page render `n` more frames (a layout after a resize or a scroll). */
const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
const box = (page, sel) => page.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; });
const barBottom = (page) => page.evaluate(() => document.querySelector('.bar').getBoundingClientRect().bottom);
/** The page's gutters: the bar's content edges, where its name and its button sit. */
const gutters = (page) => page.evaluate(() => {
  const bar = document.querySelector('.bar'), r = bar.getBoundingClientRect(), cs = getComputedStyle(bar);
  return { left: r.left + parseFloat(cs.paddingLeft), right: r.right - parseFloat(cs.paddingRight) };
});
async function scrollToY(page, y) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await frames(page);
}
/** Scroll so an element's top sits at `y` in the viewport. */
async function bringTo(page, sel, y) {
  const top = await page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + scrollY);
  await scrollToY(page, top - y);
}

// ---------- stone-article-layout: the columns ----------

test('Two columns at 1440: the prose at the left gutter, at most 672 px; the aside to its right, about 538 px, at the right gutter', async () => {
  const page = await at('/projects/Henk');
  const g = await gutters(page);
  const prose = await box(page, '.art .prose');
  const aside = await box(page, '.art > aside');
  assert.ok(prose.width <= 672.5, `the prose is ${prose.width}px wide`);
  assert.ok(Math.abs(prose.left - g.left) <= 1, `the prose starts at ${prose.left}, the gutter is ${g.left}`);
  assert.ok(aside.width >= 320 && aside.width <= 576, `the aside is ${aside.width}px wide`);
  // about 538 at this width (531 with the scrollbar's kept room)
  assert.ok(Math.abs(aside.width - 538) <= 10, `about 538 at this width: ${aside.width}`);
  assert.ok(Math.abs(aside.right - g.right) <= 1, `the aside ends at ${aside.right}, the right gutter at ${g.right}`);
  assert.ok(aside.left >= prose.right, 'the prose and the aside do not overlap');
  // the head sits in the prose's column too
  const head = await box(page, '.art-head');
  assert.ok(Math.abs(head.left - g.left) <= 1 && head.right <= prose.left + 672.5);
});

test('The 1000 px boundary: two columns at 1000, one column at 999 within the viewport', async () => {
  const page = await at('/projects/Henk', { width: 1000 });
  let prose = await box(page, '.art .prose');
  const aside = await box(page, '.art > aside');
  assert.ok(aside.left > prose.right, `at 1000 the aside (${aside.left}) stands right of the prose (${prose.right})`);
  assert.ok(aside.width >= 320, `the aside is ${aside.width}px`);
  assert.ok(prose.width >= 480, `the prose is ${prose.width}px`);

  await page.setViewportSize({ width: 999, height: 900 });
  await frames(page);
  prose = await box(page, '.art .prose');
  const win = await box(page, '.art-window');
  const stick = await box(page, '.art-stick');
  assert.ok(win.bottom <= prose.top + 0.5, 'at 999 the window stands over the prose');
  assert.ok(stick.top >= prose.bottom - 0.5, 'and the block under it');
  const vw = await page.evaluate(() => document.documentElement.clientWidth);
  for (const [name, b] of Object.entries({ head: await box(page, '.art-head'), win, prose, stick })) {
    assert.ok(b.left >= 0 && b.right <= vw + 0.5, `${name} lies within the viewport: ${b.left}..${b.right} of ${vw}`);
  }
});

// ---------- every project page, surveyed once at 1440 ----------

let surveyed;
async function survey() {
  if (surveyed) return surveyed;
  surveyed = {};
  for (const route of PROJECTS) {
    const page = await at(route);
    surveyed[route] = await page.evaluate(() => {
      const art = document.querySelector('main article.art');
      const aside = art?.querySelector(':scope > aside');
      const cs = (el, pseudo) => getComputedStyle(el, pseudo);
      const two = (list) => {
        const items = [...(list?.children ?? [])];
        if (items.length < 2) return null;
        const [a, b] = items.map((i) => i.getBoundingClientRect());
        return { sameTop: Math.abs(a.top - b.top) <= 2, rightOf: b.left > a.left };
      };
      const h1 = document.querySelector('main h1');
      return {
        article: !!art,
        oldHead: document.querySelectorAll('table.titleblock, .post-dwg, .sheet-head').length,
        h1: h1 && { text: h1.innerText, family: cs(h1).fontFamily, weight: cs(h1).fontWeight },
        h2Weights: [...document.querySelectorAll('.art .prose h2')].map((h) => cs(h).fontWeight),
        index: art?.querySelector('.art-head .art-idx')?.textContent ?? null,
        beforeH1: h1?.previousElementSibling?.className ?? null,
        lead: art?.querySelector('.art-head .art-lead')?.textContent ?? null,
        asideLabel: aside?.getAttribute('aria-label') ?? null,
        asideFirst: aside?.firstElementChild?.className ?? null,
        glassInAside: aside ? aside.querySelectorAll('[data-glass]').length : -1,
        windowTitles: aside ? [...aside.querySelectorAll('[data-glass="frosted"] .glass-title')].map((t) => t.textContent) : [],
        paneDrawings: aside ? aside.querySelectorAll('.art-window [data-glass="frosted"] svg.dwg').length : 0,
        facts: [...(art?.querySelectorAll('.art-facts > div') ?? [])].map((d) => ({
          label: d.querySelector('dt').textContent, value: d.querySelector('dd').innerText,
          href: d.querySelector('dd a')?.getAttribute('href') ?? null,
          labelAbove: d.querySelector('dt').getBoundingClientRect().bottom <= d.querySelector('dd').getBoundingClientRect().top + 1,
        })),
        factsTwo: two(art?.querySelector('.art-facts')),
        numbersList: art ? art.querySelectorAll('.art-nums').length : 0,
        numbers: [...(art?.querySelectorAll('.art-nums > li') ?? [])].map((li) => {
          const v = li.querySelector('.value'), l = li.querySelector('.label');
          const vr = v.getBoundingClientRect(), lr = l.getBoundingClientRect();
          return {
            value: v.textContent, label: l.textContent,
            weight: +cs(v).fontWeight, tabular: cs(v).fontVariantNumeric.includes('tabular-nums'),
            besideOrUnder: lr.left >= vr.right - 1 || lr.top >= vr.bottom - 1,
            ticks: [li, v, l].flatMap((el) => ['::before', '::after'].map((p) => cs(el, p).content)).filter((c) => c !== 'none' && c !== 'normal'),
          };
        }),
        numbersTwo: two(art?.querySelector('.art-nums')),
        proseDims: document.querySelectorAll('.prose dl.dims').length,
      };
    });
  }
  return surveyed;
}

test('No drawing-sheet head on any project page: no title block, Archivo 900 for the h1, 700 for every prose h2', async () => {
  const s = await survey();
  for (const route of PROJECTS) {
    const p = s[route];
    assert.ok(p.article, `${route} renders the stone article`);
    assert.equal(p.oldHead, 0, `${route}: no table.titleblock, .post-dwg or .sheet-head`);
    assert.match(p.h1.family, /^"?Archivo/, route);
    assert.equal(p.h1.weight, '900', route);
    assert.ok(p.h2Weights.length > 0, `${route} has prose h2s`);
    for (const w of p.h2Weights) assert.equal(w, '700', `${route}: an h2 at ${w}`);
  }
});

test('No window, same column: Encrypted Chat TUI\'s aside holds no glass and opens with the sticky block', async () => {
  const p = (await survey())['/projects/EncryptedChatTUI'];
  assert.equal(p.glassInAside, 0);
  assert.match(p.asideFirst, /\bart-stick\b/);
});

test('The window per page: each project page holds its window in the aside; Encrypted Chat TUI and This site none', async () => {
  const s = await survey();
  for (const [route, id, title] of [
    ['/projects/Henk', 'henk', projectWindows.henk.title], ['/projects/ClaudeSandbox', 'sandbox', projectWindows.sandbox.title],
    ['/projects/BibleTui', 'bible', projectWindows.bible.title], ['/projects/HomelabInfrastructure', 'homelab', 'ezra@workstation: ~'],
    ['/projects/FinanceBot', 'finance', 'Discord · #finance'], ['/projects/PytaigaMcp', 'pytaiga', 'pytaiga-mcp'],
    ['/projects/AnnaAssistant', 'anna', annaCalls.window],
  ]) {
    assert.equal(windowOf(route), id, `innerGlass names ${id} for ${route}`);
    assert.deepEqual(s[route].windowTitles, [title], route);
    assert.match(s[route].asideFirst, /\bart-window\b/, `${route}: the window opens the aside`);
  }
  assert.equal(s['/projects/PytaigaMcp'].paneDrawings, 1, 'pytaiga-mcp\'s pane holds a .dwg drawing');
  for (const route of ['/projects/EncryptedChatTUI', '/projects/ResumePage']) {
    assert.deepEqual(innerGlass[route], [], route);
    assert.equal(s[route].glassInAside, 0, route);
  }
});

test('Facts and numbers in two columns: Homelab\'s, each number heavy and tabular, its label beside or under it', async () => {
  const p = (await survey())['/projects/HomelabInfrastructure'];
  assert.deepEqual(p.factsTwo, { sameTop: true, rightOf: true }, 'facts');
  assert.deepEqual(p.numbersTwo, { sameTop: true, rightOf: true }, 'numbers');
  for (const f of p.facts) assert.ok(f.labelAbove, `${f.label} above its value`);
  for (const n of p.numbers) {
    assert.ok(n.weight >= 800, `${n.value} at ${n.weight}`);
    assert.ok(n.tabular, `${n.value} in tabular figures`);
    assert.ok(n.besideOrUnder, `${n.value}'s label beside or under it`);
  }
});

test('A project without a card: Finance Bot and Encrypted Chat TUI have no index, their hook is the lead', async () => {
  const s = await survey();
  for (const route of ['/projects/FinanceBot', '/projects/EncryptedChatTUI']) {
    const fm = readFrontmatter(read(`src/pages/${route}.mdx`));
    assert.equal(s[route].index, null, `${route} has no index`);
    assert.equal(s[route].beforeH1, null, `${route}: nothing before the h1`);
    assert.equal(s[route].lead, fm.hook, route);
  }
});

test('bible-tui\'s facts: Online since, Stack, Code and Preview, the links without their scheme', async () => {
  const p = (await survey())['/projects/BibleTui'];
  assert.deepEqual(p.facts.map(({ label, value, href }) => [label, norm(value), href]), [
    ['Online since', 'April 2026', null],
    [pageWords.article.stack, 'Rust, ratatui, crossterm, ratzilla, WebAssembly, postcard', null],
    [pageWords.article.code, 'github.com/enhulsman/bible-tui', 'https://github.com/enhulsman/bible-tui'],
    [pageWords.article.preview, 'bible.hulsman.dev', 'https://bible.hulsman.dev'],
  ]);
  for (const f of p.facts) assert.ok(f.labelAbove, `${f.label} above its value`);
});

test('Numbers from the listing: Homelab\'s first three dims', async () => {
  const p = (await survey())['/projects/HomelabInfrastructure'];
  assert.deepEqual(p.numbers.map((n) => [n.value, n.label]), [['4', 'machines, one mesh'], ['7', 'scrape targets'], ['19', 'alert rules, in Grafana']]);
});

test('No ticks, no numbers where there are none: no pseudo-element on a number; ANNA, Encrypted Chat TUI and This site show none; no <StatStrip in src/pages', async () => {
  const s = await survey();
  for (const route of PROJECTS) for (const n of s[route].numbers) assert.deepEqual(n.ticks, [], `${route}: ${n.value} has no tick`);
  for (const route of ['/projects/AnnaAssistant', '/projects/EncryptedChatTUI', '/projects/ResumePage']) {
    assert.equal(s[route].numbersList, 0, `${route} shows no numbers`);
  }
  const walk = (dir) => readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })
    .flatMap((d) => (d.isDirectory() ? walk(`${dir}${d.name}/`) : [`${dir}${d.name}`]));
  assert.deepEqual(walk('src/pages/').filter((f) => read(f).includes('<StatStrip')), []);
});

// ---------- Henk at 1440: the head, the window, the block, the contents ----------

test('Henk\'s head: "02" in his card\'s hue, the title as the h1, then the hook', async () => {
  const page = await at('/projects/Henk');
  const fm = readFrontmatter(read('src/pages/projects/Henk.mdx'));
  const head = await page.evaluate(() => {
    const h = document.querySelector('.art-head');
    return [...h.children].map((el) => ({ tag: el.tagName, cls: el.className, text: el.textContent, color: getComputedStyle(el).color, top: el.getBoundingClientRect().top }));
  });
  assert.deepEqual(head.map((x) => x.tag), ['SPAN', 'H1', 'P']);
  assert.equal(head[0].text, '02');
  assert.equal(rgb(head[0].color), rgb(hueInk(glassCards.find((c) => c.id === 'henk'))));
  assert.equal(head[1].text, fm.title);
  assert.equal(head[2].text, fm.hook);
  assert.ok(head[0].top < head[1].top && head[1].top < head[2].top, 'in that order down the page');
});

test('Henk\'s numbers: his four stats, value and label, in order; no prose dl.dims', async () => {
  const p = (await survey())['/projects/Henk'];
  assert.deepEqual(p.numbers.map((n) => [n.value, n.label]), [
    ['3,660', 'tests, SDK mocked out'],
    ['1', 'owner; everyone else is dropped'],
    ['4', 'egress ports, zero inbound'],
    ['exactly once', 'event replay across restarts'],
  ]);
  assert.equal(p.proseDims, 0);
});

test('Beside the head: the window in the aside, in the first viewport, at most 600 px wide, within 64 px of the h1\'s top', async () => {
  const page = await at('/projects/Henk');
  const win = await box(page, '.art > aside .art-window [data-glass="frosted"]');
  const h1 = await box(page, 'main h1');
  assert.ok(win.top >= 0 && win.top < 900, `the window's top at ${win.top}`);
  assert.ok(win.width <= 600, `the window is ${win.width}px wide`);
  assert.ok(win.top - h1.top <= 64, `its top is ${win.top - h1.top}px below the h1's`);
});

test('It scrolls away: with the second h2 at mid-screen the window has left, never sticky or fixed', async () => {
  const page = await at('/projects/Henk');
  await bringTo(page, '.art .prose h2:nth-of-type(2)', 450);
  const win = await box(page, '.art-window');
  assert.ok(win.bottom < await barBottom(page), `the window's bottom is at ${win.bottom}`);
  const positions = await page.evaluate(() => {
    const out = [];
    for (let el = document.querySelector('.art-window [data-glass]'); el && el.tagName !== 'ASIDE'; el = el.parentElement) out.push(getComputedStyle(el).position);
    return out;
  });
  for (const p of positions) assert.ok(p !== 'sticky' && p !== 'fixed', `a window box is ${p}`);
});

test('It sticks while reading: mid-prose the block\'s top is the bar\'s bottom plus 32 px, position sticky', async () => {
  const page = await at('/projects/Henk');
  const mid = await page.locator('.art .prose').evaluate((p) => { const r = p.getBoundingClientRect(); return r.top + scrollY + r.height / 2; });
  await scrollToY(page, mid - 450);
  const stick = await box(page, '.art-stick');
  const bar = await barBottom(page);
  assert.ok(Math.abs(stick.top - (bar + 32)) <= 2, `the block's top is ${stick.top}, the bar's bottom ${bar}`);
  assert.equal(await page.locator('.art-stick').evaluate((s) => getComputedStyle(s).position), 'sticky');
});

test('The list is the page\'s headings: "On this page", then each h2 with its id, in order; the aside unnamed', async () => {
  const page = await at('/projects/Henk');
  const heads = await page.locator('.art .prose h2').evaluateAll((hs) => hs.map((h) => [h.textContent, `#${h.id}`]));
  assert.deepEqual(heads.map((h) => h[0]), ['What I Built', 'Key Decisions', 'Outcome']);
  const links = await page.locator('.art-toc ol a').evaluateAll((as) => as.map((a) => [a.textContent, a.getAttribute('href')]));
  assert.deepEqual(links, heads);
  const named = await page.locator('.art-toc').evaluate((nav) => {
    const ids = (nav.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
    return { tag: nav.tagName, ariaLabel: nav.getAttribute('aria-label'), name: ids.map((id) => document.getElementById(id)?.textContent).join(' '), visible: ids.every((id) => document.getElementById(id)?.getClientRects().length > 0) };
  });
  assert.deepEqual(named, { tag: 'NAV', ariaLabel: null, name: pageWords.article.contents, visible: true });
  assert.equal(pageWords.article.contents, 'On this page');
  assert.equal((await survey())['/projects/Henk'].asideLabel, null, 'the aside carries no aria-label');
});

test('The current section: none at the top; with the third h2 100 px above mid-screen exactly its link, bold with a dot', async () => {
  const page = await at('/projects/Henk');
  assert.equal(await page.locator('.art-toc a[aria-current]').count(), 0, 'none at the top');
  const target = await page.locator('.art .prose h2').nth(2).evaluate((h) => h.getBoundingClientRect().top + scrollY - (innerHeight / 2 - 100));
  await scrollToY(page, target);
  const top = await page.locator('.art .prose h2').nth(2).evaluate((h) => h.getBoundingClientRect().top);
  assert.ok(Math.abs(top - 350) <= 2, `the third h2's top reached ${top} (the page must scroll that far)`);
  await page.waitForFunction(() => document.querySelectorAll('.art-toc a')[2]?.getAttribute('aria-current') === 'true');
  const links = await page.locator('.art-toc a').evaluateAll((as) => as.map((a) => {
    const b = getComputedStyle(a, '::before');
    return { current: a.getAttribute('aria-current'), weight: +getComputedStyle(a).fontWeight, dot: b.content !== 'none' && b.content !== 'normal', round: b.borderRadius };
  }));
  assert.deepEqual(links.map((l) => l.current), [null, null, 'true']);
  assert.ok(links[2].weight >= 700, `the current link at ${links[2].weight}`);
  assert.ok(links[2].dot && links[2].round === '50%', `its ::before is a dot (${links[2].round})`);
  for (const l of links.slice(0, 2)) assert.ok(l.weight <= 500, `another link at ${l.weight}`);
});

test('Following a link: "Outcome" brings its heading under the bar, in view, and makes its link current', async () => {
  const page = await at('/projects/Henk');
  await page.locator('.art-toc a', { hasText: 'Outcome' }).click();
  await page.waitForFunction(() => document.querySelector('.art-toc a[href="#outcome"]')?.getAttribute('aria-current') === 'true');
  const h = await box(page, '#outcome');
  assert.ok(h.top >= await barBottom(page), `the heading's top at ${h.top} is below the bar`);
  assert.ok(h.bottom <= 900, 'and inside the viewport');
});

test('Order at 390: Henk reads head, window, prose, then the facts; no contents list; no sideways scroll', async () => {
  const page = await at('/projects/Henk', { width: 390, height: 844 });
  const lead = await box(page, '.art-lead');
  const win = await box(page, '.art-window');
  const prose = await box(page, '.art .prose');
  const facts = await box(page, '.art-facts');
  assert.ok(win.top >= lead.bottom, 'the window under the lead');
  assert.ok(prose.top >= win.bottom, 'the prose under the window');
  assert.ok(facts.top >= prose.bottom, 'the facts under the prose');
  assert.equal(await page.locator('.art-toc').isVisible(), false, 'no contents list');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 390);
});

test('Order at 999: Homelab reads head, prose, then the facts; the contents list is display none', async () => {
  const route = '/projects/HomelabInfrastructure';
  const page = await at(route, { width: 999 });
  const lead = await box(page, '.art-lead');
  const prose = await box(page, '.art .prose');
  const facts = await box(page, '.art-facts');
  assert.ok(prose.top >= lead.bottom && facts.top >= prose.bottom);
  if (windowOf(route)) {
    const win = await box(page, '.art-window');
    assert.ok(win.top >= lead.bottom && prose.top >= win.bottom, 'the window between the lead and the prose');
  }
  assert.equal(await page.locator('.art-toc').evaluate((n) => getComputedStyle(n).display), 'none');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 999);
});

// ---------- the window plays (normal motion) ----------

test('The lines land once: Henk\'s chat, out of view at 390, lands when half in view and stays', async () => {
  // a short screen, so the window starts out of view under the head
  const page = await at('/projects/Henk', { width: 390, height: 480, motion: 'no-preference', query: 'speed=10' });
  const play = '.art-window [data-play]';
  assert.ok((await box(page, play)).top > 480, 'the window starts out of view');
  const shown = () => page.locator(`${play} .b`).evaluateAll((bs) => bs.map((b) => getComputedStyle(b).opacity));
  assert.ok((await shown()).every((o) => o === '0'), 'before, its lines are hidden');
  await bringTo(page, play, 100);
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return el.classList.contains('done') && [...el.querySelectorAll('.b')].every((b) => getComputedStyle(b).opacity === '1');
  }, play);
  await scrollToY(page, 0);
  await bringTo(page, play, 100);
  assert.ok((await shown()).every((o) => o === '1'), 'scrolling away and back hides none');
});

test('Henk\'s chat, as on the homepage: projectWindows.henk verbatim, the same text as the homepage\'s window', async () => {
  const page = await at('/projects/Henk', { width: 390, height: 480, motion: 'no-preference', query: 'speed=10' });
  const play = '.art-window [data-play]';
  await bringTo(page, play, 100);
  await page.waitForFunction((sel) => document.querySelector(sel).classList.contains('done'), play);
  const lines = await page.locator(`${play} .b`).evaluateAll((bs) => bs.map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
  const { henk } = projectWindows;
  assert.deepEqual(lines, [
    norm(`${henk.alert.from} ${henk.alert.text}`),
    ...henk.messages.map((m, i) => norm(i === 0 ? `${henk.name} ${m.text}` : m.text)),
  ]);
  const ours = norm(await page.locator(play).textContent());
  const home = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const hp = await home.newPage();
  await hp.goto(`${BASE}/?t=2.4`, { waitUntil: 'load' });
  const theirs = norm(await hp.locator('.pj-w-henk [data-play]').textContent());
  await home.close();
  assert.equal(ours, theirs);
});

// ---------- the diagrams: "View larger" (chunk 5) ----------

const DIAGRAMS = { '/projects/Henk': '.art .prose .henk-flow', '/projects/ClaudeSandbox': '.art .prose .sbx' };
const OPEN = '.art .prose .dv-open';
const DIALOG = 'dialog[data-glass-moment="diagram"]';
/** The diagram in the prose: its rendered svg width and its viewBox width. */
const measure = (page, route) => page.locator(`${DIAGRAMS[route]} svg`).first().evaluate((svg) => ({ drawn: svg.getBoundingClientRect().width, natural: svg.viewBox.baseVal.width }));
const buttons = (page, n) => page.waitForFunction(([sel, n]) => document.querySelectorAll(sel).length === n, [OPEN, n]);
/** The accessible name at the head of an aria snapshot: `- img "name"`. */
const nameOf = (snap) => snap.split('\n')[0].match(/^- \w+ "(.*)"/)?.[1] ?? null;

test('Diagrams: one dialog per page with a diagram, a moment of its own, its panel frosted with no glow; none elsewhere', async () => {
  const s = await survey();
  for (const route of PROJECTS) {
    const page = await at(route);
    const d = await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((dl) => ({
      inMain: !!dl.closest('main'), modal: dl.tagName, frosted: dl.querySelectorAll('[data-glass="frosted"]').length,
      glow: dl.querySelectorAll('[data-glow]').length, close: dl.querySelector('.dv-close')?.textContent.trim() ?? null,
      inAside: !!dl.closest('aside'),
    })), DIALOG);
    if ((innerGlass[route] ?? []).includes('diagram')) {
      assert.deepEqual(d, [{ inMain: true, modal: 'DIALOG', frosted: 1, glow: 0, close: pageWords.article.close, inAside: false }], route);
    } else {
      assert.deepEqual(d, [], `${route} has no diagram dialog`);
    }
    assert.ok(s[route], route);
  }
  assert.equal(pageWords.article.viewLarger, 'View larger');
  assert.equal(pageWords.article.close, 'Close');
});

test('Only where it shrinks: no "View larger" at 1440 (Henk at 440 px and up, the sandbox at 640 and up, a click opens nothing); one under each diagram at 390', async () => {
  for (const [route, min] of [['/projects/Henk', 440], ['/projects/ClaudeSandbox', 640]]) {
    let page = await at(route);
    await buttons(page, 0);
    const m = await measure(page, route);
    assert.ok(m.drawn >= min && m.drawn >= m.natural - 1, `${route} at 1440: drawn ${m.drawn}, natural ${m.natural}`);
    assert.notEqual(await page.locator(`${DIAGRAMS[route]} svg`).evaluate((s) => getComputedStyle(s).cursor), 'zoom-in', `${route}: not clickable at 1440`);
    await page.locator(`${DIAGRAMS[route]} svg`).click();
    await frames(page);
    assert.equal(await page.locator(DIALOG).evaluate((d) => d.open), false, `${route}: clicking the diagram at 1440 opens nothing`);

    page = await at(route, { width: 390, height: 844 });
    await buttons(page, 1);
    const n = await measure(page, route);
    assert.ok(n.drawn < n.natural - 1, `${route} at 390: drawn ${n.drawn}, natural ${n.natural}`);
    const b = await page.locator(OPEN).evaluate((btn, sel) => {
      const fig = document.querySelector(sel), svg = fig.querySelector('svg');
      return { text: btn.textContent.trim(), under: btn.getBoundingClientRect().top >= svg.getBoundingClientRect().bottom, after: fig.nextElementSibling === btn, cursor: getComputedStyle(svg).cursor };
    }, DIAGRAMS[route]);
    assert.deepEqual(b, { text: pageWords.article.viewLarger, under: true, after: true, cursor: 'zoom-in' }, route);
  }
});

test('Resizing across the natural width: Henk\'s button appears at 390 and is gone again at 1440', async () => {
  const page = await at('/projects/Henk');
  await buttons(page, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await buttons(page, 1);
  await frames(page);
  const m = await measure(page, '/projects/Henk');
  assert.ok(Math.abs(m.drawn - 343) <= 16, `drawn about 343 px at 390: ${m.drawn}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await buttons(page, 0);
});

test('Open and close: Tab and Enter, then Escape; the button and "Close"; the button and the backdrop; focus back on the button each time', async () => {
  const route = '/projects/Henk';
  const page = await at(route, { width: 390, height: 844 });
  await buttons(page, 1);
  const prose = await page.locator(`${DIAGRAMS[route]} svg`).evaluate((svg) => ({ width: svg.getBoundingClientRect().width, tab: [svg, svg.closest('.henk-flow')].map((e) => e.getAttribute('tabindex')) }));
  assert.deepEqual(prose.tab, [null, null], 'the diagram itself is no tab stop');
  const proseName = nameOf(await page.locator(`${DIAGRAMS[route]} svg`).ariaSnapshot());
  assert.ok(proseName && proseName.startsWith("Henk's trust boundary"), `the prose diagram's name: ${proseName}`);

  const isOpen = async () => {
    await page.waitForFunction((sel) => document.querySelector(sel).open, DIALOG);
    const st = await page.evaluate((sel) => {
      const d = document.querySelector(sel), copy = d.querySelector('svg');
      return {
        modal: d.matches(':modal'), focusInside: d.contains(document.activeElement),
        copyWidth: copy?.getBoundingClientRect().width ?? 0, panel: d.querySelector('[data-glass]')?.getAttribute('data-glass'),
        ids: [...d.querySelectorAll('[id]')].map((e) => e.id).filter((id) => document.querySelectorAll(`[id="${CSS.escape(id)}"]`).length > 1),
      };
    }, DIALOG);
    assert.ok(st.modal, 'opens modal');
    assert.ok(st.focusInside, 'focus inside it');
    assert.ok(st.copyWidth > prose.width + 1, `the copy (${st.copyWidth}) is wider than the prose's (${prose.width})`);
    assert.equal(st.panel, 'frosted');
    assert.deepEqual(st.ids, [], 'the copy repeats no id of the page');
    assert.equal(await page.getByRole('dialog', { name: proseName, exact: true }).count(), 1, 'the dialog is named by its diagram');
  };
  const isClosed = async () => {
    await page.waitForFunction((sel) => !document.querySelector(sel).open, DIALOG);
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('dv-open')), true, 'focus back on "View larger"');
  };

  // Tab reaches it and Enter opens it; Escape closes
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  let reached = false;
  for (let i = 0; i < 80 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(() => document.activeElement?.classList.contains('dv-open'));
    assert.equal(await page.evaluate(() => document.activeElement?.tagName === 'svg' || !!document.activeElement?.closest?.('.henk-flow')), false, 'Tab never stops on the diagram');
  }
  assert.ok(reached, 'Tab reaches "View larger"');
  await page.keyboard.press('Enter');
  await isOpen();
  await page.keyboard.press('Escape');
  await isClosed();

  // the button, then "Close"
  await page.locator(OPEN).click();
  await isOpen();
  await page.locator(`${DIALOG} .dv-close`).click();
  await isClosed();

  // the button, then the backdrop outside the panel
  await page.locator(OPEN).click();
  await isOpen();
  const panel = await box(page, `${DIALOG} [data-glass="frosted"]`);
  assert.ok(panel.left > 4 || panel.top > 4, 'room outside the panel');
  await page.mouse.click(panel.left > 4 ? 2 : 195, panel.left > 4 ? 422 : 2);
  await isClosed();
});

test('Reduced motion: the sandbox\'s dialog opens with no animation, fully opaque in the first frame (and with motion, it fades)', async () => {
  const look = (page) => page.evaluate(([open, sel]) => {
    document.querySelector(open).click();
    const d = document.querySelector(sel), panel = d.querySelector('[data-glass]');
    const out = { open: d.open, animations: d.getAnimations().length, opacity: [getComputedStyle(d).opacity, getComputedStyle(panel).opacity] };
    d.close();
    return out;
  }, [OPEN, DIALOG]);
  const page = await at('/projects/ClaudeSandbox', { width: 390, height: 844 });
  await buttons(page, 1);
  assert.deepEqual(await look(page), { open: true, animations: 0, opacity: ['1', '1'] });
  // the fade exists, so the check above means something: Henk with motion
  const moving = await at('/projects/Henk', { width: 390, height: 480, motion: 'no-preference', query: 'speed=10' });
  await buttons(moving, 1);
  const m = await look(moving);
  assert.ok(m.open && m.animations >= 1, `with motion the dialog fades in (${m.animations} animations)`);
});

test('The diagram itself has no glass: no data-glass or backdrop-filter on it or any ancestor in main; its labels and caption in Archivo, stone ink', async () => {
  for (const route of Object.keys(DIAGRAMS)) {
    const page = await at(route);
    const d = await page.locator(DIAGRAMS[route]).evaluate((fig) => {
      const chain = [];
      for (let el = fig.querySelector('svg'); el && el.tagName !== 'MAIN'; el = el.parentElement) chain.push(el);
      const texts = [...fig.querySelectorAll('text'), ...fig.querySelectorAll('.flow-caption, figcaption')];
      return {
        glass: chain.filter((el) => el.hasAttribute('data-glass') || getComputedStyle(el).backdropFilter !== 'none').map((el) => el.tagName),
        fonts: [...new Set(texts.map((t) => getComputedStyle(t).fontFamily))],
        inks: [...new Set([...fig.querySelectorAll('text')].map((t) => getComputedStyle(t).fill))],
        caption: [...fig.querySelectorAll('.flow-caption, figcaption')].map((c) => getComputedStyle(c).color),
        texts: texts.length,
      };
    });
    assert.ok(d.texts > 10, `${route}: ${d.texts} texts read`);
    assert.deepEqual(d.glass, [], route);
    for (const f of d.fonts) assert.match(f, /^"?Archivo/, `${route}: a label in ${f}`);
    // stone ink, its quieter greys and the glass red: opaque inks only
    const OK = ['rgb(17, 17, 16)', 'rgb(42, 40, 38)', 'rgb(74, 69, 63)', 'rgb(92, 86, 80)', 'rgb(143, 51, 32)'];
    for (const c of [...d.inks, ...d.caption]) assert.ok(OK.includes(c), `${route}: an ink ${c}`);
  }
});

// ---------- the drawings in panes: "View larger" too (chunk 11; Ezra, 2026-11-10) ----------

const PANE_ROUTES = ['/projects/PytaigaMcp', '/blog/henk-exactly-once'];
const PANE_SVG = '.art-window .dp-body svg.dwg';
const PANE_OPEN = '.art-window .dv-open';

test('Drawings in panes: "View larger" under the pane exactly while its drawing is drawn under its natural width; the dialog holds it whole, named by its title', async () => {
  const seen = {};
  for (const route of PANE_ROUTES) {
    // with motion: the copy must be whole even while the pane's own drawing is still plotting in
    const page = await at(route, { motion: 'no-preference' });
    seen[route] = [];
    for (const [w, h] of [[1440, 900], [390, 844], [1440, 900]]) {
      await page.setViewportSize({ width: w, height: h });
      await frames(page, 3);
      const m = await page.locator(PANE_SVG).evaluate((svg) => ({ drawn: svg.getBoundingClientRect().width, natural: svg.viewBox.baseVal.width }));
      const want = m.drawn < m.natural - 1 ? 1 : 0;
      seen[route].push(`${w}: ${Math.round(m.drawn)}/${m.natural} -> ${want}`);
      if (w === 390) assert.equal(want, 1, `${route} at 390 draws its drawing under its natural width (${m.drawn} of ${m.natural})`);
      await page.waitForFunction(([sel, n]) => document.querySelectorAll(sel).length === n, [PANE_OPEN, want]);
      assert.equal(await page.locator('.art .prose .dv-open').count(), 0, `${route}: no button in the prose`);
      const cursor = await page.locator(PANE_SVG).evaluate((svg) => getComputedStyle(svg).cursor);
      if (want) {
        const b = await page.locator(PANE_OPEN).evaluate((btn) => {
          const stage = document.querySelector('.art-window .dp-stage');
          return { text: btn.textContent.trim(), after: stage.nextElementSibling === btn, under: btn.getBoundingClientRect().top >= stage.querySelector('[data-glass]').getBoundingClientRect().bottom - 0.5, glass: !!btn.closest('[data-glass]') };
        });
        assert.deepEqual(b, { text: pageWords.article.viewLarger, after: true, under: true, glass: false }, `${route} at ${w}`);
        assert.equal(cursor, 'zoom-in', `${route} at ${w}: the drawing is a way in`);
      } else {
        assert.notEqual(cursor, 'zoom-in', `${route} at ${w}: not clickable`);
      }
    }
    // at 390, opened at once on arrival (before the pane's drawing has finished plotting)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 1, PANE_OPEN);
    const title = norm(await page.locator(`${PANE_SVG} title`).textContent());
    const paneWidth = await page.locator(PANE_SVG).evaluate((svg) => svg.getBoundingClientRect().width);
    const opened = await page.evaluate(([open, dialog]) => {
      document.querySelector(open).click();
      const d = document.querySelector(dialog), copy = d.querySelector('.dv-body svg');
      const cs = (el) => getComputedStyle(el);
      return {
        open: d.open, modal: d.matches(':modal'), dwg: copy?.classList.contains('dwg') ?? false, width: copy?.getBoundingClientRect().width ?? 0,
        // whole in the first frame: every path drawn to its end, every label and fill shown
        unplotted: [...copy.querySelectorAll('path')].filter((p) => parseFloat(cs(p).strokeDashoffset) !== 0).length,
        hidden: [...copy.querySelectorAll('text, .fill')].filter((t) => cs(t).opacity !== '1').length,
        paths: copy.querySelectorAll('path').length, texts: copy.querySelectorAll('text').length,
      };
    }, [PANE_OPEN, DIALOG]);
    assert.ok(opened.open && opened.modal && opened.dwg, `${route}: the dialog opens modal on a copy of the drawing`);
    assert.ok(opened.width > paneWidth + 1, `${route}: the copy (${opened.width}) wider than the pane's (${paneWidth})`);
    assert.ok(opened.paths > 5 && opened.texts > 3, `${route}: ${opened.paths} paths, ${opened.texts} labels`);
    assert.equal(opened.unplotted, 0, `${route}: every path drawn`);
    assert.equal(opened.hidden, 0, `${route}: every label and fill shown`);
    assert.equal(await page.getByRole('dialog', { name: title, exact: true }).count(), 1, `${route}: the dialog is named by the drawing's title`);
    await page.locator(`${DIALOG} .dv-close`).click();
    await page.waitForFunction((sel) => !document.querySelector(sel).open, DIALOG);
    // the dialog's close event (which hands focus back) follows the close itself
    const back = await page.waitForFunction((sel) => document.activeElement === document.querySelector(sel), PANE_OPEN, { timeout: 3000 }).then(() => true, () => false);
    assert.equal(back, true, `${route}: focus back on "View larger"`);
  }
  // the rule decides, not a width: at 1440 pytaiga-mcp's drawing (520 wide) is drawn under its size
  // and the exactly-once drawing (400 wide) is not, so the two pages differ there
  assert.notEqual(seen['/projects/PytaigaMcp'][0].endsWith('-> 1'), seen['/blog/henk-exactly-once'][0].endsWith('-> 1'), JSON.stringify(seen));
});

// ---------- stone-project-pages: This site's page speaks stone (chunk 10) ----------

test('The approved texts and no drawing sheet left: This site\'s lead, its five sections in the approved words, the description; no sheet words, no Claude', async () => {
  const HOOK = 'A static-first portfolio at hulsman.dev, built with Astro: plain stone, glass only where something sits behind it, and a fully interactive terminal on the homepage.';
  const IDEA = 'Most résumé sites look like résumé sites: a photo, a headline, a grid of skills. I wanted this one to stray from that and still hold everything a résumé should. The page is stone: warm grey, heavy type, nothing decorative. Glass only appears where something is really behind it: ANNA\'s conversation in Teams, Henk\'s chat in Signal, the homelab\'s own health check. Each project shows its own output instead of a screenshot, with a few soft lights far behind the glass. It started as a set of technical drawings; that version lives on in the git history.';
  const BUILT = 'A site like this only works if it\'s exact, so it\'s tested like something in production. Over a hundred browser tests check what a visitor would notice: that nothing scrolls sideways on a phone, that every window stays readable at every width, that the motion stops when your system asks for less of it.';
  const STACK = 'Astro over Next or Remix because this site has no client-side app state: pages are static HTML with small scripts where interactivity demands it. The glass is one small WebGL shader, about 700 lines with its pane logic, that draws the ribbed and frosted panes and the soft lights behind them; with reduced motion, or on a device too slow for it, every pane holds still. The windows themselves are plain HTML, so the site ships no animation library and no CSS framework (about [N] KB of JavaScript in total). The contact form runs server-side on Cloudflare Workers with the Resend API: no separate backend, no CORS proxy, just an edge function co-deployed with the static assets.';
  const TERMINAL = 'In the homepage\'s About section, beside my notes, a terminal in a frosted window types out a short session as it scrolls into view. After the animation finishes, the blinking cursor is real, and you can type into it. It implements 42 commands in vanilla TypeScript: filesystem navigation over a virtual filesystem (ls, cd, cat resume), unix staples (grep, head, tail, wc, sort, env), fun stuff (cowsay, sl, matrix, neofetch), and routing commands that actually navigate the site. Pipes work end-to-end (cat resume | grep TypeScript | wc -l), alongside tab completion, command history, and aliases. Mobile input uses a transparent overlay with touch gesture detection to separate taps from scrolls. Reliably opening the software keyboard across Android and iOS was the hardest part of the build.';
  const MISSED = [
    'Each link in the top bar glows in its own light when you point at it: the same four lights that sit behind the glass cards at the top of the homepage, one per page.',
    'In the terminal, ask for a dark mode with theme. There is one theme: light.',
  ];
  const DESCRIPTION = 'Astro portfolio in stone and glass: each project shows its own output behind frosted glass, with a 42-command interactive terminal';
  const page = await at('/projects/ResumePage');
  const t = await page.evaluate(() => {
    const prose = document.querySelector('.art .prose');
    const sections = {};
    let cur = null;
    for (const el of prose.children) {
      if (el.tagName === 'H2') { cur = el.textContent.trim(); sections[cur] = []; } else if (cur && el.tagName === 'P') sections[cur].push(el.textContent);
    }
    return {
      meta: document.querySelector('meta[name="description"]')?.getAttribute('content'),
      lead: document.querySelector('.art-lead')?.textContent,
      heads: [...prose.querySelectorAll(':scope > h2')].map((h) => h.textContent.trim()),
      sections,
      prose: prose.textContent,
      facts: document.querySelector('.art-facts')?.textContent ?? '',
      themeCode: [...prose.querySelectorAll('p code')].some((c) => c.textContent === 'theme'),
    };
  });
  assert.equal(t.lead.replace(/[\u2018\u2019]/g, "'"), HOOK, 'the lead is the approved hook');
  assert.equal(t.meta, DESCRIPTION);
  assert.deepEqual(t.heads, ['The Idea', 'Built Like It Matters', 'Stack Choices', 'The Terminal', 'Two Things You Might Have Missed']);
  // the build sets typographic apostrophes; the approved texts are typed with straight ones
  const plain = (x) => norm(x).replace(/[\u2018\u2019]/g, "'");
  const s = Object.fromEntries(Object.entries(t.sections).map(([k, v]) => [k, v.map(plain)]));
  assert.deepEqual(s['The Idea'], [IDEA]);
  assert.equal(s['Built Like It Matters'][0], BUILT, 'the approved opening');
  assert.equal(s['Stack Choices'].length, 1);
  assert.match(s['Stack Choices'][0], /about \d+ KB of JavaScript/, 'a measured number in place of [N]');
  assert.equal(s['Stack Choices'][0].replace(/about \d+ KB of JavaScript/, 'about [N] KB of JavaScript'), STACK);
  assert.deepEqual(s['The Terminal'], [TERMINAL]);
  assert.deepEqual(s['Two Things You Might Have Missed'], MISSED);
  assert.ok(t.themeCode, '`theme` set as code');
  // No drawing sheet left: description, the Stack fact and the prose without the git-history line
  const SHEET = /\b(drawn|drawing|drawings|sheet|sheets|title block|revision table|schedule|perspective|Canvas 2D)\b/i;
  const rest = norm(t.prose).replace('It started as a set of technical drawings; that version lives on in the git history.', '');
  for (const [what, text] of [['description', t.meta], ['facts', t.facts], ['prose', rest]]) assert.doesNotMatch(text, SHEET, what);
  assert.match(t.facts, /WebGL/, 'WebGL in the Stack fact');
  assert.doesNotMatch(t.prose, /Claude|prompt/i, 'the page leaves Claude out');
});
