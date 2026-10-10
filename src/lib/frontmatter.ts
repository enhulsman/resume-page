// A small reader for the flat `key: value` frontmatter the blog posts use. The homepage's
// site diary reads posts as raw text: importing them would pull in their layout, and with
// it the old site's stylesheet.

export function readFrontmatter(src: string): Record<string, string> {
  const block = src.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const fields: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (value.startsWith('"') && value.endsWith('"')) {
      try { value = JSON.parse(value); } catch { value = value.slice(1, -1); }
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1).replace(/''/g, "'");
    }
    fields[m[1]] = value;
  }
  return fields;
}

export interface DiaryEntry {
  title: string;
  line: string;
  href: string;
  iso: string;
  label: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Published posts (drafts start with "_"), newest first; undated posts are left out. */
export function diaryEntries(sources: Record<string, string>): DiaryEntry[] {
  return Object.entries(sources)
    .map(([path, src]) => ({ slug: path.split('/').pop()!.replace(/\.mdx$/, ''), fm: readFrontmatter(src) }))
    .filter(({ slug }) => !slug.startsWith('_'))
    .map(({ slug, fm }) => ({ slug, fm, d: new Date(fm.date) }))
    .filter(({ d }) => !Number.isNaN(d.getTime()))
    .sort((a, b) => b.d.getTime() - a.d.getTime())
    .map(({ slug, fm, d }) => ({
      title: fm.title ?? slug,
      line: fm.diary ?? fm.description ?? '',
      href: `/blog/${slug}`,
      iso: d.toISOString().slice(0, 10),
      label: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    }));
}
