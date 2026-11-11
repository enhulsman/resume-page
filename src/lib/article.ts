// What the stone article's side column is built from (openspec stone-inner-pages, design 2): a page's
// facts, its numbers, its contents list and, for a post on its own, the other writing to read next;
// plus the small derivations the copy check needs in its corpus (a link without its scheme, the
// location without its flag). Pure, so the unit tests need no browser; labels come from pageWords.
import { pageWords } from '../config/pages.ts';
import site from '../config/site.ts';
import { diaryEntries } from './frontmatter.ts';

export interface Fact {
  label: string;
  value: string;
  /** The link a value stands for (Code, Preview). */
  href?: string;
  /** The ISO date a value shows, for its `time` element. */
  iso?: string;
}
export interface Stat { value: string; label: string }

/** A link as the side shows it: without its scheme and trailing slash. */
export const bare = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** The location without its flag emoji (the terminal's `whoami` keeps the flag). */
export const plainLocation = (location: string) => location.replace(/\s*[\u{1F1E6}-\u{1F1FF}]+/gu, '').trim();

const toDate = (d: string | Date) => (d instanceof Date ? d : new Date(d));
const isoOf = (d: string | Date) => toDate(d).toISOString().slice(0, 10);
/** "July 2026": a project's date, as its title block gave it. */
const monthOf = (d: string | Date) => toDate(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
/** "9 October 2026": a post's date. */
export const dayOf = (d: string | Date) => toDate(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const techOf = (tech: unknown): string[] => {
  if (Array.isArray(tech)) return tech.map(String);
  if (typeof tech === 'string' && tech.trim().startsWith('[')) return JSON.parse(tech);
  return [];
};

/**
 * A page's facts, each a label above its value, only where the frontmatter has them.
 * A project: its `dateLabel` with the date's month and year (en-US), Stack, Code, Preview (links
 * shown without their scheme; a bare repository name is the owner's GitHub). A post: Date (day,
 * month, year in British English), Updated where set, Reading in whole minutes.
 */
export function factsOf(fm: Record<string, any>, kind: 'project' | 'post', minutes = 0): Fact[] {
  const w = pageWords.article;
  const out: Fact[] = [];
  if (kind === 'post') {
    if (fm.date) out.push({ label: w.date, value: dayOf(fm.date), iso: isoOf(fm.date) });
    if (fm.updated) out.push({ label: w.updated, value: dayOf(fm.updated), iso: isoOf(fm.updated) });
    out.push({ label: w.reading, value: `${minutes} ${w.min}` });
    return out;
  }
  if (fm.date) out.push({ label: fm.dateLabel ?? '', value: monthOf(fm.date), iso: isoOf(fm.date) });
  const tech = techOf(fm.tech);
  if (tech.length) out.push({ label: w.stack, value: tech.join(', ') });
  if (fm.github) {
    const url = String(fm.github).startsWith('http') ? String(fm.github) : `${site.social.GitHub}/${fm.github}`;
    out.push({ label: w.code, value: bare(url), href: url });
  }
  if (fm.preview) out.push({ label: w.preview, value: bare(String(fm.preview)), href: String(fm.preview) });
  return out;
}

/**
 * A page's numbers. A project: its `stats` frontmatter, else its listing's first three `dims`, else
 * none. A post: its project's first `dims` entry, or none.
 */
export function numbersOf(page: { kind: 'project' | 'post'; stats?: Stat[]; dims?: Stat[] }): Stat[] {
  const dims = page.dims ?? [];
  if (page.kind === 'post') return dims.slice(0, 1);
  if (page.stats?.length) return page.stats;
  return dims.slice(0, 3);
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ' };
const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENTITIES[e.toLowerCase()] ?? m;
});

/** The rendered prose's `h2`s, in order, as the contents list links them: each heading's id and text. */
export function contentsOf(html: string): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  for (const m of html.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/g)) {
    const id = m[1].match(/\bid="([^"]+)"/)?.[1];
    if (!id) continue;
    out.push({ id, text: decode(m[2].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim() });
  }
  return out;
}

export interface OtherPost { title: string; href: string; iso: string; date: string }

/**
 * "Other writing", for a post with neither a window nor a project: the three newest other published
 * posts (drafts, whose file starts with "_", never), newest first, each its title and its date.
 * `sources` maps each post's path to its raw text, as import.meta.glob gives it.
 */
export function otherWriting(
  sources: Record<string, string>,
  self: { href: string; project?: string | null; window?: boolean },
): OtherPost[] {
  if (self.project || self.window) return [];
  const href = self.href.replace(/\/$/, '');
  return diaryEntries(sources)
    .filter((e) => e.href !== href)
    .slice(0, 3)
    .map((e) => ({ title: e.title, href: e.href, iso: e.iso, date: dayOf(e.iso) }));
}
