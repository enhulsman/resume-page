// What a post's head is built from: its reading time, the intro that runs beside the title
// (everything before the first h2), and the project it belongs to.
import { readFrontmatter } from './frontmatter.ts';

const WORDS_PER_MINUTE = 230;

/** Whole minutes to read the rendered post, rounded up; never zero. */
export function readingMinutes(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Split the rendered post at its first h2. Code is escaped by then, so "<h2" is a real tag. */
export function splitIntro(html: string): { intro: string; rest: string } {
  const at = html.search(/<h2[\s>]/);
  return at === -1 ? { intro: html, rest: '' } : { intro: html.slice(0, at), rest: html.slice(at) };
}

/**
 * The project page a post names in its `project` frontmatter, with the title that page gives.
 * A name that matches no page throws, so a typo fails the build instead of shipping a dead link.
 */
export function relatedProject(
  project: string | undefined,
  sources: Record<string, string>,
): { href: string; title: string } | null {
  if (!project) return null;
  const href = project.replace(/\/$/, '');
  const slug = href.split('/').pop();
  const entry = Object.entries(sources).find(([path]) => path.endsWith(`/${slug}.mdx`));
  if (!entry) throw new Error(`Post names project ${project}, but there is no such project page`);
  return { href, title: readFrontmatter(entry[1]).title };
}
