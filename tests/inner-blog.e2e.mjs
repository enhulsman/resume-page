// A post in the stone article, in a real browser (openspec stone-inner-pages, chunk 6: stone-blog "a
// post" and stone-article-layout on posts): the head, the facts, the window per post, the code in
// frosted windows, the post's project or "Other writing" ending the sticky block, and the phone
// order. And /blog itself (chunk 7: stone-blog "/blog is the titles, large" and "/blog's lights",
// stone-inner-pages "One light per page"). Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/inner-blog.e2e.mjs
//
// Test cost: each route loads once per motion setting and is reused across widths with
// setViewportSize; every published post is surveyed in one pass at 1440 with reduced motion (every
// window finished on arrival). Waits are on state (fonts, a contents link turning current, a
// drawing's `drawn` class), never on a fixed sleep.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { innerGlass, glassCards, hueInk, projectLights, pageLights } from '../src/config/glass.ts';
import { projectWindows, siteNav } from '../src/config/home.ts';
import { pageWords } from '../src/config/pages.ts';
import { readFrontmatter, diaryEntries } from '../src/lib/frontmatter.ts';
import { colours, lightOf, lightStep, textOverLight } from './lib/page-light.mjs';
import { readingMinutes } from '../src/lib/post.ts';
import { buildProjects } from '../src/lib/projects.ts';

const BASE = process.env.BASE || 'http://localhost:4321';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const POSTS = readdirSync(new URL('../src/pages/blog/', import.meta.url))
  .filter((f) => f.endsWith('.mdx') && !f.startsWith('_')).map((f) => `/blog/${f.slice(0, -4)}`);
const fmOf = (route) => readFrontmatter(read(`src/pages${route}.mdx`));
const projectSources = Object.fromEntries(readdirSync(new URL('../src/pages/projects/', import.meta.url))
  .filter((f) => f.endsWith('.mdx')).map((f) => [`../pages/projects/${f}`, read(`src/pages/projects/${f}`)]));
const { details } = buildProjects(projectSources);
const norm = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const rgb = (s) => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).join(',');
const rgba = (c) => `rgba(${c.join(', ')}`;

const WATCHDOG = '/blog/henk-watchdog';
const ONCE = '/blog/henk-exactly-once';
const BIBLE = '/blog/bible-tui';
const SPEC = '/blog/spec-factory';
const SCORE = '/blog/successor-scoreboard';

let browser;
before(async () => { browser = await chromium.launch(); });

// one context per route and motion setting, reused across widths and tests
const pages = new Map();
async function at(path, { width = 1440, height = 900, motion = 'reduce' } = {}) {
  const key = `${path}|${motion}`;
  let p = pages.get(key);
  if (!p) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: motion });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(BASE + path, { waitUntil: 'load' });
    await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
    await page.evaluate(() => document.fonts.ready);
    p = { context, page, errors };
    pages.set(key, p);
  } else {
    await p.page.setViewportSize({ width, height });
  }
  await p.page.evaluate(() => window.scrollTo(0, 0));
  await frames(p.page);
  return p.page;
}
after(async () => {
  const errors = [...pages.values()].flatMap((p) => p.errors);
  for (const { context } of pages.values()) await context.close();
  await browser?.close();
  assert.deepEqual(errors, [], 'no page error on any post');
});

/** Let the page render `n` more frames (a layout after a resize or a scroll). */
const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
const box = (page, sel) => page.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; });
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function scrollToY(page, y) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await frames(page);
}

// ---------- every published post, surveyed once at 1440 ----------

