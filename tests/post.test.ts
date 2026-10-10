// Helpers behind a post's head (src/lib/post.ts): reading time, the intro that runs beside
// the title, and the related project named in its title block.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingMinutes, splitIntro, relatedProject } from '../src/lib/post.ts';

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

test('reading time counts words, not markup, and rounds up to whole minutes', () => {
  assert.equal(readingMinutes(`<p>${words(230)}</p>`), 1);
  assert.equal(readingMinutes(`<p>${words(231)}</p>`), 2);
  // attributes and tags are not words
  assert.equal(readingMinutes(`<p class="${words(900)}">${words(10)}</p>`), 1);
});

test('reading time is never zero, even for an empty post', () => {
  assert.equal(readingMinutes(''), 1);
});

test('the intro is everything before the first h2; the rest starts at it', () => {
  const { intro, rest } = splitIntro('<p>one</p><p>two</p><h2 id="a">A</h2><p>three</p><h2>B</h2>');
  assert.equal(intro, '<p>one</p><p>two</p>');
  assert.equal(rest, '<h2 id="a">A</h2><p>three</p><h2>B</h2>');
});

test('a post without headings is all intro; one that opens on a heading has none', () => {
  assert.deepEqual(splitIntro('<p>only</p>'), { intro: '<p>only</p>', rest: '' });
  assert.deepEqual(splitIntro('<h2>A</h2><p>x</p>'), { intro: '', rest: '<h2>A</h2><p>x</p>' });
});

test('an escaped "<h2" inside code does not split the post', () => {
  const html = '<p>x</p><pre><code>&lt;h2&gt;</code></pre><h2>A</h2>';
  assert.equal(splitIntro(html).intro, '<p>x</p><pre><code>&lt;h2&gt;</code></pre>');
});

test('h2 means h2: an h3 or a <header> does not split the post', () => {
  const html = '<p>x</p><h3>sub</h3><header>h</header><h2>A</h2>';
  assert.equal(splitIntro(html).intro, '<p>x</p><h3>sub</h3><header>h</header>');
});

test('the related project is looked up by its page, with the title its page gives', () => {
  const sources = {
    './projects/Henk.mdx': '---\ntitle: "Henk"\n---\n',
    './projects/BibleTui.mdx': '---\ntitle: "bible-tui"\n---\n',
  };
  assert.deepEqual(relatedProject('/projects/Henk', sources), { href: '/projects/Henk', title: 'Henk' });
  assert.deepEqual(relatedProject('/projects/BibleTui/', sources), { href: '/projects/BibleTui', title: 'bible-tui' });
});

test('no project named gives none; a project page that does not exist fails the build', () => {
  const sources = { './projects/Henk.mdx': '---\ntitle: "Henk"\n---\n' };
  assert.equal(relatedProject('', sources), null);
  assert.equal(relatedProject(undefined, sources), null);
  assert.throws(() => relatedProject('/projects/Nope', sources), /Nope/);
});
