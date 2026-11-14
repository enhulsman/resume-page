// The inner pages' config and pure helpers (openspec stone-inner-pages, chunk 1): which glass each
// inner route holds, the page lights and the project lights, the two new windows' text, the levels'
// names, the labels in config, and the article side's data (facts, numbers, contents, other writing).
//
//   node --test tests/inner-pages.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { innerGlass, pageLights, projectLights, windowGlows, glassCards, benched } from '../src/config/glass.ts';
import { projectWindows, annaLevels, details, register } from '../src/config/home.ts';
import { pageWords } from '../src/config/pages.ts';
import { factsOf, numbersOf, contentsOf, otherWriting, bare, plainLocation } from '../src/lib/article.ts';
import { buildProjects } from '../src/lib/projects.ts';
import { readFrontmatter } from '../src/lib/frontmatter.ts';
import site from '../src/config/site.ts';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const mdx = (dir) => readdirSync(new URL(dir, root)).filter((f) => f.endsWith('.mdx'));
const projectSources = Object.fromEntries(mdx('src/pages/projects/').map((f) => [`/src/pages/projects/${f}`, read(`src/pages/projects/${f}`)]));
const blogSources = Object.fromEntries(mdx('src/pages/blog/').map((f) => [`/src/pages/blog/${f}`, read(`src/pages/blog/${f}`)]));

/** Every string value in an object, walked. */
const stringsOf = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(stringsOf) : v && typeof v === 'object' ? Object.values(v).flatMap(stringsOf) : []);

/** HSL of an RGB triple: hue in degrees, saturation 0..1. */
const hsl = ([r, g, b]) => {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn, l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
};
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

// ---- stone-inner-pages: inner-page glass is listed per route ----

test('Every route has an entry: innerGlass covers every built inner route and only those', () => {
  const built = [
    '/projects', '/blog', '/resume', '/contact',
    ...mdx('src/pages/projects/').map((f) => `/projects/${f.replace(/\.mdx$/, '')}`),
    ...mdx('src/pages/blog/').filter((f) => !f.startsWith('_')).map((f) => `/blog/${f.replace(/\.mdx$/, '')}`),
  ].sort();
  assert.deepEqual(Object.keys(innerGlass).sort(), built);
});

test('innerGlass lists each route\'s moments top to bottom, as the spec names them', () => {
  assert.deepEqual(innerGlass, {
    '/projects': ['anna', 'project-cards'],
    '/projects/AnnaAssistant': ['anna'],
    '/projects/Henk': ['henk', 'diagram'],
    '/projects/ClaudeSandbox': ['sandbox', 'diagram'],
    '/projects/BibleTui': ['bible'],
    '/projects/HomelabInfrastructure': ['homelab'],
    '/projects/FinanceBot': ['finance'],
    // the drawings in panes get "View larger" too (Ezra, 2026-11-10, chunk 11): the dialog is a moment
    '/projects/PytaigaMcp': ['pytaiga', 'diagram'],
    '/projects/EncryptedChatTUI': [],
    '/projects/HerdrAndroid': [],
    '/projects/ResumePage': [],
    '/blog': [],
    '/resume': [],
    '/blog/spec-factory': [],
    '/blog/successor-scoreboard': [],
    '/blog/henk-watchdog': ['henk', 'code'],
    '/blog/henk-exactly-once': ['post-drawing', 'diagram'],
    '/blog/bible-tui': ['bible'],
    '/blog/herdr-android': [],
    '/contact': ['compose'],
  });
});

// ---- stone-inner-pages: one light per page ----

test('Lights in config (page lights): projects, blog, resume, contact; each near colour its hero card\'s first light', () => {
  assert.deepEqual(Object.keys(pageLights), ['projects', 'blog', 'resume', 'contact']);
  const first = (id) => glassCards.find((c) => c.id === id).tune[0].set.color;
  const card = { projects: 'anna', blog: 'henk', resume: 'homelab', contact: 'sandbox' };
  for (const [page, l] of Object.entries(pageLights)) {
    assert.deepEqual(l.near, first(card[page]), `${page}: near`);
    assert.equal(l.deep.length, 3, `${page}: a deep colour`);
    for (const v of [...l.near, ...l.deep]) assert.ok(Number.isInteger(v) && v >= 0 && v <= 255, `${page}: ${v}`);
  }
  assert.deepEqual(pageLights.projects.near, [242, 168, 112], 'ANNA\'s flame');
  assert.deepEqual(pageLights.blog.near, [128, 170, 226], 'Henk\'s tide');
  assert.deepEqual(pageLights.resume.near, [255, 180, 104], 'Homelab\'s sunset');
  assert.deepEqual(pageLights.contact.near, [196, 214, 160], 'Claude Sandbox\'s moss');
});

