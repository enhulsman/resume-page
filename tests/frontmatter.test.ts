// Frontmatter reader used by the homepage's site diary (src/lib/frontmatter.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFrontmatter, diaryEntries } from '../src/lib/frontmatter.ts';

test('reads quoted, single-quoted and bare values', () => {
  const fm = readFrontmatter('---\ntitle: "A \\"quoted\\" title"\nalt: \'single\'\ndate: 2026-07-06\n---\nbody');
  assert.deepEqual(fm, { title: 'A "quoted" title', alt: 'single', date: '2026-07-06' });
});

test('tolerates CRLF line endings', () => {
  assert.equal(readFrontmatter('---\r\ntitle: "x"\r\ndate: 2026-01-02\r\n---\r\n').date, '2026-01-02');
});

test('a value JSON cannot parse is kept as written instead of throwing', () => {
  assert.equal(readFrontmatter('---\ntitle: "bad \\q escape"\n---\n').title, 'bad \\q escape');
});

test('diary: drafts and undated posts are left out, newest first, diary line over description', () => {
  const entries = diaryEntries({
    './blog/old.mdx': '---\ntitle: "Old"\ndescription: "d"\ndate: 2026-07-06\n---\n',
    './blog/new.mdx': '---\ntitle: "New"\ndescription: "d"\ndiary: "short"\ndate: 2026-09-16\n---\n',
    './blog/_draft.mdx': '---\ntitle: "Draft"\ndate: 2026-10-01\n---\n',
    './blog/nodate.mdx': '---\ntitle: "No date"\n---\n',
  });
  assert.deepEqual(entries.map(e => [e.title, e.href, e.line, e.label, e.iso]), [
    ['New', '/blog/new', 'short', '16 Sep 2026', '2026-09-16'],
    ['Old', '/blog/old', 'd', '6 Jul 2026', '2026-07-06'],
  ]);
});