let surveyed;
async function survey() {
  if (surveyed) return surveyed;
  surveyed = {};
  for (const route of POSTS) {
    const page = await at(route);
    surveyed[route] = await page.evaluate(() => {
      const art = document.querySelector('main article.art');
      const aside = art?.querySelector(':scope > aside');
      const stick = aside?.querySelector('.art-stick');
      const cs = (el) => getComputedStyle(el);
      const h1 = document.querySelector('main h1');
      const bar = document.querySelector('.bar'), br = bar.getBoundingClientRect(), bcs = cs(bar);
      const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, width: r.width }; };
      const named = (el) => {
        if (!el) return null;
        const ids = (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
        return { tag: el.tagName, ariaLabel: el.getAttribute('aria-label'), name: ids.map((id) => document.getElementById(id)?.textContent).join(' '), visible: ids.length > 0 && ids.every((id) => document.getElementById(id)?.getClientRects().length > 0) };
      };
      const proj = stick?.querySelector('.art-proj');
      const others = stick?.querySelector('.art-others');
      return {
        article: !!art,
        oldHead: document.querySelectorAll('table.titleblock, .post-dwg, .sheet-head').length,
        tables: art ? art.querySelectorAll('table').length : -1,
        h1: h1 && { text: h1.textContent, family: cs(h1).fontFamily, weight: cs(h1).fontWeight },
        h2Weights: [...document.querySelectorAll('.art .prose h2')].map((h) => cs(h).fontWeight),
        lead: art?.querySelector('.art-head .art-lead')?.textContent ?? null,
        index: art?.querySelector('.art-head .art-idx')?.textContent ?? null,
        gutters: { left: br.left + parseFloat(bcs.paddingLeft), right: br.right - parseFloat(bcs.paddingRight) },
        prose: rect(art?.querySelector('.prose')),
        aside: rect(aside),
        asideLabel: aside?.getAttribute('aria-label') ?? null,
        asideFirst: aside?.firstElementChild?.className ?? null,
        glassInAside: aside ? aside.querySelectorAll('[data-glass]').length : -1,
        windowTitles: aside ? [...aside.querySelectorAll('[data-glass="frosted"] .glass-title')].map((t) => t.textContent) : [],
        paneDrawings: aside ? aside.querySelectorAll('.art-window [data-glass="frosted"] svg.dwg').length : 0,
        moment: aside?.querySelector('.art-window')?.getAttribute('data-glass-moment') ?? null,
        block: [...(stick?.children ?? [])].map((c) => c.className),
        toc: named(stick?.querySelector('.art-toc')),
        facts: [...(art?.querySelectorAll('.art-facts > div') ?? [])].map((d) => ({
          label: d.querySelector('dt').textContent, value: d.querySelector('dd').innerText,
          iso: d.querySelector('dd time')?.getAttribute('datetime') ?? null,
        })),
        numbers: [...(art?.querySelectorAll('.art-nums > li') ?? [])].map((li) => [li.querySelector('.value').textContent, li.querySelector('.label').textContent]),
        project: proj && {
          index: proj.querySelector('.art-proj-idx')?.textContent ?? null,
          indexColor: proj.querySelector('.art-proj-idx') ? cs(proj.querySelector('.art-proj-idx')).color : null,
          links: [...proj.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')]),
          what: proj.querySelector('.art-proj-what')?.textContent ?? null,
          status: proj.querySelector('.art-proj-status')?.textContent ?? null,
        },
        others: others && {
          ...named(others),
          label: others.querySelector('.art-label')?.textContent,
          items: [...others.querySelectorAll('li')].map((li) => ({
            title: li.querySelector('a')?.textContent, href: li.querySelector('a')?.getAttribute('href'),
            date: li.querySelector('time')?.textContent, iso: li.querySelector('time')?.getAttribute('datetime'),
          })),
        },
        blockText: stick?.innerText ?? '',
      };
    });
  }
  return surveyed;
}

test('The head: henk-watchdog\'s h1 reads "Is he asleep?", its description is the lead, no table in the article', async () => {
  const p = (await survey())[WATCHDOG];
  assert.equal(p.h1.text, 'Is he asleep?');
  assert.equal(p.lead, fmOf(WATCHDOG).description);
  assert.equal(p.tables, 0, 'no table in the article');
});