// ---- stone-projects-index: each project has its own light ----

test('Lights in config (projects): one per project except ANNA, the hero three their cards\', no two alike', () => {
  const ids = [...details.map((d) => d.id), ...register.map((r) => r.id)].sort();
  assert.equal(ids.length, 9);
  assert.deepEqual(Object.keys(projectLights).sort(), ids);
  for (const id of ['henk', 'homelab', 'sandbox']) {
    assert.equal(projectLights[id].card, glassCards.find((c) => c.id === id), `${id}: its hero card`);
  }
  const lights = Object.entries(projectLights);
  for (const [id, l] of lights) {
    assert.equal(l.near.length, 3, id);
    assert.equal(l.deep.length, 3, id);
    assert.ok(l.card && Array.isArray(l.card.tune) && l.card.tune.length > 0, `${id}: a ribbed light`);
  }
  const key = (l) => JSON.stringify([l.near, l.deep, l.card.light, l.card.tune, l.card.wash]);
  assert.equal(new Set(lights.map(([, l]) => key(l))).size, lights.length, 'no two projects share a light');
  assert.equal(new Set(lights.map(([, l]) => l.deep.join())).size, lights.length, 'no two deep colours alike');
});

test('Finance Bot\'s own hue: 30 degrees from every other project light and from the mist, saturated', () => {
  const fin = hsl(projectLights.finance.deep);
  assert.ok(fin.s >= 0.25, `saturation ${fin.s.toFixed(2)}`);
  const mist = benched.find((c) => c.id === 'finance');
  const mistColours = [...mist.tune.flatMap((t) => [t?.set?.color, t?.set?.color2]).filter(Boolean), mist.wash.color];
  const others = [
    ...Object.entries(projectLights).filter(([id]) => id !== 'finance').map(([id, l]) => [id, l.deep]),
    ...mistColours.map((c, i) => [`mist ${i}`, c]),
  ];
  for (const [id, c] of others) {
    const gap = hueGap(fin.h, hsl(c).h);
    assert.ok(gap >= 30, `${id}: ${gap.toFixed(1)} degrees from Finance Bot's ${fin.h.toFixed(1)}`);
  }
  // its ribbed light is its own, not the benched mist's
  assert.notDeepEqual(projectLights.finance.card.tune, mist.tune);
});

// ---- stone-project-pages: the windows' glows ----

test('Its own light (config half): Finance Bot\'s window glows in its near and deep colours, none the mist\'s', () => {
  const g = windowGlows.finance;
  assert.deepEqual(g.lights.map((l) => l.color), [projectLights.finance.near, projectLights.finance.deep]);
  const mist = benched.find((c) => c.id === 'finance');
  const mistColours = [...mist.tune.flatMap((t) => [t?.set?.color, t?.set?.color2]).filter(Boolean), mist.wash.color].map((c) => c.join());
  for (const l of g.lights) assert.ok(!mistColours.includes(l.color.join()), `${l.color} is the mist's`);
});

test('windowGlows.dusk: the homelab card\'s sun and plum, soft, as Homelab\'s light', () => {
  const g = windowGlows.dusk;
  assert.ok(g, 'dusk exists');
  assert.deepEqual(g.lights.map((l) => l.color), [projectLights.homelab.near, projectLights.homelab.deep]);
  assert.deepEqual(projectLights.homelab.near, glassCards.find((c) => c.id === 'homelab').tune[0].set.color, 'the sun');
  assert.ok(g.blur >= 20);
  for (const l of g.lights) assert.ok(l.opacity > 0 && l.opacity < 1);
});

