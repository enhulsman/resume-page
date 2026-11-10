// The glass as site code (openspec stone-glass-homepage, glass-material): what may be glass, the
// one-moment check, the slow-device guard's decision, the shared inks on glass, the no-WebGL
// fallback. The model's own tests (unlit pane, lit seam, loop closes, distance 1) stay in
// tests/glass-hero.test.mjs.
//
//   node --test tests/glass-home.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { glassMoments, glassCards, fallbackFor, windowGlows } from '../src/config/glass.ts';
import { momentsOverlap, visibleShare } from './lib/moments.mjs';
import { slowFrom } from '../src/scripts/glass/guard.js';
import { parseColor, contrast } from './lib/contrast.mjs';
import * as home from '../src/config/home.ts';
import site from '../src/config/site.ts';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const list = (dir, ext) => (existsSync(new URL(dir, root)) ? readdirSync(new URL(dir, root)).filter((f) => f.endsWith(ext)).map((f) => `${dir}${f}`) : []);

// ---- what may be glass ----

test('the list in config: exactly the hero, ANNA and the terminal, in that order', () => {
  assert.deepEqual(glassMoments, ['hero', 'anna', 'terminal']);
});

test('the shipped picks: each card at Ezra\'s distance, Homelab\'s sun nearer still', () => {
  assert.deepEqual(glassCards.map((c) => c.distance), [0.35, 0.8, 0.5, 0.45]);
  const homelab = glassCards.find((c) => c.id === 'homelab');
  assert.equal(homelab.tune[0].dist, 0.45, 'the sun layer');
  for (const c of glassCards) assert.ok(c.distance >= 0 && c.distance <= 1.5, `${c.id} within 0..1.5`);
});

// ---- one moment per screen ----

test('the overlap check itself: a window close under the hero shares the screen, one far enough does not', () => {
  assert.equal(momentsOverlap([200, 530], [630, 1230], 900), true);
  assert.equal(momentsOverlap([200, 530], [1150, 1750], 900), false);
  // order does not matter: the upper box is found from the offsets
  assert.equal(momentsOverlap([630, 1230], [200, 530], 900), true);
  assert.equal(momentsOverlap([1150, 1750], [200, 530], 900), false);
  // the edge: (b0 + hB/3) - (a1 - hA/3) equal to the viewport still overlaps
  // a = [0, 300] (a1 - hA/3 = 200), b = [1000, 1300] (b0 + hB/3 = 1100): 900 apart
  assert.equal(momentsOverlap([0, 300], [1000, 1300], 900), true);
  assert.equal(momentsOverlap([0, 300], [1000.5, 1300.5], 900), false);
});

test('the visible share of a glass box, for the scroll walk', () => {
  assert.equal(visibleShare([200, 530], 0, 900), 1);
  assert.equal(visibleShare([1000, 1300], 0, 900), 0);
  assert.ok(Math.abs(visibleShare([800, 1100], 0, 900) - 1 / 3) < 1e-9);
  assert.equal(visibleShare([0, 2000], 500, 900), 900 / 2000);
});

// ---- the slow-device guard's decision ----

/** Samples from `from` to `to` seconds (both ends included), every `interval` ms or as near as divides evenly. */
function run(from, to, interval, draw) {
  const n = Math.max(1, Math.round(((to - from) * 1000) / interval));
  const step = (to - from) / n;
  return Array.from({ length: n + 1 }, (_, k) => ({ t: from + k * step, interval: step * 1000, draw }));
}

test('a capped frame rate is not a slow device: 30 Hz with cheap draws stays', () => {
  assert.equal(slowFrom(run(0, 3, 33, 5)), false);
});

test('expensive drawing is a slow device', () => {
  assert.equal(slowFrom(run(0, 3, 16, 30)), true);
});

test('the interval never counts, only the draw time', () => {
  assert.equal(slowFrom(run(0, 3, 200, 5)), false, 'a long gap between frames is not slow drawing');
  assert.equal(slowFrom(run(0, 3, 60, 21)), true, 'draws over 20 ms are, whatever the frame rate');
  assert.equal(slowFrom(run(0, 3, 16, 20)), false, '20 ms itself is not over the line');
});

