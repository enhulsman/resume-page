// /resume in stone, in a real browser (openspec stone-inner-pages, chunk 7: stone-resume, and
// stone-inner-pages "One light per page" on /resume): the head with its sunset behind the name, the
// years as the spine, the three row sections, the headings, and print. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/inner-resume.e2e.mjs
//
// Test cost: /resume loads once with reduced motion and is reused across widths with
// setViewportSize (and for print with emulateMedia). Waits are on state, never on a fixed sleep.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import site from '../src/config/site.ts';
import { certifications, education, experience, skillCategories, spokenLanguages } from '../src/config/resume.ts';
import { pageLights } from '../src/config/glass.ts';
import { pageWords } from '../src/config/pages.ts';
import { plainLocation } from '../src/lib/article.ts';
import { colours, lightOf, lightStep, textOverLight } from './lib/page-light.mjs';

const BASE = process.env.BASE || 'http://localhost:4321';
const R = pageWords.resume;
const norm = (s) => String(s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

let browser, context, page;
const errors = [];
before(async () => {
  browser = await chromium.launch();
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/resume`, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
});
after(async () => {
  await context?.close();
  await browser?.close();
  assert.deepEqual(errors, [], 'no page error on /resume');
});

const frames = (n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
async function width(w, h = w <= 400 ? 844 : 900) {
  await page.setViewportSize({ width: w, height: h });
  await page.evaluate(() => window.scrollTo(0, 0));
  await frames();
}
const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('The head: site.name in Archivo 900, the role line without a flag, site.summary, and the four actions from pageWords', async () => {
  await width(1440);
  const h = await page.evaluate(() => {
    const head = document.querySelector('main h1').parentElement;
    const h1 = head.querySelector('h1'), cs = getComputedStyle(h1);
    const role = h1.nextElementSibling, lead = role?.nextElementSibling;
    const acts = [...head.querySelectorAll('.cv-actions a')];
    return {
      h1: h1.textContent.trim(), weight: +cs.fontWeight, family: cs.fontFamily,
      role: role?.innerText, employer: role?.querySelector('a') && [role.querySelector('a').textContent, role.querySelector('a').getAttribute('href')],
      lead: lead?.textContent.trim(),
      actions: acts.map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href'), bg: getComputedStyle(a).backgroundColor })),
      ink: getComputedStyle(document.documentElement).getPropertyValue('--stone-ink').trim(),
    };
  });
  assert.equal(h.h1, site.name);
  assert.equal(h.weight, 900);
  assert.match(h.family, /^"?Archivo/);
  assert.equal(norm(h.role), `${site.role} ${R.at} ${site.company} · ${plainLocation(site.location)}`);
  assert.equal(norm(h.role), 'Forward Deployed Engineer at Anamata · Utrecht, NL');
  assert.doesNotMatch(h.role, /[\u{1F1E6}-\u{1F1FF}]/u, 'no flag');
  assert.deepEqual(h.employer, [site.company, site.social.employer]);
  assert.equal(h.lead, site.summary);
  assert.deepEqual(h.actions.map((a) => [a.text, a.href]), [
    [R.actions.cv, '/contact'],
    [R.actions.email, `mailto:${site.social.email}`],
    [R.actions.linkedin, site.social.LinkedIn],
    [R.actions.github, site.social.GitHub],
  ]);
  assert.deepEqual(h.actions.map((a) => a.text), ['Request my full CV', 'Email me', 'LinkedIn', 'GitHub']);
  assert.equal(h.actions[0].bg, 'rgb(17, 17, 16)', `the one filled pill on the ink (${h.ink})`);
  for (const a of h.actions.slice(1)) assert.equal(a.bg, 'rgba(0, 0, 0, 0)', `${a.text} is not filled`);
});

test('The sunset behind the name: one [data-page-light] behind the h1, aria-hidden, no pointer, only pageLights.resume\'s colours, still', async () => {
  await width(1440);
  const l = await lightOf(page);
  assert.equal(l.count, 1);
  assert.ok(l.inMain && l.h1InHead && l.h1After, 'in the head, before the h1');
  assert.equal(l.ariaHidden, 'true');
  assert.equal(l.pointer, 'none');
  assert.ok(+l.zIndex < 0 && l.headIsolated === 'isolate', `z-index ${l.zIndex} in an isolated head (${l.headIsolated})`);
  assert.match(l.background, /radial-gradient/);
  assert.doesNotMatch(l.background, /linear-gradient|url\(/);
  assert.deepEqual(colours(l.background).sort(), [pageLights.resume.near, pageLights.resume.deep].map((c) => c.join(',')).sort());
  assert.match(l.filter, /blur\(/, 'a wide blur');
  assert.equal(l.animations, 0, 'still');
});

test('Soft, behind, silent and the text over the light: no step over 6 levels, name, role line and lead at 4.5:1, no sideways scroll, at 1440 and 390', async () => {
  for (const w of [1440, 390]) {
    await width(w);
    const { step, spread } = await lightStep(page);
    assert.ok(step <= 6, `${w}: neighbouring pixels differ by ${step}`);
    assert.ok(spread > 3, `${w}: the light shows (${spread})`);
    for (const t of await textOverLight(page, ['main h1', 'main h1 + p', 'main h1 + p + p'])) assert.ok(t.ratio >= 4.5, `${w} ${t.sel}: ${t.ratio}`);
    assert.ok(await sideways() <= 0, `${w}: no sideways scroll`);
  }
});

/** The Experience rows, by group, as read on the page. */
const rowsOf = () => page.evaluate(() => {
  const exp = [...document.querySelectorAll('main h2')].find((h) => h.textContent.trim() === 'Experience')?.closest('section');
  return [...exp.querySelectorAll('h3')].map((h3) => {
    const list = h3.nextElementSibling;
    return {
      heading: h3.textContent.replace(/\s+/g, ' ').trim(),
      link: h3.querySelector('a') && [h3.querySelector('a').textContent, h3.querySelector('a').getAttribute('href')],
      rows: [...list.children].map((li) => {
        const years = li.firstElementChild, big = years.querySelector('b'), end = big?.nextElementSibling;
        const role = li.querySelector('h4');
        const box = (e) => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
        return {
          cls: li.className, first: years.textContent.trim(),
          year: big?.textContent.trim(), end: end?.textContent.trim(),
          weight: big ? +getComputedStyle(big).fontWeight : 0, nums: big ? getComputedStyle(big).fontVariantNumeric : '',
          role: role?.firstChild.textContent.trim(), client: role?.querySelector('span')?.textContent.trim(),
          clientWeight: role?.querySelector('span') ? +getComputedStyle(role.querySelector('span')).fontWeight : 0,
          roleWeight: role ? +getComputedStyle(role).fontWeight : 0,
          summary: li.querySelector('h4 + p')?.textContent.trim(),
          revs: li.querySelectorAll('.rev, .revs').length,
          box: box(li), yearsBox: box(years), bigBox: big ? box(big) : null, endBox: end ? box(end) : null, roleBox: role ? box(role) : null,
        };
      }),
    };
  });
});

test('The rows: one per experience entry in resume.ts order, five under the consulting group, two under Prior Experience; the years large, no revision letters', async () => {
  await width(1440);
  const groups = await rowsOf();
  assert.equal(groups.length, 2);
  assert.equal(groups[0].heading, `${R.consulting.before} ${site.company} (${R.consulting.since} – ${R.present})`);
  assert.equal(groups[0].heading, 'Consultant via Anamata (2023 – present)');
  assert.deepEqual(groups[0].link, ['Anamata', 'https://anamata.nl']);
  assert.equal(groups[1].heading, R.prior);
  const want = ['consulting', 'prior'].map((g) => experience.filter((e) => e.group === g));
  assert.deepEqual(groups.map((g) => g.rows.length), [5, 2]);
  groups.forEach((g, gi) => g.rows.forEach((r, i) => {
    const e = want[gi][i];
    assert.equal(r.year, e.startDate, `${e.role}: start`);
    assert.equal(r.end, `– ${e.endDate ?? R.present}`, `${e.role}: end`);
    assert.equal(r.role, e.role);
    assert.equal(r.client, e.client);
    assert.ok(r.clientWeight < r.roleWeight, `${e.role}: the client lighter (${r.clientWeight} < ${r.roleWeight})`);
    assert.equal(r.summary, e.summary);
    assert.ok(r.weight >= 800, `${e.role}: the year at ${r.weight}`);
    assert.match(r.nums, /tabular-nums/);
    assert.equal(r.revs, 0, 'no revision letters');
    assert.doesNotMatch(r.first, /^[A-G]$/);
    assert.ok(r.bigBox.right <= r.roleBox.left, `${e.role}: the years left of the role`);
  }));
  const first = groups[0].rows[0];
  assert.deepEqual([first.year, first.end, first.role, first.client], ['2025', '– present', 'Forward Deployed Engineer', 'Anamata']);
  assert.equal(await page.locator('main .rev, main .revs').count(), 0);
});

test('The rows from config: Skills (Languages first), Education and Certifications as rows, Skills left of Education', async () => {
  await width(1440);
  const s = await page.evaluate(() => {
    const sec = (name) => [...document.querySelectorAll('main h2')].find((h) => h.textContent.trim() === name);
    const rows = (h) => [...h.nextElementSibling.children].map((d) => ({ label: d.querySelector('dt').textContent.trim(), value: d.querySelector('dd').innerText.replace(/\s+/g, ' ').trim(), note: d.querySelector('dd span')?.textContent.trim() ?? null }));
    const box = (e) => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, bottom: r.bottom }; };
    const h = { skills: sec('Skills'), education: sec('Education'), certifications: sec('Certifications') };
    return {
      found: Object.values(h).map((x) => !!x),
      skills: rows(h.skills), education: rows(h.education), certifications: rows(h.certifications),
      skillsBox: box(h.skills), eduBox: box(h.education),
    };
  });
  assert.deepEqual(s.found, [true, true, true]);
  assert.deepEqual(s.skills, [
    { label: R.languages, value: spokenLanguages.map((l) => `${l.name} (${l.level})`).join(' · '), note: null },
    ...skillCategories.map((c) => ({ label: c.label, value: c.items.join(' · '), note: null })),
  ]);
  assert.deepEqual(s.education.map((r) => [r.label, r.value.replace(r.note ?? '', '').trim(), r.note]), education.map((e) => [
    `${e.startYear} – ${e.endYear}`, `${e.degree} — ${e.institution}`,
    [e.result, e.gpa && `${e.gpa} ${R.gpa}`].filter(Boolean).join(' · ') || null,
  ]));
  assert.deepEqual(s.certifications.map((r) => [r.label, r.value.replace(r.note ?? '', '').trim(), r.note]), certifications.map((c) => [
    String(c.year), `${c.name} — ${c.institution}`, c.credential ?? null,
  ]));
  assert.ok(s.skillsBox.left < s.eduBox.left && Math.abs(s.skillsBox.top - s.eduBox.top) < 2, 'Skills stands left of Education');
});

test('Headings a screen reader can jump to: Experience, Skills, Education, Certifications are h2s; the two groups h3s', async () => {
  const h = await page.evaluate(() => ({
    h2: [...document.querySelectorAll('main h2')].map((e) => e.textContent.trim()),
    h3: [...document.querySelectorAll('main h3')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
  }));
  assert.deepEqual(h.h2, [R.experience, R.skills, R.education, R.certifications]);
  assert.deepEqual(h.h2, ['Experience', 'Skills', 'Education', 'Certifications']);
  assert.deepEqual(h.h3, ['Consultant via Anamata (2023 – present)', 'Prior Experience']);
});

test('On a phone: the years on one line above the role, every row within 0..390, one column for the three sections, labels above values', async () => {
  await width(390);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await frames();
  await page.evaluate(() => window.scrollTo(0, 0));
  await frames();
  for (const g of await rowsOf()) {
    for (const r of g.rows) {
      assert.ok(r.box.left >= 0 && r.box.right <= 390, `${r.role}: ${r.box.left}..${r.box.right}`);
      assert.ok(r.yearsBox.bottom <= r.roleBox.top + 0.5, `${r.role}: the years above the role`);
      assert.ok(r.endBox.left >= r.bigBox.right && r.endBox.top < r.bigBox.bottom, `${r.role}: the years on one line`);
    }
  }
  const s = await page.evaluate(() => {
    const sec = (name) => [...document.querySelectorAll('main h2')].find((h) => h.textContent.trim() === name);
    const list = (name) => sec(name).nextElementSibling;
    const b = (e) => e.getBoundingClientRect();
    const rows = ['Skills', 'Education', 'Certifications'].flatMap((n) => [...list(n).children]).map((d) => [b(d.querySelector('dt')).bottom, b(d.querySelector('dd')).top, b(d).left, b(d).right]);
    return { skillsBottom: b(list('Skills')).bottom, eduTop: b(sec('Education')).top, rows };
  });
  assert.ok(s.eduTop > s.skillsBottom, `Education (${s.eduTop}) below Skills (${s.skillsBottom})`);
  for (const [dtBottom, ddTop, left, right] of s.rows) {
    assert.ok(dtBottom <= ddTop + 0.5, `a label (${dtBottom}) above its value (${ddTop})`);
    assert.ok(left >= 0 && right <= 390, `a row ${left}..${right}`);
  }
  assert.ok(await sideways() <= 0, 'no sideways scroll');
});

test('Print: white, no bar, footer, skip link, actions or page light; every role and certification present', async () => {
  await width(1440);
  await page.emulateMedia({ media: 'print' });
  try {
    const p = await page.evaluate(() => ({
      bg: getComputedStyle(document.body).backgroundColor,
      hidden: ['.bar', '.foot', '.skip', '.cv-actions', '[data-page-light]'].map((s) => [s, document.querySelector(s) ? getComputedStyle(document.querySelector(s)).display : 'missing']),
      text: document.querySelector('main').innerText,
    }));
    assert.equal(p.bg, 'rgb(255, 255, 255)');
    for (const [s, d] of p.hidden) assert.equal(d, 'none', `${s} in print`);
    for (const e of experience) assert.ok(p.text.includes(e.role), `${e.role} printed`);
    for (const c of certifications) assert.ok(p.text.includes(c.name), `${c.name} printed`);
  } finally {
    await page.emulateMedia({ media: null });
  }
});