test('No drawing-sheet head on any post: no title block, no .post-dwg, no .sheet-head; Archivo 900 for the h1, 700 for every prose h2', async () => {
  const s = await survey();
  for (const route of POSTS) {
    const p = s[route];
    assert.ok(p.article, `${route} renders the stone article`);
    assert.equal(p.oldHead, 0, route);
    assert.match(p.h1.family, /^"?Archivo/, route);
    assert.equal(p.h1.weight, '900', route);
    assert.ok(p.h2Weights.length > 0, `${route} has prose h2s`);
    for (const w of p.h2Weights) assert.equal(w, '700', `${route}: an h2 at ${w}`);
  }
});

test('The facts: spec-factory\'s Date, Updated and Reading, in order, each time carrying its ISO date', async () => {
  const p = (await survey())[SPEC];
  const minutes = readingMinutes(await (await at(SPEC)).locator('.art .prose').evaluate((el) => el.innerHTML));
  const w = pageWords.article;
  assert.deepEqual(p.facts.map((f) => [f.label, norm(f.value), f.iso]), [
    [w.date, '6 July 2026', '2026-07-06'],
    [w.updated, '15 July 2026', '2026-07-15'],
    [w.reading, `${minutes} ${w.min}`, null],
  ]);
  assert.deepEqual([w.date, w.updated, w.reading, w.min], ['Date', 'Updated', 'Reading', 'min']);
});

test('The window per post: Henk\'s chat, the exactly-once drawing in a pane, bible-tui\'s reader; none without a project', async () => {
  const s = await survey();
  assert.deepEqual(innerGlass[WATCHDOG], ['henk', 'code']);
  assert.deepEqual(s[WATCHDOG].windowTitles, [projectWindows.henk.title]);
  assert.match(s[WATCHDOG].asideFirst, /\bart-window\b/);
  assert.equal(s[WATCHDOG].moment, 'henk');

  assert.deepEqual(innerGlass[ONCE], ['post-drawing']);
  assert.match(s[ONCE].asideFirst, /\bart-window\b/);
  assert.equal(s[ONCE].moment, 'post-drawing');
  assert.equal(s[ONCE].paneDrawings, 1, 'a frosted pane holding one svg.dwg');
  assert.deepEqual(s[ONCE].windowTitles, [''], 'the pane has no title');

  assert.deepEqual(innerGlass[BIBLE], ['bible']);
  assert.deepEqual(s[BIBLE].windowTitles, [projectWindows.bible.title]);
  assert.equal(s[BIBLE].moment, 'bible');

  for (const route of [SPEC, SCORE]) {
    assert.deepEqual(innerGlass[route], [], route);
    assert.equal(s[route].glassInAside, 0, `${route}: no [data-glass] in the right column`);
  }
});

test('The same layout on a post: bible-tui and spec-factory in the two columns of a project page', async () => {
  const s = await survey();
  for (const route of [BIBLE, SPEC]) {
    const { prose, aside, gutters: g } = s[route];
    assert.ok(prose.width <= 672.5, `${route}: the prose is ${prose.width}px wide`);
    assert.ok(Math.abs(prose.left - g.left) <= 1, `${route}: the prose starts at the gutter`);
    assert.ok(aside.width >= 320 && aside.width <= 576, `${route}: the aside is ${aside.width}px wide`);
    assert.ok(Math.abs(aside.right - g.right) <= 1, `${route}: the aside ends at the right gutter`);
    assert.ok(aside.left >= prose.right, `${route}: the prose and the aside do not overlap`);
  }
});

test('No window, same column: spec-factory\'s aside holds no glass and opens with the sticky block', async () => {
  const p = (await survey())[SPEC];
  assert.equal(p.glassInAside, 0);
  assert.match(p.asideFirst, /\bart-stick\b/);
});

test('The order of the block: henk-watchdog\'s contents, facts, number, project; the contents named by its label; the aside unnamed', async () => {
  const p = (await survey())[WATCHDOG];
  assert.deepEqual(p.block.map((c) => c.split(/\s+/)[0]), ['art-toc', 'art-facts', 'art-nums', 'art-proj']);
  assert.deepEqual(p.toc, { tag: 'NAV', ariaLabel: null, name: 'On this page', visible: true });
  assert.equal(p.asideLabel, null);
});

test('Henk beside the watchdog post: "02" in his hue ink, his listing\'s title linked, his what and status, the number 4', async () => {
  const p = (await survey())[WATCHDOG];
  const henk = details.find((d) => d.id === 'henk');
  assert.equal(p.project.index, '02');
  assert.equal(rgb(p.project.indexColor), rgb(hueInk(glassCards.find((c) => c.id === 'henk'))));
  assert.deepEqual(p.project.links, [[henk.title, '/projects/Henk']]);
  assert.equal(p.project.what, henk.what);
  assert.equal(p.project.status, henk.status);
  assert.deepEqual(p.numbers, [['4', 'egress ports, zero inbound']]);
});

test('A project without a card: bible-tui\'s block has no index, links to its page, its what and status', async () => {
  const p = (await survey())[BIBLE];
  const bible = details.find((d) => d.href === '/projects/BibleTui');
  assert.equal(p.project.index, null);
  assert.deepEqual(p.project.links, [[bible.title, '/projects/BibleTui']]);
  assert.equal(p.project.what, bible.what);
  assert.equal(p.project.status, bible.status);
  assert.deepEqual(p.numbers, [[bible.dims[0].value, bible.dims[0].label]]);
});

test('On spec-factory: the block ends with "Other writing", the three newest other posts, each its title and date', async () => {
  const p = (await survey())[SPEC];
  assert.match(p.block.at(-1), /\bart-others\b/, 'it ends the block');
  assert.deepEqual({ tag: p.others.tag, ariaLabel: p.others.ariaLabel, name: p.others.name, visible: p.others.visible }, { tag: 'NAV', ariaLabel: null, name: 'Other writing', visible: true });
  assert.equal(pageWords.article.otherWriting, 'Other writing');
  assert.deepEqual(p.others.items, [
    { title: fmOf(WATCHDOG).title, href: WATCHDOG, date: '9 October 2026', iso: '2026-10-09' },
    { title: fmOf(BIBLE).title, href: BIBLE, date: '16 September 2026', iso: '2026-09-16' },
    { title: fmOf(ONCE).title, href: ONCE, date: '28 August 2026', iso: '2026-08-28' },
  ]);
  // successor-scoreboard has neither a window nor a project, so it ends with the list too
  assert.equal(surveyed[SCORE].others?.items.length, 3, 'successor-scoreboard ends with it too');
});

test('Not where there is a window or a project: no "Other writing" on henk-watchdog, henk-exactly-once or bible-tui', async () => {
  const s = await survey();
  for (const route of [WATCHDOG, ONCE, BIBLE]) {
    assert.equal(s[route].others, null, route);
    assert.doesNotMatch(s[route].blockText, /Other writing/, route);
  }
});

// ---------- the code in frosted windows ----------

const CODE = '[data-glass-moment="code"]';

test('henk-watchdog\'s log line: each pre in a frosted window, three dots, no title, Henk\'s tide beneath, the MDX text; inline code on stone', async () => {
  const page = await at(WATCHDOG);
  const fences = [...read(`src/pages${WATCHDOG}.mdx`).matchAll(/^```[^\n]*\n([\s\S]*?)\n```/gm)].map((m) => m[1]);
  assert.ok(fences.length > 0, 'the post has fenced code');
  const pres = await page.evaluate(() => [...document.querySelectorAll('.art .prose pre')].map((pre) => {
    const win = pre.closest('[data-glass]');
    const moment = pre.closest('[data-glass-moment]');
    const stage = win?.parentElement;
    const glow = stage?.querySelector(':scope > [data-glow]');
    return {
      glass: win?.getAttribute('data-glass') ?? null,
      dots: win?.querySelectorAll('.glass-dots i').length ?? 0,
      title: win?.querySelector('.glass-title')?.textContent ?? null,
      moment: moment?.getAttribute('data-glass-moment') ?? null,
      glow: glow ? getComputedStyle(glow).backgroundImage : '',
      text: pre.innerText,
      color: getComputedStyle(pre.querySelector('span') ?? pre).color,
      family: getComputedStyle(pre).fontFamily,
      wrap: getComputedStyle(pre.querySelector('code') ?? pre).whiteSpace,
    };
  }));
  assert.equal(pres.length, fences.length, 'one window per fenced block');
  const { near, deep } = projectLights.henk;
  pres.forEach((p, i) => {
    assert.equal(p.glass, 'frosted', `pre ${i} in a frosted window`);
    assert.equal(p.dots, 3, 'three dots');
    assert.equal(p.title, '', 'no title');
    assert.equal(p.moment, 'code');
    assert.ok(p.glow.includes(rgba(near)) && p.glow.includes(rgba(deep)), `Henk's tide beneath: ${p.glow}`);
    assert.equal(p.text.replace(/\n+$/, ''), fences[i]);
    assert.equal(rgb(p.color), '58,54,50', 'the opaque artefact ink');
    assert.match(p.family, /monospace/);
    assert.equal(p.wrap, 'pre-wrap', 'it wraps rather than scrolling');
  });
  const inlineOnGlass = await page.evaluate(() => [...document.querySelectorAll('main code')].filter((c) => !c.closest('pre') && c.closest('[data-glass]')).length);
  assert.equal(inlineOnGlass, 0, 'inline code stays on stone');
});

test('Code on a phone: henk-watchdog\'s code windows lie within 0..390, no sideways scroll', async () => {
  const page = await at(WATCHDOG, { width: 390, height: 844 });
  const wins = await page.locator(`${CODE} [data-glass="frosted"]`).evaluateAll((ws) => ws.map((w) => { const r = w.getBoundingClientRect(); return [r.left, r.right]; }));
  assert.ok(wins.length > 0);
  for (const [l, r] of wins) assert.ok(l >= 0 && r <= 390, `a code window at ${l}..${r}`);
  assert.ok(await sideways(page) <= 0, 'no sideways scroll');
});

test('Order at 390: henk-watchdog reads head, window, prose, then the facts and its project; no contents list; no sideways scroll', async () => {
  const page = await at(WATCHDOG, { width: 390, height: 844 });
  const lead = await box(page, '.art-lead');
  const win = await box(page, '.art-window');
  const prose = await box(page, '.art .prose');
  const facts = await box(page, '.art-facts');
  const proj = await box(page, '.art-proj');
  assert.ok(win.top >= lead.bottom, 'the window under the lead');
  assert.ok(prose.top >= win.bottom, 'the prose under the window');
  assert.ok(facts.top >= prose.bottom, 'the facts under the prose');
  assert.ok(proj.top >= facts.bottom, 'the project after them');
  assert.equal(await page.locator('.art-toc').isVisible(), false, 'no contents list');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 390);
});