test('the first second and the window are ignored', () => {
  const settle = [...run(0, 0.99, 16, 40), ...run(1, 3, 16, 5)];
  assert.equal(slowFrom(settle), false, 'expensive draws before t = 1 s do not count');
  const old = [...run(1, 1.9, 16, 30), ...run(2, 4, 16, 5)];
  assert.equal(slowFrom(old), false, 'expensive draws more than 2 s before the last sample do not count');
});

test('no verdict before a full window', () => {
  const early = run(1, 1.2, 16, 60);
  assert.equal(slowFrom(early), false);
  assert.equal(slowFrom([...early, ...run(1.216, 3.1, 16, 60)]), true);
  assert.equal(slowFrom(run(0, 2.9, 16, 60)), false, 'never before t = 3 s');
  assert.equal(slowFrom(run(2, 3.5, 16, 60)), false, 'eligible samples must span 2 s, not just reach t = 3 s');
  assert.equal(slowFrom([]), false);
});

// ---- the shared inks on glass ----

/** Rules of a stylesheet, @media and @supports flattened; @font-face and @keyframes skipped. */
function rules(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    const body = css.slice(open + 1, j - 1);
    const at = head.match(/@[\w-]+/)?.[0];
    if (at === '@media' || at === '@supports' || at === '@layer' || at === '@container') out.push(...rules(body));
    else if (!at) out.push({ selector: head.replace(/:global\(([^()]*)\)/g, '$1').replace(/^[;}\s]+/, ''), body });
    i = j;
  }
  return out;
}
const styleBlocks = (src) => [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
const colorOf = (body) => body.match(/(?<![-\w])color\s*:\s*([^;]+)/)?.[1].replace(/!important/, '').trim();

// every stylesheet and <style> block the homepage can use: the site's sheets, the layout, the
// stone components and the page itself
const sources = [
  ...list('src/styles/', '.css').map((p) => ({ path: p, css: read(p) })),
  ...[...list('src/layouts/', '.astro'), ...list('src/components/stone/', '.astro'), 'src/pages/index.astro']
    .map((p) => ({ path: p, css: styleBlocks(read(p)) })),
];
const GLASS_FILES = ['src/components/stone/GlassCard.astro', 'src/components/stone/GlassWindow.astro'];
const glassRules = sources.flatMap((s) => rules(s.css).filter((r) => GLASS_FILES.includes(s.path) || /\[data-glass|\.glass-/.test(r.selector)).map((r) => ({ ...r, path: s.path })));
const items = (r) => r.selector.split(',').map((x) => x.trim());
/** Custom properties defined anywhere in the sources, for resolving var(). */
const props = Object.fromEntries(sources.flatMap((s) => [...s.css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)].map((m) => [m[1], m[2].trim()])));
const resolve = (v) => { let k = 0; while (v && /^var\(/.test(v) && k++ < 5) v = props[v.match(/^var\((--[\w-]+)/)[1]]; return v; };

test('the tokens are opaque, defined once, in stone.css, and read at 4.5:1 on white and on stone', () => {
  for (const token of ['--glass-ink-quiet', '--glass-ink-red']) {
    const defs = sources.flatMap((s) => [...s.css.matchAll(new RegExp(`${token}\\s*:\\s*([^;}]+)`, 'g'))].map((m) => ({ path: s.path, value: m[1].trim() })));
    assert.equal(defs.length, 1, `${token} defined exactly once (${defs.map((d) => d.path).join(', ')})`);
    assert.equal(defs[0].path, 'src/styles/stone.css');
    const c = parseColor(defs[0].value);
    assert.ok(c, `${token}: ${defs[0].value} is a plain colour`);
    assert.equal(c[3], 1, `${token} is opaque`);
    for (const ground of ['#FFFFFF', '#EEEAE3']) {
      const k = contrast(c.slice(0, 3), ground);
      assert.ok(k >= 4.5, `${token} ${defs[0].value} on ${ground}: ${k.toFixed(2)}:1`);
    }
  }
  assert.equal(parseColor(props['--glass-ink-quiet']).slice(0, 3).join(), parseColor('#5C5650').slice(0, 3).join(), 'quiet starts at #5C5650');
  assert.equal(parseColor(props['--glass-ink-red']).slice(0, 3).join(), parseColor('#8F3320').slice(0, 3).join(), 'red starts at #8F3320');
});

/** The colour every glass rule that ends in `target` sets: all of them, and at least one. */
function inksFor(target) {
  const hits = glassRules.filter((r) => items(r).some((s) => s === target || s.endsWith(` ${target}`) || s.endsWith(`>${target}`)) && colorOf(r.body));
  return hits.map((r) => colorOf(r.body));
}

test('the texts the lab coloured with alpha inks, and the terminal\'s dim text, use --glass-ink-quiet', () => {
  for (const target of ['.glass-title', '.aw-replay', '.msg .who', '.sources', '.rec-head', '.terminal-dim']) {
    const inks = inksFor(target);
    assert.ok(inks.length, `${target} has a colour on glass`);
    for (const ink of inks) assert.equal(ink, 'var(--glass-ink-quiet)', `${target}: ${ink}`);
  }
});

test('the terminal\'s prompt and error use --glass-ink-red', () => {
  for (const target of ['.terminal-user', '.terminal-separator', '.terminal-path', '.terminal-dollar', '.terminal-error']) {
    const inks = inksFor(target);
    assert.ok(inks.length, `${target} has a colour on glass`);
    for (const ink of inks) assert.equal(ink, 'var(--glass-ink-red)', `${target}: ${ink}`);
  }
});

test('texts already in a darker opaque ink keep it: the steps and the record\'s items', () => {
  assert.deepEqual(inksFor('.steps').map((c) => c.toLowerCase()), ['#4a453f']);
  assert.deepEqual(inksFor('.record ul').map((c) => c.toLowerCase()), ['#3a3632']);
});

test('no text inside a glass object is set in an alpha-blended colour', () => {
  assert.ok(glassRules.length > 10, 'the glass rules were found');
  for (const r of glassRules) {
    const v = colorOf(r.body);
    if (!v) continue;
    const c = parseColor(resolve(v) ?? '');
    if (!c) continue; // inherit, currentColor
    assert.equal(c[3], 1, `${r.path}: ${r.selector} { color: ${v} }`);
  }
});

// ---- without WebGL ----

test('each card\'s no-WebGL ground is a soft radial gradient of its own light\'s colour', () => {
  for (const c of glassCards) {
    const bg = fallbackFor(c);
    assert.match(bg, /radial-gradient/, c.id);
    assert.doesNotMatch(bg, /linear-gradient|conic-gradient/, `${c.id}: no hard shapes`);
    // the light's colour is the card's own: its hard-edged layer's
    const layer = c.tune.find((t) => t?.set?.color2) ?? c.tune.find((t) => t?.set?.color);
    assert.ok(bg.includes(`rgb(${layer.set.color.join(' ')}`), `${c.id}: ${bg}`);
    // soft: every gradient fades out to nothing, never a hard stop
    for (const g of bg.match(/radial-gradient\((?:[^()]|\([^()]*\))*\)/g)) assert.match(g, /\/ 0\)\s*100%\)$/, `${c.id}: ${g}`);
  }
});

// ---- the frosted windows' glows ----

test('each window has a glow of soft radial lights in config: the flame for ANNA, the four cards for the terminal', () => {
  assert.deepEqual(Object.keys(windowGlows).sort(), ['cards', 'flame']);
  assert.equal(windowGlows.flame.lights.length, 3);
  assert.equal(windowGlows.cards.lights.length, 4);
  for (const g of Object.values(windowGlows)) {
    for (const l of g.lights) {
      assert.equal(l.color.length, 3);
      assert.ok(l.opacity > 0 && l.opacity < 1, 'faint, never a solid panel');
    }
    assert.ok(g.blur >= 20, 'blurred well past any edge');
  }
});

// ---- the components and the driver, as written ----

test('GlassCard: ribbed, its canvas hidden from readers, its text real HTML', () => {
  const src = read('src/components/stone/GlassCard.astro');
  assert.match(src, /data-glass"?\s*[:=]\s*"ribbed"/);
  assert.match(src, /<canvas aria-hidden="true"/);
  assert.match(src, /\{card\.title\}/);
  assert.match(src, /\{card\.readout\}/);
});

test('GlassWindow: frosted, a title bar, a hidden glow beneath it', () => {
  const src = read('src/components/stone/GlassWindow.astro');
  assert.match(src, /data-glass="frosted"/);
  assert.match(src, /data-glow aria-hidden="true"/);
  assert.match(src, /class="glass-title"/);
  assert.match(src, /backdrop-filter/);
});

test('panes.js mounts every ribbed pane and drops the lab\'s dial, look and hooks', () => {
  const src = read('src/scripts/glass/panes.js');
  assert.match(src, /\[data-glass="ribbed"\]/);
  assert.match(src, /from '\.\/guard\.js'/);
  assert.doesNotMatch(src, /#blur|dataset\.look|tuneBefore|paneFor|redrawPane/);
  assert.doesNotMatch(src, /function slowFrom/, 'the decision lives in guard.js only');
  assert.match(src, /guard/);
});

test('model.js says which features only the retired stagings used', () => {
  const src = read('src/scripts/glass/model.js');
  assert.match(src, /retired ANNA stagings/);
});

// ---- the hero arrives, the old homepage leaves (chunk 2) ----

const { details } = home;
const homeSections = home.homeSections ?? {};

test('readouts from the project data: ANNA is "In production", every other card one of its project\'s dims verbatim', () => {
  assert.equal(glassCards[0].id, 'anna');
  assert.equal(glassCards[0].readout, 'In production');
  for (const c of glassCards.slice(1)) {
    const d = details.find((x) => x.id === c.id);
    assert.ok(d, `${c.id} has a listing in home.ts`);
    assert.ok(d.dims.some((dim) => c.readout.includes(dim.value)), `${c.id}: "${c.readout}" holds one of ${d.dims.map((x) => x.value).join(', ')}`);
  }
});

test('headings and labels live in config: homeSections', () => {
  assert.deepEqual(
    [homeSections.headings.projects, homeSections.headings.experience, homeSections.headings.writing, homeSections.headings.about, homeSections.headings.contact],
    ['Projects', 'Experience', 'Writing', 'About', 'Contact'],
  );
  assert.deepEqual([homeSections.links.projects, homeSections.links.resume, homeSections.links.writing], ['See all projects', 'Full résumé', 'All writing']);
  assert.equal(homeSections.now, 'now');
  assert.equal(homeSections.terminalTitle, 'ezra@hulsman: ~');
  assert.equal(homeSections.photoAlt, 'Ezra Hulsman, photographed from below');
  // the hero's lines, moved from the lab unchanged
  assert.equal(homeSections.role, `${site.role} at ${site.company}.`);
  assert.equal(homeSections.intro.replace(/ /g, ' '), 'I build ANNA, an AI assistant in Microsoft Teams that does the admin no one should spend their day on.');
});

test('homeDim: pytaiga-mcp shows its third dimension on the homepage; its dims keep their order for /projects', () => {
  const py = details.find((d) => d.id === 'pytaiga');
  assert.equal(py.homeDim, 2);
  assert.equal(py.dims[py.homeDim].value, '50 → 5');
  assert.deepEqual(py.dims.map((d) => d.value), ['11', '3', '50 → 5']);
  for (const d of details.filter((x) => x.id !== 'pytaiga')) assert.equal(d.homeDim, undefined, `${d.id} defaults to 0`);
});

test('the homepage is the stone hero: Hero.astro from config, panes.js, none of the drawing sheets', () => {
  const index = read('src/pages/index.astro');
  assert.match(index, /import Hero from "\.\.\/components\/stone\/Hero\.astro"/);
  assert.match(index, /scripts\/glass\/panes\.js/);
  assert.doesNotMatch(index, /components\/overzicht\/(YouSheet|AnnaSection|DetailsSheet|RegisterSheet|RevisionsSheet|NotesSheet|ContactSheet)/);
  assert.doesNotMatch(index, /overzicht\/(intro|main)\.js/);
  const hero = read('src/components/stone/Hero.astro');
  assert.match(hero, /data-glass-moment="hero"/);
  assert.match(hero, /\{site\.name\}/, 'the h1 is site.name');
  assert.match(hero, /glassCards\.map/);
  assert.match(hero, /<GlassCard /);
  assert.doesNotMatch(hero, /data-glare|glare/, 'the name is plain');
});

test('the arrival is gone: no html.intro in the layout or the sheet, no intro.js, no wait for ovz:arrived', () => {
  assert.equal(existsSync(new URL('src/scripts/overzicht/intro.js', root)), false);
  const layout = read('src/layouts/OverzichtLayout.astro');
  assert.doesNotMatch(layout, /classList\.add\('intro'\)|ovz:arrived|ovz-arrived|ovzEarly/);
  assert.doesNotMatch(read('src/styles/overzicht.css'), /html\.intro/);
  assert.doesNotMatch(read('src/components/overzicht/Terminal.astro'), /ovz:arrived|classList\.contains\('intro'\)/);
  // its suites went with it
  assert.equal(existsSync(new URL('tests/intro.e2e.mjs', root)), false);
  assert.equal(existsSync(new URL('tests/overzicht.e2e.mjs', root)), false);
  assert.doesNotMatch(JSON.parse(read('package.json')).scripts['test:e2e'], /intro\.e2e|overzicht\.e2e/);
});

// ---- ANNA's section (chunk 4, anna-section) ----

import { coverer, strings } from './lib/copy.mjs';

test('the copy check covers joined config values and catches a typed-in word', () => {
  const check = coverer(['Made in Utrecht by', 'Ezra Hulsman', 'Blog', 'Proverbs 3:5-7', home.annaLead.text]);
  assert.equal(check('Projects'), 'Projects', 'a heading typed into the markup');
  assert.equal(check('See all'), 'See all', 'a link label typed inside a mapped list');
  assert.equal(check('Blogs about'), 'Blogs about', 'a corpus value inside a longer word is not removed');
  assert.equal(check('Made in Utrecht by Ezra Hulsman.'), null, 'the footer line, joined with a full stop');
  assert.equal(check(`${home.annaLead.text}.`), null, 'the lead and its full stop');
  assert.equal(check('Ezra Hulsman · Blog'), null, 'values joined by punctuation');
  assert.equal(check('01 → 4'), null, 'no letters, nothing to cover');
  assert.deepEqual(strings({ a: 'x', b: ['y', { c: 'z' }], n: 3 }), ['x', 'y', 'z']);
});

test('nothing on the homepage imports the four levels: the page and the stone components', () => {
  const files = ['src/pages/index.astro', ...list('src/components/stone/', '.astro')];
  assert.ok(files.length >= 4, files.join());
  for (const f of files) assert.doesNotMatch(read(f), /annaLevels/, f);
});

// glass.ts still feeds the lab's exploded stack (annaExploded) from annaLevels; that export leaves
// with the lab in chunk 8, and this test then passes: drop the todo there.
test('nothing on the homepage imports the four levels: glass.ts', { todo: 'annaExploded leaves glass.ts in chunk 8' }, () => {
  assert.doesNotMatch(read('src/config/glass.ts'), /annaLevels/);
});

test('AnnaSection: one frosted window from config, the moment named, the window driver reused', () => {
  const src = read('src/components/stone/AnnaSection.astro');
  assert.match(src, /data-glass-moment="anna"/);
  assert.match(src, /<GlassWindow /);
  assert.match(src, /title=\{annaCalls\.window\}/);
  assert.match(src, /glow="flame"/);
  assert.match(src, /\{annaLead\.title\}/, 'the heading and her message name');
  assert.match(src, /\{annaDemo\.who\}/, 'his message name');
  assert.doesNotMatch(src, /data-glass="/, 'the one glass object is GlassWindow\'s');
  const index = read('src/pages/index.astro');
  assert.match(index, /import AnnaSection from "\.\.\/components\/stone\/AnnaSection\.astro"/);
  assert.match(index, /scripts\/glass\/anna-window\.js/);
});

// ---- Projects, Experience, Writing (chunk 5): type on stone ----

import { buildProjects, homeRows } from '../src/lib/projects.ts';
import { diaryEntries, latestEntries } from '../src/lib/frontmatter.ts';
import { hueInk } from '../src/config/glass.ts';
import { experience } from '../src/config/resume.ts';

const projectSources = Object.fromEntries(list('src/pages/projects/', '.mdx').map((p) => [p, read(p)]));
const blogSources = Object.fromEntries(list('src/pages/blog/', '.mdx').map((p) => [p, read(p)]));
const cardIds = glassCards.map((c) => c.id);
const listing = (id) => details.find((d) => d.id === id);

test('the rows: the hero-card projects first in card order with their index, then the rest in home.ts order; no ANNA, no hidden ones', () => {
  const { details: joined, register } = buildProjects(projectSources);
  const rows = homeRows(joined, register, cardIds);
  assert.deepEqual(rows.map((r) => r.title), [
    listing('henk').title, listing('homelab').title, listing('sandbox').title,
    'Finance Bot', 'bible-tui', 'pytaiga-mcp', 'Encrypted Chat TUI',
  ]);
  assert.deepEqual(rows.map((r) => r.index ?? null), ['02', '03', '04', null, null, null, null]);
  assert.ok(!rows.some((r) => r.title === 'This site' || r.title === home.annaLead.title));
  // each row is its listing joined to its page: link, line and status, nothing rewritten
  for (const r of rows) {
    const src = [...joined, ...register].find((p) => p.href === r.href);
    assert.ok(src, r.href);
    assert.equal(r.title, src.title);
    assert.equal(r.what, src.what);
    assert.equal(r.status, src.status);
    assert.match(r.status, /\d{4}/, `${r.title}: a status from its page's frontmatter`);
  }
});

test('the number is the project\'s: dims[homeDim ?? 0] with its label; the register\'s entries have none', () => {
  const { details: joined, register } = buildProjects(projectSources);
  const rows = homeRows(joined, register, cardIds);
  assert.deepEqual(rows.map((r) => r.number?.value ?? null), ['4', '4', '3,700', '0.75', '102', '50 → 5', null]);
  for (const r of rows.filter((x) => x.number)) {
    const d = details.find((x) => x.href === r.href);
    assert.deepEqual(r.number, d.dims[d.homeDim ?? 0], r.title);
  }
});

test('a number changes at its source: a changed dims[homeDim] shows in its row with no other edit', () => {
  const { details: joined, register } = buildProjects(projectSources);
  const changed = joined.map((d) => (d.id === 'pytaiga' || d.id === 'henk'
    ? { ...d, dims: d.dims.map((x, i) => (i === (d.homeDim ?? 0) ? { ...x, value: d.id === 'henk' ? '5' : '60 → 6' } : x)) }
    : d));
  const rows = homeRows(changed, register, cardIds);
  assert.equal(rows.find((r) => r.title === 'pytaiga-mcp').number.value, '60 → 6');
  assert.equal(rows.find((r) => r.href === listing('henk').href).number.value, '5');
  // and the untouched rows are as they were
  assert.equal(rows.find((r) => r.title === 'bible-tui').number.value, '102');
});

test('the index mark\'s colour is its card\'s light, darkened only as far as 4.5:1 on stone', () => {
  const hue = ([r, g, b]) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return 0;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  for (const c of glassCards.filter((x) => x.id !== 'anna')) {
    const ink = parseColor(hueInk(c));
    assert.ok(ink && ink[3] === 1, `${c.id}: ${hueInk(c)} is an opaque colour`);
    const k = contrast(ink.slice(0, 3), '#EEEAE3');
    assert.ok(k >= 4.5, `${c.id}: ${k.toFixed(2)}:1 on stone`);
    assert.ok(k < 6.5, `${c.id}: not darkened past what it needs (${k.toFixed(2)}:1)`);
    const layer = c.tune.find((t) => t?.set?.color2);
    const from = layer.set.color2;
    const dh = Math.abs(hue(from) - hue(ink));
    assert.ok(Math.min(dh, 360 - dh) < 4, `${c.id}: hue ${hue(ink).toFixed(0)} keeps its light's ${hue(from).toFixed(0)}`);
  }
});

test('a new post: first in Writing, at most five, each with its line, never a draft', () => {
  const sources = {
    ...blogSources,
    './blog/a-new-post.mdx': '---\ntitle: "A new post"\ndescription: "described"\ndiary: "One line about it"\ndate: 2099-01-01\n---\nbody',
    './blog/_a-newer-draft.mdx': '---\ntitle: "A newer draft"\ndiary: "not yet"\ndate: 2100-01-01\n---\nbody',
  };
  const list5 = latestEntries(sources);
  assert.deepEqual(list5, diaryEntries(sources).slice(0, 5), 'Writing is diaryEntries(...).slice(0, 5), no sorting of its own');
  assert.equal(list5[0].title, 'A new post');
  assert.equal(list5[0].line, 'One line about it');
  assert.ok(list5.length <= 5 && list5.length >= 1, `${list5.length} entries`);
  for (const e of list5) {
    assert.ok(e.line, `${e.title} has its line`);
    assert.ok(!e.href.includes('/_'), `${e.href} is no draft`);
  }
  // the real list today: the five newest published posts
  assert.deepEqual(latestEntries(blogSources), diaryEntries(blogSources).slice(0, 5));
});

test('Projects, Experience and Writing: type on stone from their sources, no glass, after ANNA in the page', () => {
  const read_ = (n) => read(`src/components/stone/${n}.astro`);
  for (const n of ['Projects', 'Experience', 'Writing']) {
    const src = read_(n);
    assert.doesNotMatch(src, /data-glass|GlassWindow|GlassCard|<canvas|backdrop-filter/, `${n} has no glass`);
    assert.doesNotMatch(src, /\.sort\(/, `${n} sorts nothing of its own`);
    assert.match(src, /homeSections\.headings\./, `${n}'s heading from config`);
  }
  assert.match(read_('Projects'), /homeRows\(/);
  assert.match(read_('Projects'), /homeSections\.links\.projects/);
  assert.match(read_('Experience'), /experience/);
  assert.match(read_('Experience'), /homeSections\.now/);
  assert.match(read_('Experience'), /homeSections\.links\.resume/);
  assert.match(read_('Writing'), /latestEntries\(/);
  assert.match(read_('Writing'), /homeSections\.links\.writing/);
  const index = read('src/pages/index.astro');
  const at = (tag) => index.indexOf(`<${tag} />`);
  for (const tag of ['AnnaSection', 'Projects', 'Experience', 'Writing']) assert.ok(at(tag) > 0, `${tag} on the page`);
  assert.ok(at('AnnaSection') < at('Projects') && at('Projects') < at('Experience') && at('Experience') < at('Writing'), 'in order');
  assert.ok(experience.length >= 1);
});

// ---- About and Contact (chunk 6) ----

test('Contact\'s link labels live in config, moved from the old contact sheet', () => {
  assert.deepEqual(home.homeSections.contact, { message: 'Send a message', linkedin: 'LinkedIn', github: 'GitHub' });
  assert.equal(typeof home.homeSections.terminalInput, 'string', 'the terminal\'s input label');
});

test('About: the notes, the photo with its alt from config, the terminal in a frosted window over the four lights, its reflections', () => {
  const src = read('src/components/stone/About.astro');
  assert.match(src, /data-glass-moment="terminal"/);
  assert.match(src, /<GlassWindow /);
  assert.match(src, /title=\{homeSections\.terminalTitle\}/);
  assert.match(src, /glow="cards"/);
  assert.match(src, /<GlassCard [^>]*mini/, 'the reflection minis');
  assert.match(src, /glassCards\.map/);
  assert.match(src, /<Terminal /);
  assert.match(src, /notes\.map/);
  assert.match(src, /alt=\{homeSections\.photoAlt\}/);
  assert.match(src, /homeSections\.headings\.about/);
  assert.doesNotMatch(src, /data-glass="/, 'its glass objects are GlassWindow\'s and GlassCard\'s');
});

test('Contact: the address as a mailto link, then the contact page, LinkedIn and GitHub; no glass', () => {
  const src = read('src/components/stone/Contact.astro');
  assert.match(src, /mailto:\$\{site\.social\.email\}/);
  assert.match(src, /\{site\.social\.email\}/);
  assert.match(src, /site\.social\.LinkedIn/);
  assert.match(src, /site\.social\.GitHub/);
  assert.match(src, /homeSections\.contact\./);
  assert.match(src, /homeSections\.headings\.contact/);
  assert.doesNotMatch(src, /data-glass|GlassWindow|GlassCard|<canvas|backdrop-filter/, 'no contact strip');
});

test('the page ends with About, then Contact', () => {
  const index = read('src/pages/index.astro');
  const at = (tag) => index.indexOf(`<${tag} />`);
  for (const tag of ['Writing', 'About', 'Contact']) assert.ok(at(tag) > 0, `${tag} on the page`);
  assert.ok(at('Writing') < at('About') && at('About') < at('Contact'), 'in order');
});

test('the terminal listens for reduced motion switched on, and its window version has no drawing-sheet head', () => {
  const anim = read('src/scripts/terminal-animation.ts');
  assert.match(anim, /addEventListener\('change'/, 'a change listener on the reduced-motion query');
  assert.doesNotMatch(read('src/components/overzicht/Terminal.astro'), /term-head/);
});

test('the terminal\'s theme command no longer switches anything: the theme helper is gone', () => {
  const term = read('src/scripts/interactive-terminal.ts');
  assert.doesNotMatch(term, /lib\/theme|setTheme|getCurrentTheme/);
  assert.match(term, /commands\.set\('theme'/, 'the command stays, and answers');
  assert.equal(existsSync(new URL('src/lib/theme.ts', root)), false);
});
