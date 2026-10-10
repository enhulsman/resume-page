// Every project fact is written once: dates, date labels, code links, stacks and descriptions in
// the project page's frontmatter (src/pages/projects/), the listing (order, groups, short titles,
// one-liners, dimensions) in src/config/home.ts. src/lib/projects.ts joins the two.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { pageFacts, buildProjects } from '../src/lib/projects.ts';
import * as home from '../src/config/home.ts';
import { education, spokenLanguages, certifications } from '../src/config/resume.ts';

const dir = new URL('../src/pages/projects/', import.meta.url);
const sources = Object.fromEntries(readdirSync(dir).filter(f => f.endsWith('.mdx'))
  .map(f => [`./${f}`, readFileSync(new URL(f, dir), 'utf8')]));
const built = buildProjects(sources);
const listed = [built.annaLead, ...built.details, ...built.register].map(p => p.href);

test('page facts: the status line is the date label and the month, plus any note', () => {
  const f = pageFacts('---\ntitle: "X"\ndescription: "d"\ndate: 2026-07-20\ndateLabel: "Running since"\ntech: ["Python", "Signal"]\n---\n');
  assert.equal(f.status, 'Running since Jul 2026');
  assert.deepEqual(f.tech, ['Python', 'Signal']);
  assert.equal(f.code, undefined);
  const n = pageFacts('---\ntitle: "X"\ndate: 2026-02-02\ndateLabel: "Released"\nstatusNote: "now retired"\n---\n');
  assert.equal(n.status, 'Released Feb 2026, now retired');
});

test('page facts: a bare repository name is a repository on the GitHub account', () => {
  assert.equal(pageFacts('---\ntitle: "X"\ndate: 2026-01-01\ndateLabel: "Started"\ngithub: "claude-sandbox"\n---\n').code,
    'https://github.com/enhulsman/claude-sandbox');
  assert.equal(pageFacts('---\ntitle: "X"\ndate: 2026-01-01\ndateLabel: "Started"\ngithub: "https://github.com/talhaorak/pytaiga-mcp"\n---\n').code,
    'https://github.com/talhaorak/pytaiga-mcp');
});

test('page facts: a page without a date or a date label fails the build instead of listing "undefined"', () => {
  assert.throws(() => pageFacts('---\ntitle: "X"\ndateLabel: "Started"\n---\n'), /date/);
  assert.throws(() => pageFacts('---\ntitle: "X"\ndate: 2026-01-01\n---\n'), /dateLabel/);
});

test('every project page is listed exactly once, and every listed project has a page', () => {
  const pages = Object.keys(sources).map(k => `/projects/${k.slice(2, -4)}`);
  assert.deepEqual([...listed].sort(), [...pages].sort());
  assert.equal(new Set(listed).size, listed.length);
});

test('the listings carry each page\'s own date, label and code link', () => {
  const henk = built.details.find(d => d.id === 'henk')!;
  assert.equal(henk.status, 'Running since Jul 2026');
  assert.equal(henk.code, 'https://github.com/enhulsman/henk');
  assert.equal(built.annaLead.status, 'In development since Dec 2025');
  assert.equal(built.details.find(d => d.id === 'sandbox')!.status, 'Released Feb 2026, now retired');
  assert.equal(built.register.find(r => r.href === '/projects/EncryptedChatTUI')!.status, 'Started Aug 2024');
  // cards: the drawn projects and the register, in /projects' group order
  assert.deepEqual(built.cards.map(c => c.group), [...built.cards.map(c => c.group)].sort((a, b) =>
    home.groups.findIndex(g => g.id === a) - home.groups.findIndex(g => g.id === b)));
  assert.equal(built.cards.length, built.details.length + built.register.length);
});

test('the terminal lists every project, ANNA first, with its page\'s title, description, stack and link', () => {
  assert.deepEqual(built.terminal.map(p => p.link), listed);
  for (const p of built.terminal) {
    const f = pageFacts(sources[`./${p.link.slice('/projects/'.length)}.mdx`]);
    assert.equal(p.title, f.title);
    assert.equal(p.description, f.description.endsWith('.') ? f.description : `${f.description}.`);
    assert.deepEqual(p.tech, f.tech);
    assert.equal(p.github, f.code ?? '');
  }
  // the intro types the first four as slugs; these are the names visitors have seen
  assert.deepEqual(built.terminal.slice(0, 4).map(p => p.title), ['ANNA', 'Henk — Homelab Agent', 'Finance Bot', 'Homelab Infrastructure']);
});

// A dimension is on its page when the page has each number in its value (as digits, spelled out,
// as an ordinal, or a fraction as a percentage) and a word from its label. Loose by design: it
// catches a number with no write-up behind it, not wording.
const spelled: Record<string, string[]> = { 3: ['three', 'third'], 4: ['four', 'fourth'], 7: ['seven'], 11: ['eleven'], 19: ['nineteen'] };
const spellings = (n: string) => [n, ...(spelled[n] ?? []), ...(/^0\.\d+$/.test(n) ? [`${Math.round(Number(n) * 100)}%`] : [])];
const onPage = (page: string, value: string, label: string) =>
  (value.match(/\d[\d,.]*/g) ?? []).every(n => spellings(n).some(s => page.includes(s)))
  && (label.toLowerCase().match(/[a-z]{5,}/g) ?? []).some(w => page.includes(w.slice(0, 5)));
test('every number the listings show is on its project page', () => {
  const missing: string[] = [];
  for (const d of built.details) {
    const page = sources[`./${d.href.slice('/projects/'.length)}.mdx`].toLowerCase();
    for (const m of d.dims) if (!onPage(page, m.value, m.label)) missing.push(`${d.id}: ${m.value} ${m.label}`);
  }
  assert.deepEqual(missing, []);
});

test('the number check catches a number with no write-up behind it', () => {
  const page = 'answers below 75% confidence are flagged; the fourth machine on the mesh';
  const on = (value: string, label: string) => onPage(page, value, label);
  assert.ok(on('0.75', 'confidence'));
  assert.ok(on('4', 'machines, one mesh'));
  assert.ok(!on('0.8', 'confidence'));
  assert.ok(!on('12', 'machines'));
});

test('the homepage\'s education and languages lines are the CV\'s', () => {
  const spec = Object.fromEntries(home.specification);
  const e = education[0];
  assert.equal(spec.Education, `${e.degree}, ${e.institution}, ${e.startYear} – ${e.endYear}, GPA ${e.gpa}`);
  assert.equal(spec.Speaks, spokenLanguages.map(l => `${l.name} (${l.level.toLowerCase()})`).join(', '));
  // the certificates are worded for the drawing, so each CV certificate has its wording here
  const shown: Record<string, string> = {
    'PSM I': 'Professional Scrum Master I',
    'CPSA 8.8': 'CPSA 8.8 and CPBA 8.8 (2023)',
    'CPBA 8.8': 'CPBA 8.8 (2023)',
    CPE: 'Cambridge Proficiency (2018)',
  };
  for (const c of certifications) {
    assert.ok(shown[c.credential!], `${c.name} is on the CV but not on the homepage`);
    assert.ok(spec.Certified.includes(shown[c.credential!]), c.name);
    const year = shown[c.credential!].match(/\((\d{4})\)/)?.[1];
    if (year) assert.equal(Number(year), c.year, c.name);
  }
});