test('On a phone "Other writing" comes after the prose: spec-factory at 390', async () => {
  const page = await at(SPEC, { width: 390, height: 844 });
  const prose = await box(page, '.art .prose');
  const others = await box(page, '.art-others');
  assert.ok(others.top >= prose.bottom);
  assert.ok(await sideways(page) <= 0);
});

// ---------- henk-exactly-once: its drawing in a frosted pane ----------

const PANE = '.art-window[data-glass-moment="post-drawing"]';

test('The exactly-once pane: dots, no title, Henk\'s tide, its own defs, drawn on arrival with reduced motion', async () => {
  const page = await at(ONCE);
  const p = await page.evaluate((PANE) => {
    const win = document.querySelector(PANE);
    const pane = win.querySelector('[data-glass="frosted"]');
    const svg = pane?.querySelector('svg.dwg');
    const glow = win.querySelector('[data-glow]');
    const hatch = document.getElementById('hatch'), arrow = document.getElementById('arrow');
    return {
      dots: pane?.querySelectorAll('.glass-dots i').length,
      title: pane?.querySelector('.glass-title')?.textContent,
      glow: glow ? getComputedStyle(glow).backgroundImage : '',
      defs: [hatch?.tagName, arrow?.tagName, !!hatch && win.contains(hatch), !!arrow && win.contains(arrow)],
      drawn: svg?.classList.contains('drawn'),
      caption: svg?.querySelector('title')?.textContent ?? '',
      postDwg: document.querySelectorAll('.post-dwg').length,
    };
  }, PANE);
  const { near, deep } = projectLights.henk;
  assert.equal(p.dots, 3, 'window dots');
  assert.equal(p.title, '', 'no title');
  assert.ok(p.glow.includes(rgba(near)) && p.glow.includes(rgba(deep)), `Henk's tide: ${p.glow}`);
  assert.deepEqual(p.defs, ['pattern', 'marker', true, true], 'its own hatch and arrow');
  assert.equal(p.drawn, true, 'drawn on arrival');
  assert.match(p.caption, /cursor/, 'the post\'s own drawing');
  assert.equal(p.postDwg, 0, 'nothing beside the title');
});