test('/contact\'s window glows in the moss (Ezra, 2026-11-10: the bar mapping carries into the pages): windowGlows.moss is pageLights.contact, and contact.astro uses it', () => {
  const g = windowGlows.moss;
  assert.ok(g, 'moss exists');
  assert.deepEqual(g.lights.map((l) => l.color), [pageLights.contact.near, pageLights.contact.deep]);
  assert.ok(g.blur >= 20);
  for (const l of g.lights) assert.ok(l.opacity > 0 && l.opacity < 1);
  const src = read('src/pages/contact.astro');
  assert.match(src, /<GlassWindow\b[^>]*\bglow="moss"/, 'the "New message" window takes the moss');
  assert.doesNotMatch(src, /glow="flame"/, 'no longer the flame');
});

// ---- stone-project-pages: Homelab's window ----

const HOMELAB_TABLE = [
  ['$', '', 'homelab-health'],
  ['', '', '=== Homelab Health ==='],
  ['[+]', 'workstation', 'load:0.82  mem:8975/15994MB disk: 41% docker:NA  (this machine)'],
  ['[+]', 'rp5', 'load:1.28  mem:3508/8063MB  disk: 46% docker:19  dns:ok'],
  ['[!]', '', 'hygiene: journal 3686MB'],
  ['[+]', 'vps', 'load:0.43  mem:2039/3819MB  disk: 73% docker:19  dns:ok'],
  ['', '', 'hygiene: ok'],
  ['[+]', 'rp2', 'load:0.37  mem:422/921MB    disk: 73% docker:NA  dns:ok'],
  ['', '', 'hygiene: ok'],
  ['[+]', '', 'Prometheus: all targets up'],
];

test('The output, verbatim (config half): projectWindows.homelab is the approved table, line by line', () => {
  const h = projectWindows.homelab;
  assert.equal(h.title, 'ezra@workstation: ~');
  const rows = [[h.prompt, '', h.command], ['', '', h.heading], ...h.rows.map((r) => [r.marker, r.host, r.text])];
  assert.deepEqual(rows, HOMELAB_TABLE);
});

