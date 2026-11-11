// What a post's facts are built from: its reading time and the project it belongs to.
import { readFrontmatter } from './frontmatter.ts';

const WORDS_PER_MINUTE = 230;

/** Whole minutes to read the rendered post, rounded up; never zero. */
export function readingMinutes(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
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