test('The post drawing fits: at 390 the drawing inside its pane, the pane within 0..390, no sideways scroll', async () => {
  const page = await at(ONCE, { width: 390, height: 844 });
  const pane = await box(page, `${PANE} [data-glass="frosted"]`);
  const svg = await box(page, `${PANE} svg.dwg`);
  assert.ok(svg.left >= pane.left - 0.5 && svg.right <= pane.right + 0.5 && svg.top >= pane.top - 0.5 && svg.bottom <= pane.bottom + 0.5, 'the drawing inside its pane');
  assert.ok(pane.left >= 0 && pane.right <= 390, `the pane at ${pane.left}..${pane.right}`);
  assert.ok(await sideways(page) <= 0, 'no sideways scroll');
});

test('The current section on henk-exactly-once: none at the top; with the third h2 100 px above mid-screen exactly its link, bold with a dot', async () => {
  const page = await at(ONCE);
  assert.equal(await page.locator('.art-toc a[aria-current]').count(), 0, 'none at the top');
  const target = await page.locator('.art .prose h2').nth(2).evaluate((h) => h.getBoundingClientRect().top + scrollY - (innerHeight / 2 - 100));
  await scrollToY(page, target);
  const top = await page.locator('.art .prose h2').nth(2).evaluate((h) => h.getBoundingClientRect().top);
  assert.ok(Math.abs(top - 350) <= 2, `the third h2's top reached ${top}`);
  await page.waitForFunction(() => document.querySelectorAll('.art-toc a')[2]?.getAttribute('aria-current') === 'true');
  const links = await page.locator('.art-toc a').evaluateAll((as) => as.map((a) => {
    const b = getComputedStyle(a, '::before');
    return { current: a.getAttribute('aria-current'), weight: +getComputedStyle(a).fontWeight, dot: b.content !== 'none' && b.content !== 'normal', round: b.borderRadius };
  }));
  assert.deepEqual(links.map((l) => l.current), [null, null, 'true', null]);
  assert.ok(links[2].weight >= 700 && links[2].dot && links[2].round === '50%');
  for (const l of links.filter((_, i) => i !== 2)) assert.ok(l.weight <= 500, `another link at ${l.weight}`);
});

