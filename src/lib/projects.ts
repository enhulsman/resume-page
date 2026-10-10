// Joins the homepage's project listings (src/config/home.ts) to the facts each project page
// keeps in its own frontmatter, so a date, label, code link, stack or description is written
// once. Pages are read as raw text, like the site diary reads posts: importing them would pull
// in their layout. src/lib/project-pages.ts passes the pages in; the unit tests pass files.

import { readFrontmatter } from './frontmatter.ts';
import { annaLead as annaListing, details as detailListings, groups, register as registerListings } from '../config/home.ts';
import type { CardListing, DetailListing, Group } from '../config/home.ts';
import site from '../config/site.ts';

export interface PageFacts {
  title: string;
  description: string;
  tech: string[];
  /** "Running since Jul 2026", with the page's statusNote after a comma. */
  status: string;
  /** The repository, when the page names one. */
  code?: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function pageFacts(src: string): PageFacts {
  const fm = readFrontmatter(src);
  const date = new Date(fm.date);
  if (Number.isNaN(date.getTime())) throw new Error(`project page "${fm.title}" has no date`);
  if (!fm.dateLabel) throw new Error(`project page "${fm.title}" has no dateLabel`);
  const github = fm.github;
  return {
    title: fm.title,
    description: fm.description ?? '',
    tech: fm.tech ? JSON.parse(fm.tech) : [],
    status: `${fm.dateLabel} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}${fm.statusNote ? `, ${fm.statusNote}` : ''}`,
    code: !github ? undefined : github.startsWith('http') ? github : `${site.social.GitHub}/${github}`,
  };
}

export type Detail = DetailListing & { status: string; code?: string };
export type Card = CardListing & { status: string };
export interface TerminalProject { title: string; description: string; tech: string[]; github: string; link: string; slug: string; }

/** `sources` maps each page's path (any directory, ending in Name.mdx) to its raw text, as import.meta.glob gives it. */
export function buildProjects(sources: Record<string, string>) {
  const byName = Object.fromEntries(Object.entries(sources).map(([path, src]) => [path.split('/').pop()!, src]));
  const facts = (href: string) => {
    const src = byName[`${href.replace('/projects/', '')}.mdx`];
    if (src === undefined) throw new Error(`${href} is listed but has no page`);
    return pageFacts(src);
  };
  const annaLead = { ...annaListing, status: facts(annaListing.href).status };
  const details: Detail[] = detailListings.map(d => ({ ...d, status: facts(d.href).status, code: facts(d.href).code }));
  const register: Card[] = registerListings.map(r => ({ ...r, status: facts(r.href).status }));
  /** Every project as a card, the drawn ones included, in /projects' group order. */
  const cards: Card[] = groups.flatMap(g => [
    ...details.filter(d => d.group === g.id).map(d => ({ title: d.title, href: d.href, what: d.what, status: d.status, group: d.group as Group })),
    ...register.filter(r => r.group === g.id),
  ]);
  /** The terminal's `projects`, ANNA first, each as its page describes itself, as a sentence. */
  const terminal: TerminalProject[] = [annaListing, ...detailListings, ...registerListings].map(p => {
    const f = facts(p.href);
    return { title: f.title, description: f.description.replace(/([^.])$/, '$1.'), tech: f.tech, github: f.code ?? '', link: p.href, slug: p.href.replace('/projects/', '') };
  });
  return { annaLead, details, register, cards, terminal };
}