test('Nothing private (config half): no address, secret or path in Homelab\'s window, only its four hosts', () => {
  const all = stringsOf(projectWindows.homelab);
  for (const s of all) {
    assert.doesNotMatch(s, /\b\d{1,3}(\.\d{1,3}){3}\b/, s);
    assert.doesNotMatch(s, /[0-9a-f]{0,4}(:[0-9a-f]{0,4}){2,}/i, s);
    assert.doesNotMatch(s, /(token|key|secret|password)/i, s);
    assert.doesNotMatch(s, /\/(etc|home|var|root)\//, s);
  }
  const hosts = projectWindows.homelab.rows.map((r) => r.host).filter(Boolean);
  assert.deepEqual([...new Set(hosts)].sort(), ['rp2', 'rp5', 'vps', 'workstation']);
});

// ---- stone-project-pages: Finance Bot's window ----

test('The reply, verbatim (config half): projectWindows.finance is the approved reply', () => {
  const f = projectWindows.finance;
  assert.equal(f.title, 'Discord · #finance');
  assert.deepEqual([f.command.user, f.command.verb, f.command.name, f.command.file], ['Ezra', 'used', '/upload', 'asn-export.csv']);
  assert.deepEqual([f.bot.name, f.bot.tag], ['Finance Bot', 'APP']);
  assert.equal(f.bot.text, 'Processing 1 file(s) as upload 20261124-201508-3fa1; progress and the summary follow in your thread');
  assert.equal(f.bot.mention, '#Approvals-Ezra');
  assert.equal(f.progress, '11/2026: 164 rows written, 2 flagged');
  assert.equal(f.summary.title, 'Upload 20261124-201508-3fa1: complete');
  assert.deepEqual(f.summary.lines.map((l) => [l.indent, l.text]), [
    [false, '164 rows read from 1 file; 164 new.'],
    [false, 'Periods:'],
    [true, '11/2026: written, 164 rows (151 expenses, 13 income), sheet created, 2 flagged, 0 marked'],
    [false, 'Flagged rows (the AI guess that was not used):'],
    [true, '06-11-2026  18.95  Kruidvat  -> Persoonlijke verzorging (0.61)'],
    [true, '13-11-2026  42.50  Bol.com  -> Huishouden (0.68)'],
  ]);
});

// ---- anna-section: no minus numbers ----

test('No minus numbers: the levels are Identity, Claude, MCP connectors, Operations; ids and texts kept', () => {
  assert.deepEqual(annaLevels.map((l) => l.name), ['Identity', 'Claude', 'MCP connectors', 'Operations']);
  for (const l of annaLevels) assert.doesNotMatch(l.name, /[−-]\d/, l.name);
  assert.deepEqual(annaLevels.map((l) => l.id), ['identity', 'claude', 'connectors', 'ops']);
  for (const l of annaLevels) assert.ok(l.text.length > 20, `${l.id} keeps its text`);
});

// ---- stone-inner-pages: the labels live in config ----

test('pageWords holds the approved labels and the words the layouts and pages typed in, verbatim', () => {
  const words = stringsOf(pageWords);
  for (const w of [
    // approved
    'On this page', 'Other writing', 'View larger', 'Close', 'New message', 'Made for fun', 'Case study',
    // the article's
    'Stack', 'Code', 'Preview', 'Date', 'Updated', 'Reading', 'min',
    // /projects and /blog header lines
    'Detailed write-ups for selected work.', 'Notes on infrastructure, tooling, and the occasional detour.',
    // the résumé's
    'at', 'Experience', 'Consultant via', 'Prior Experience', 'Skills', 'Languages', 'Education', 'Certifications',
    'GPA', 'present', 'Request my full CV', 'Email me', 'LinkedIn', 'GitHub',
    // the contact form's
    'Name', 'Email', 'Message', 'Website', 'Send Message', 'Sending...',
    'Verification is still loading. Please wait a moment and try again.',
    'Thank you! Your message has been sent successfully. I\'ll get back to you soon.',
    'Something went wrong. Please try again.',
    'Network error. Please check your connection and try again.',
  ]) assert.ok(words.includes(w), `pageWords holds "${w}"`);
  assert.ok(!words.includes('Other sheets, drawn for fun'), 'the old side-pieces heading is gone');
});

// ---- stone-project-pages: built from frontmatter ----

const fmOf = (name) => {
  const fm = readFrontmatter(read(`src/pages/projects/${name}.mdx`));
  return { ...fm, tech: fm.tech ? JSON.parse(fm.tech) : undefined };
};

test('factsOf, a project: date label with the en-US month, Stack, Code and Preview without their scheme', () => {
  assert.deepEqual(factsOf(fmOf('BibleTui'), 'project'), [
    { label: 'Online since', value: 'April 2026', iso: '2026-04-25' },
    { label: pageWords.article.stack, value: 'Rust, ratatui, crossterm, ratzilla, WebAssembly, postcard' },
    { label: pageWords.article.code, value: 'github.com/enhulsman/bible-tui', href: 'https://github.com/enhulsman/bible-tui' },
    { label: pageWords.article.preview, value: 'bible.hulsman.dev', href: 'https://bible.hulsman.dev' },
  ]);
});

test('Built from frontmatter: without github and preview only the date and Stack, labels from pageWords', () => {
  const facts = factsOf({ title: 'X', date: new Date('2026-07-20'), dateLabel: 'Running since', tech: ['Python', 'Docker'] }, 'project');
  assert.deepEqual(facts, [
    { label: 'Running since', value: 'July 2026', iso: '2026-07-20' },
    { label: pageWords.article.stack, value: 'Python, Docker' },
  ]);
  assert.equal(facts[1].label, 'Stack');
});

test('factsOf: a repository name is a link on the owner\'s GitHub; no tech, no Stack; no date, no date fact', () => {
  assert.deepEqual(factsOf({ github: 'claude-sandbox' }, 'project'), [
    { label: 'Code', value: 'github.com/enhulsman/claude-sandbox', href: `${site.social.GitHub}/claude-sandbox` },
  ]);
  assert.deepEqual(factsOf({}, 'project'), []);
});

test('factsOf, a post: Date as day, month and year in British English, Updated only when set, Reading in minutes', () => {
  assert.deepEqual(factsOf({ date: '2026-07-06', updated: '2026-07-15' }, 'post', 7), [
    { label: 'Date', value: '6 July 2026', iso: '2026-07-06' },
    { label: 'Updated', value: '15 July 2026', iso: '2026-07-15' },
    { label: 'Reading', value: '7 min' },
  ]);
  assert.deepEqual(factsOf({ date: new Date('2026-10-09') }, 'post', 4), [
    { label: pageWords.article.date, value: '9 October 2026', iso: '2026-10-09' },
    { label: pageWords.article.reading, value: `4 ${pageWords.article.min}` },
  ]);
});

// ---- stone-project-pages: the numbers are the page's own ----

const STAT = (value, label) => ({ value, label });

test('numbersOf: a project\'s stats first, else its listing\'s first three dims, else none', () => {
  const stats = [STAT('1', 'a'), STAT('2', 'b'), STAT('3', 'c'), STAT('4', 'd')];
  const dims = [STAT('9', 'w'), STAT('8', 'x'), STAT('7', 'y'), STAT('6', 'z')];
  assert.deepEqual(numbersOf({ kind: 'project', stats, dims }), stats);
  assert.deepEqual(numbersOf({ kind: 'project', stats: [], dims }), dims.slice(0, 3));
  assert.deepEqual(numbersOf({ kind: 'project', dims }), dims.slice(0, 3));
  assert.deepEqual(numbersOf({ kind: 'project' }), []);
  const homelab = details.find((d) => d.id === 'homelab');
  assert.deepEqual(numbersOf({ kind: 'project', dims: homelab.dims }).map((n) => n.value), ['4', '7', '19']);
});

test('numbersOf, a post: its project\'s first dims entry, or none', () => {
  const henk = details.find((d) => d.id === 'henk');
  assert.deepEqual(numbersOf({ kind: 'post', dims: henk.dims }), [{ value: '4', label: 'egress ports, zero inbound' }]);
  assert.deepEqual(numbersOf({ kind: 'post', stats: [STAT('1', 'a')], dims: henk.dims }), [henk.dims[0]], 'a post never shows stats');
  assert.deepEqual(numbersOf({ kind: 'post' }), []);
});

/** The `stats` list in a page's frontmatter, written as flow mappings: `- { value: "..", label: ".." }`. */
const statsOf = (src) => {
  const block = src.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
  const at = block.indexOf('\nstats:');
  if (at < 0) return null;
  const lines = block.slice(at + 1).split('\n').slice(1);
  const items = [];
  for (const line of lines) {
    const m = line.match(/^\s+-\s*\{\s*value:\s*("(?:[^"\\]|\\.)*")\s*,\s*label:\s*("(?:[^"\\]|\\.)*")\s*\}\s*$/);
    if (!m) break;
    items.push({ value: JSON.parse(m[1]), label: JSON.parse(m[2]) });
  }
  return items;
};

test('Henk.mdx\'s and BibleTui.mdx\'s stats are their StatStrip values, in order', () => {
  assert.deepEqual(statsOf(read('src/pages/projects/Henk.mdx')), [
    STAT('3,660', 'tests, SDK mocked out'),
    STAT('1', 'owner; everyone else is dropped'),
    STAT('4', 'egress ports, zero inbound'),
    STAT('exactly once', 'event replay across restarts'),
  ]);
  assert.deepEqual(statsOf(read('src/pages/projects/BibleTui.mdx')), [
    STAT('102', 'lines to put it in the browser'),
    STAT('~5,500', 'lines of Rust in all'),
    STAT('3', 'translations, nothing leaves the device'),
    STAT('13.3 MB', 'of WASM, scripture included'),
  ]);
  assert.deepEqual(statsOf(read('src/pages/projects/HerdrAndroid.mdx')), [
    STAT('14 ms', 'for 95% of terminal frames'),
    STAT('66 ms', 'to show an agent\'s last screen'),
    STAT('0', 'Google services'),
    STAT('6', 'working days to v0.3.0'),
  ]);
  for (const name of ['AnnaAssistant', 'EncryptedChatTUI', 'ResumePage']) {
    assert.equal(statsOf(read(`src/pages/projects/${name}.mdx`)), null, `${name} has no stats`);
  }
});

// ---- stone-article-layout: the contents list ----

test('contentsOf: the prose\'s h2 ids and texts in order, tags stripped, entities read; none without h2s', () => {
  const html = '<p>Intro</p><h2 id="what-i-built">What I Built</h2><p>a</p><h3 id="x">Not this</h3>'
    + '<h2 class="k" id="key-decisions">Key <code>Decisions</code></h2><h2 id="r-amp-d">R&amp;D &#x27;26</h2>';
  assert.deepEqual(contentsOf(html), [
    { id: 'what-i-built', text: 'What I Built' },
    { id: 'key-decisions', text: 'Key Decisions' },
    { id: 'r-amp-d', text: 'R&D \'26' },
  ]);
  assert.deepEqual(contentsOf('<p>No headings</p><h3 id="a">Small</h3>'), []);
  assert.deepEqual(contentsOf(''), []);
});

// ---- stone-blog: "Other writing" ----

const post = (date, title, extra = '') => `---\ntitle: "${title}"\ndescription: "d"\ndate: ${date}\n${extra}---\n\nBody.\n`;

test('The function: otherWriting gives the three newest other published posts, newest first; none with a project or window', () => {
  const sources = {
    '/blog/a.mdx': post('2026-10-01', 'A'),
    '/blog/b.mdx': post('2026-09-01', 'B'),
    '/blog/c.mdx': post('2026-08-01', 'C'),
    '/blog/d.mdx': post('2026-07-01', 'D'),
    '/blog/e.mdx': post('2026-06-01', 'E'),
    '/blog/_draft.mdx': post('2026-12-01', 'Draft'),
  };
  const others = otherWriting(sources, { href: '/blog/b' });
  assert.deepEqual(others, [
    { title: 'A', href: '/blog/a', iso: '2026-10-01', date: '1 October 2026' },
    { title: 'C', href: '/blog/c', iso: '2026-08-01', date: '1 August 2026' },
    { title: 'D', href: '/blog/d', iso: '2026-07-01', date: '1 July 2026' },
  ]);
  assert.deepEqual(otherWriting(sources, { href: '/blog/b/' }).map((p) => p.href), ['/blog/a', '/blog/c', '/blog/d'], 'a trailing slash is the same post');
  assert.deepEqual(otherWriting(sources, { href: '/blog/c', project: '/projects/Henk' }), []);
  assert.deepEqual(otherWriting(sources, { href: '/blog/c', window: true }), []);
});

test('otherWriting on the real posts: spec-factory gets herdr-android, henk-watchdog and bible-tui', () => {
  const others = otherWriting(blogSources, { href: '/blog/spec-factory' });
  assert.deepEqual(others.map((p) => [p.href, p.date]), [
    ['/blog/herdr-android', '12 November 2026'],
    ['/blog/henk-watchdog', '9 October 2026'],
    ['/blog/bible-tui', '16 September 2026'],
  ]);
  assert.equal(others[0].title, 'herdr, on my phone');
});

// ---- the derivations the copy check needs ----

test('bare: a link without its scheme or trailing slash; plainLocation: the location without its flag', () => {
  assert.equal(bare('https://github.com/enhulsman/bible-tui'), 'github.com/enhulsman/bible-tui');
  assert.equal(bare('https://bible.hulsman.dev/'), 'bible.hulsman.dev');
  assert.equal(bare('http://example.org/a/'), 'example.org/a');
  assert.equal(plainLocation(site.location), 'Utrecht, NL');
  assert.equal(plainLocation('Utrecht, NL'), 'Utrecht, NL');
});

// ---- stone-projects-index: This site's intro is its page's hook ----

test('introFromHook: This site\'s card reads its intro from ResumePage.mdx\'s hook; the others keep none', () => {
  const site_ = register.find((r) => r.href === '/projects/ResumePage');
  assert.equal(site_.introFromHook, true);
  const built = buildProjects(projectSources);
  const card = built.register.find((r) => r.href === '/projects/ResumePage');
  assert.equal(card.text, readFrontmatter(read('src/pages/projects/ResumePage.mdx')).hook);
  const chat = built.register.find((r) => r.href === '/projects/EncryptedChatTUI');
  assert.equal(chat.text, undefined, 'Encrypted Chat TUI keeps its one-liner (`what`)');
  const herdr = built.details.find((d) => d.href === '/projects/HerdrAndroid');
  assert.equal(herdr.group, 'running');
  assert.deepEqual(herdr.dims.slice(0, 2), [{ value: '14 ms', label: 'for 95% of terminal frames' }, { value: '0', label: 'Google services' }], 'the card\'s two numbers');
});

// ---- stone-project-pages: This site's page speaks stone (chunk 10) ----

const SITE_MDX = 'src/pages/projects/ResumePage.mdx';
const SHEET_WORDS = /\b(drawn|drawing|drawings|sheet|sheets|title block|revision table|schedule|perspective|Canvas 2D)\b/i;
const GIT_LINE = 'It started as a set of technical drawings; that version lives on in the git history.';
/** The MDX body: everything after the frontmatter. */
const bodyOf = (src) => src.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

test('No drawing sheet left (source): the approved description and tech, no sheet words outside the git-history line, no Claude', () => {
  const src = read(SITE_MDX);
  const fm = readFrontmatter(src);
  assert.equal(fm.description, 'Astro portfolio in stone and glass: each project shows its own output behind frosted glass, with a 42-command interactive terminal');
  const tech = JSON.parse(fm.tech);
  assert.deepEqual(tech, ['Astro', 'TypeScript', 'WebGL', 'Cloudflare Workers', 'MDX', 'Playwright']);
  assert.doesNotMatch(fm.description, SHEET_WORDS);
  for (const t of tech) assert.doesNotMatch(t, SHEET_WORDS, t);
  const body = bodyOf(src);
  assert.ok(body.includes(GIT_LINE), 'the git-history line is there');
  const rest = body.replace(GIT_LINE, '');
  assert.doesNotMatch(rest, SHEET_WORDS);
  assert.doesNotMatch(rest, /Claude|prompt/i, 'the page leaves Claude out');
});

test('The claim holds: more than a hundred browser tests written in tests/*.e2e.mjs', () => {
  const files = readdirSync(new URL('tests/', root)).filter((f) => f.endsWith('.e2e.mjs'));
  // a call written once counts once, also inside a loop
  const n = files.reduce((sum, f) => sum + (read(`tests/${f}`).match(/(^|[^.\w$])test\(/gm) ?? []).length, 0);
  assert.ok(n > 100, `${n} test( calls`);
});

test('This site\'s numbers hold: the terminal\'s command count and its theme answer are what the page says', () => {
  const term = read('src/scripts/interactive-terminal.ts');
  const count = (term.match(/this\.commands\.set\(/g) ?? []).length;
  const src = read(SITE_MDX);
  assert.equal(readFrontmatter(src).description.match(/a (\d+)-command/)?.[1], String(count), 'the description\'s count');
  assert.equal(bodyOf(src).match(/It implements (\d+) commands/)?.[1], String(count), 'The Terminal\'s count');
  const answer = term.match(/commands\.set\('theme',[\s\S]*?handler: \(\) => '([^']+)'/)?.[1];
  assert.equal(answer, 'There is one theme: light.');
  assert.ok(bodyOf(src).includes(`with \`theme\`. ${answer}`), 'the page quotes the answer');
});

// ---- stone-inner-pages, chunk 11: every inner page ----

const walk = (dir) => readdirSync(new URL(dir, root), { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? walk(`${dir}${d.name}/`) : [`${dir}${d.name}`]));
/** Source without its comments (JS line and block comments, HTML comments), so they are never read. */
const uncomment = (src) => src
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[\s;{}(,])\/\/[^\n]*/g, '$1');
/** The inner pages' style sources: stone.css, and every <style> block of the stone components, the layouts and the pages. */
const INNER_SOURCES = [
  ...walk('src/components/stone/'), ...walk('src/layouts/'),
  ...walk('src/pages/'),
].filter((p) => p.endsWith('.astro'));
const styleBlocks = (src) => [...src.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
/** Every rule of a stylesheet (nested @media walked): its selector and its declarations. */
const cssRules = (css) => {
  const out = [];
  const body = (txt) => {
    let i = 0;
    while (i < txt.length) {
      const open = txt.indexOf('{', i);
      if (open < 0) break;
      const head = txt.slice(i, open).trim();
      let depth = 1, j = open + 1;
      for (; j < txt.length && depth; j++) depth += txt[j] === '{' ? 1 : txt[j] === '}' ? -1 : 0;
      const inner = txt.slice(open + 1, j - 1);
      if (head.startsWith('@')) { if (/^@(media|supports|container|layer)/.test(head)) body(inner); }
      else out.push({ selector: head.replace(/^[;}\s]+/, ''), decls: inner });
      i = j;
    }
  };
  body(uncomment(css));
  return out;
};

test('Opaque inks only: every text colour set inside a glass object, in stone.css and the inner pages\' <style> blocks, has no alpha', () => {
  // a selector reaches inside a glass object when it names the glass or a class only a glass object holds
  const GLASS = /\[data-glass|\.glass-(window|bar|title|dots)|\.pj-window|\.pw-|\.hl\b|\.dc\b|\.dc-|\.dp-|\.dv(-|\b)|\.aw-|\.msg\b|\.anna-window|\.ct-(window|body|form|row|foot|send|ways)|#statusMessage|\.art-code|\.term\b|\.term-body|\.terminal-/;
  const TEXT = /(?:^|;)\s*(color|fill|-webkit-text-fill-color)\s*:\s*([^;]+)/g;
  const alpha = (v) => {
    v = v.replace(/!important/, '').trim();
    if (/^(transparent)$/i.test(v)) return 0;
    let m = v.match(/^#([0-9a-f]{4}|[0-9a-f]{8})$/i);
    if (m) return parseInt(m[1].length === 4 ? m[1][3].repeat(2) : m[1].slice(6), 16) / 255;
    m = v.match(/^rgba?\(([^)]*)\)$/i) || v.match(/^hsla?\(([^)]*)\)$/i);
    if (m) {
      const parts = m[1].split(/[\s,/]+/).filter(Boolean);
      if (parts.length < 4) return 1;
      const a = parts[3];
      return a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a);
    }
    m = v.match(/color-mix\(/i);
    if (m) return /transparent/i.test(v) ? 0 : 1;
    return 1; // a named colour, a variable, currentColor, inherit
  };
  const vars = Object.fromEntries([...read('src/styles/stone.css').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const resolve = (v) => v.replace(/var\((--[\w-]+)(?:,\s*([^)]+))?\)/g, (_, n, fb) => vars[n] ?? fb ?? 'inherit');
  const found = [];
  const sheets = [['src/styles/stone.css', read('src/styles/stone.css')], ...INNER_SOURCES.flatMap((p) => styleBlocks(read(p)).map((css) => [p, css]))];
  for (const [file, css] of sheets) {
    for (const r of cssRules(css)) {
      if (!GLASS.test(r.selector)) continue;
      for (const m of r.decls.matchAll(TEXT)) found.push({ file, selector: r.selector, prop: m[1], value: m[2].trim(), alpha: alpha(resolve(m[2])) });
    }
  }
  assert.ok(found.length >= 20, `${found.length} text colours read inside glass`);
  const low = found.filter((f) => f.alpha < 1);
  assert.deepEqual(low, [], JSON.stringify(low));
});

const LABELS = ['On this page', 'Other writing', 'View larger', 'Close', 'New message', 'Made for fun', 'Case study'];
test('The labels live in config: pageWords holds the approved labels; no stone component, layout or page types one in', () => {
  const words = stringsOf(pageWords);
  for (const w of LABELS) assert.ok(words.includes(w), `pageWords holds "${w}"`);
  const files = [
    ...walk('src/components/stone/'), ...walk('src/layouts/'),
    ...walk('src/pages/'),
  ].filter((p) => /\.(astro|ts|js|mjs)$/.test(p));
  assert.ok(files.length > 20, `${files.length} files read`);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const typed = [];
  for (const f of files) {
    const src = uncomment(read(f));
    for (const w of LABELS) {
      if (new RegExp(`(["'\`])\\s*${esc(w)}\\s*\\1`).test(src) || new RegExp(`>\\s*${esc(w)}\\s*<`).test(src)) typed.push(`${f}: ${w}`);
    }
  }
  assert.deepEqual(typed, []);
});

test('The stylesheet and scripts: overzicht.css styles no drawing sheet; chrome.js loads no pointer; the layout has no B612 and no hatch', () => {
  const css = read('src/styles/overzicht.css');
  const selectors = cssRules(css).map((r) => r.selector);
  const SHEET = /\.(titleblock|revs|rev|schedule|stamp|transmittal|plate|detail|register|xhair|pencil)(?![\w])/;
  assert.ok(selectors.length > 20, `${selectors.length} rules read`);
  assert.deepEqual(selectors.filter((s) => SHEET.test(s)), []);
  const chrome = read('src/scripts/overzicht/chrome.js');
  assert.doesNotMatch(uncomment(chrome), /pointer\.js/);
  const layout = read('src/layouts/OverzichtLayout.astro');
  assert.doesNotMatch(layout, /B612/);
  assert.doesNotMatch(layout, /id="hatch"/);
  assert.doesNotMatch(layout, /id="arrow"/);
});