test('The exactly-once drawing plots in when it comes into view', async () => {
  const page = await at(ONCE, { width: 390, height: 600, motion: 'no-preference' });
  await page.locator(`${PANE} svg.dwg`).evaluate((s) => s.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForFunction((sel) => {
    const svg = document.querySelector(sel);
    return svg.classList.contains('drawn') && [...svg.querySelectorAll('path')].every((q) => (parseFloat(getComputedStyle(q).strokeDashoffset) || 0) === 0);
  }, `${PANE} svg.dwg`, { timeout: 10000 });
});

// ---------- the block ends with the article ----------

test('It stops at the article\'s end: on successor-scoreboard at the bottom the block stays inside the article, clear of the footer', async () => {
  const page = await at(SCORE);
  await scrollToY(page, await page.evaluate(() => document.documentElement.scrollHeight));
  const stick = await box(page, '.art-stick');
  const art = await box(page, 'main article.art');
  const footer = await box(page, 'footer');
  assert.ok(stick.bottom <= art.bottom + 0.5, `the block's bottom ${stick.bottom}, the article's ${art.bottom}`);
  assert.ok(stick.bottom <= footer.top + 0.5, 'it does not overlap the footer');
});

// ---------- /blog: the titles, large, and its lights (chunk 7) ----------

const BLOG = '/blog';
const blogSources = Object.fromEntries(POSTS.concat(readdirSync(new URL('../src/pages/blog/', import.meta.url))
  .filter((f) => f.endsWith('.mdx') && f.startsWith('_')).map((f) => `/blog/${f.slice(0, -4)}`))
  .map((r) => [`./${r.split('/').pop()}.mdx`, read(`src/pages${r}.mdx`)]));
const LIST = '.bl-list > li';

test('/blog, every post, newest first: "Blog", its line, then each published post: date, a large 900 h2 link, its description', async () => {
  const page = await at(BLOG);
  const r = await page.evaluate((LIST) => ({
    h1: document.querySelector('main h1')?.textContent.trim(),
    line: document.querySelector('main h1 + p')?.textContent.trim(),
    entries: [...document.querySelectorAll(LIST)].map((li) => {
      const a = li.querySelector('h2 > a'), cs = getComputedStyle(li.querySelector('h2'));
      return {
        iso: li.querySelector('time')?.getAttribute('datetime'), date: li.querySelector('time')?.textContent.trim(),
        href: a?.getAttribute('href'), title: a?.textContent.trim(),
        weight: +cs.fontWeight, size: parseFloat(cs.fontSize), family: cs.fontFamily,
        lead: li.querySelector('h2 + p')?.textContent.trim(),
        hairline: getComputedStyle(li).borderTopStyle,
      };
    }),
  }), LIST);
  assert.equal(r.h1, siteNav.links.find((l) => l.id === 'blog').label);
  assert.equal(r.line, pageWords.blog.line);
  assert.equal(r.line, 'Notes on infrastructure, tooling, and the occasional detour.');
  assert.deepEqual(r.entries.map((e) => e.href), [WATCHDOG, BIBLE, ONCE, SCORE, SPEC], 'five, newest first');
  const diary = diaryEntries(blogSources);
  assert.equal(diary.length, POSTS.length, 'no draft');
  r.entries.forEach((e, i) => {
    assert.equal(e.iso, diary[i].iso);
    assert.equal(e.date, diary[i].label);
    assert.equal(e.title, diary[i].title);
    assert.equal(e.lead, fmOf(e.href).description, `${e.href}: its description`);
    assert.equal(e.weight, 900, `${e.href}: weight ${e.weight}`);
    assert.ok(e.size >= 36 && e.size <= 64, `${e.href}: ${e.size}px`);
    assert.match(e.family, /^"?Archivo/);
    assert.equal(e.hairline, 'solid', `${e.href}: a hairline above`);
  });
});

test('/blog, the head light is the tide: one [data-page-light] behind the h1, aria-hidden, no pointer, only pageLights.blog\'s colours, still', async () => {
  const page = await at(BLOG);
  const l = await lightOf(page);
  assert.equal(l.count, 1);
  assert.ok(l.inMain && l.h1InHead && l.h1After, 'in the head, before the h1');
  assert.equal(l.ariaHidden, 'true');
  assert.equal(l.pointer, 'none');
  assert.ok(+l.zIndex < 0 && l.headIsolated === 'isolate', `z-index ${l.zIndex} in an isolated head (${l.headIsolated})`);
  assert.match(l.background, /radial-gradient/);
  assert.doesNotMatch(l.background, /linear-gradient|url\(/);
  assert.deepEqual(colours(l.background).sort(), [pageLights.blog.near, pageLights.blog.deep].map((c) => c.join(',')).sort());
  assert.match(l.filter, /blur\(/, 'a wide blur');
  assert.equal(l.animations, 0, 'still');
});

test('/blog: the light soft, behind, silent and the text over it at 4.5:1, at 1440 and 390; on a phone every entry fits and titles wrap', async () => {
  const page = await at(BLOG);
  for (const width of [1440, 390]) {
    const p = await at(BLOG, { width, height: width === 390 ? 844 : 900 });
    const { step, spread } = await lightStep(p);
    assert.ok(step <= 6, `${width}: neighbouring pixels differ by ${step}`);
    assert.ok(spread > 3, `${width}: the light shows (${spread})`);
    for (const t of await textOverLight(p, ['main h1', 'main h1 + p'])) assert.ok(t.ratio >= 4.5, `${width} ${t.sel}: ${t.ratio}`);
    assert.ok(await sideways(p) <= 0, `${width}: no sideways scroll`);
  }
  // on a phone (the page is at 390 now): each entry within 0..390, titles wrap
  const fit = await page.evaluate((LIST) => [...document.querySelectorAll(LIST)].map((li) => {
    const r = li.getBoundingClientRect(), h = li.querySelector('h2');
    const parts = [...li.querySelectorAll('*')].map((e) => e.getBoundingClientRect());
    return { href: li.querySelector('a').getAttribute('href'), left: Math.min(r.left, ...parts.map((b) => b.left)), right: Math.max(r.right, ...parts.map((b) => b.right)), over: h.scrollWidth - h.clientWidth };
  }), LIST);
  assert.equal(fit.length, POSTS.length);
  for (const f of fit) {
    assert.ok(f.left >= 0 && f.right <= 390, `${f.href}: ${f.left}..${f.right}`);
    assert.ok(f.over <= 0, `${f.href}: the title overflows by ${f.over}`);
  }
});

/** A title's glow (its link's ::before): opacity and background. */
const glowOf = (page, href) => page.locator(`${LIST} h2 > a[href="${href}"]`).evaluate((a) => {
  const b = getComputedStyle(a, '::before');
  return { content: b.content, opacity: +b.opacity, background: b.backgroundImage, duration: b.transitionDuration };
});

test('/blog, a title\'s light on hover: Henk\'s tide on "Is he asleep?", none on a post without a project, gone after leaving', async () => {
  const page = await at(BLOG, { motion: 'no-preference' });
  await page.locator(`${LIST} h2 > a[href="${WATCHDOG}"]`).hover();
  await page.waitForFunction((sel) => +getComputedStyle(document.querySelector(sel), '::before').opacity > 0.5, `${LIST} h2 > a[href="${WATCHDOG}"]`);
  const henk = await glowOf(page, WATCHDOG);
  assert.ok(colours(henk.background).includes(projectLights.henk.near.join(',')), henk.background);
  await page.locator(`${LIST} h2 > a[href="${SCORE}"]`).hover();
  const score = await glowOf(page, SCORE);
  assert.ok(score.content === 'none' || score.opacity === 0, `no glow on a post without a project: ${score.content} ${score.opacity}`);
  await page.mouse.move(2, 880);
  // a title without a project has no glow at all (no ::before content); every glow there is fades out
  await page.waitForFunction((LIST) => [...document.querySelectorAll(`${LIST} h2 > a`)]
    .map((a) => getComputedStyle(a, '::before')).every((b) => b.content === 'none' || +b.opacity === 0), LIST);
  assert.equal((await glowOf(page, SCORE)).content, 'none');
});

test('/blog, by keyboard, and still: Tab onto bible-tui\'s title lights its amber; with reduced motion without a transition', async () => {
  for (const motion of ['no-preference', 'reduce']) {
    const page = await at(BLOG, { motion });
    await page.locator(`${LIST} h2 > a[href="${WATCHDOG}"]`).focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('href')), BIBLE, `${motion}: Tab reaches the bible-tui post`);
    if (motion === 'reduce') {
      const g = await glowOf(page, BIBLE);
      assert.equal(g.duration, '0s');
      assert.ok(g.opacity > 0.5, `shows at once: ${g.opacity}`);
    }
    await page.waitForFunction((sel) => +getComputedStyle(document.querySelector(sel), '::before').opacity > 0.5, `${LIST} h2 > a[href="${BIBLE}"]`);
    const g = await glowOf(page, BIBLE);
    assert.ok(colours(g.background).includes(projectLights.bible.near.join(',')), `${motion}: ${g.background}`);
    await page.evaluate(() => document.activeElement?.blur());
  }
});
