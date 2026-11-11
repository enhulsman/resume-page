// Helpers behind a post's facts (src/lib/post.ts): reading time and the related project.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingMinutes, relatedProject } from '../src/lib/post.ts';

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
