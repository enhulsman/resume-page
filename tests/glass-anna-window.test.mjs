// ANNA in a glass window (/hero-lab?lab=1, ?anna=window): the conversation's timeline, and its copy.
// The words are Anamata's public site's (anna-site app/page.tsx, the 'week' scenario), copied verbatim.
//
//   node --test tests/glass-anna-window.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { annaDemo } from '../src/config/anna-demo.ts';
import { timeline, moment, held, CHAR } from '../src/scripts/glass/anna-window-model.js';

const tl = timeline({ steps: annaDemo.steps.length, reply: annaDemo.reply });
const ids = tl.beats.map((b) => b.id);
const at = (id) => tl.beats.find((b) => b.id === id).at;

test('the beats, in the order the site tells it', () => {
  assert.deepEqual(ids, [
    'person', 'answer', 'sources',
    ...annaDemo.steps.map((_, i) => `step-${i}`),
    'question', 'typing', 'reply', 'result', 'record',
  ]);
  for (let i = 1; i < tl.beats.length; i++) assert.ok(tl.beats[i].at > tl.beats[i - 1].at, `${ids[i]} after ${ids[i - 1]}`);
  assert.ok(tl.beats[0].at >= 0);
});

test('readable, and 12 to 18 seconds in all', () => {
  assert.ok(tl.done >= 12 && tl.done <= 18, `total ${tl.done} s`);
  assert.ok(tl.done > tl.beats.at(-1).at, 'done after the last beat');
  for (let i = 1; i < tl.beats.length; i++) assert.ok(tl.beats[i].at - tl.beats[i - 1].at >= 0.4, `${ids[i]} comes too soon`);
  // the question is the longest thing she says, and Joris has to read it before he answers
  assert.ok(at('typing') - at('question') >= 2.5, 'time to read the question');
  assert.ok(at('result') - at('reply') >= 0.8, 'the result is not instant');
});

test('the reply types at a steady pace, every character, then sends', () => {
  const n = annaDemo.reply.length;
  assert.equal(tl.typing.from, at('typing'));
  assert.ok(Math.abs(tl.typing.to - (tl.typing.from + n * CHAR)) < 1e-9);
  assert.ok(CHAR >= 0.04 && CHAR <= 0.1, `${CHAR} s a character`);
  assert.ok(tl.typing.to < at('reply'), 'typed out before it is sent');
  // when each character lands: one every CHAR seconds
  const lands = [];
  let prev = 0;
  for (let t = tl.typing.from - 0.1; t < at('reply'); t += 0.001) {
    const k = moment(tl, t).typed;
    assert.ok(k >= prev, 'never deletes');
    if (k > prev) lands.push(t);
    prev = k;
  }
  assert.equal(lands.length, n, 'every character, once');
  for (let i = 1; i < lands.length; i++) assert.ok(Math.abs(lands[i] - lands[i - 1] - CHAR) < 0.0021, `steady at ${i}`);
  assert.equal(moment(tl, at('reply') - 0.01).typed, n, 'all of it, before it sends');
  assert.equal(moment(tl, at('reply')).typed, 0, 'the box is empty once sent');
  assert.equal(moment(tl, tl.typing.from - 0.01).typed, 0);
});

test('?chat moments map to the right beat', () => {
  assert.deepEqual(moment(tl, 0), { t: 0, beat: null, shown: [], typed: 0, done: false });
  assert.equal(moment(tl, at('person')).beat, 'person');
  assert.equal(moment(tl, at('answer') + 0.01).beat, 'answer');
  assert.equal(moment(tl, at('step-1') + 0.01).beat, 'step-1');
  assert.deepEqual(moment(tl, at('step-1') + 0.01).shown, ['person', 'answer', 'sources', 'step-0', 'step-1']);
  const q = moment(tl, at('question') + 0.5);
  assert.equal(q.beat, 'question');
  assert.equal(q.typed, 0);
  const typing = moment(tl, at('typing') + 0.5);
  assert.equal(typing.beat, 'typing');
  assert.ok(typing.typed > 0 && typing.typed < annaDemo.reply.length);
  assert.equal(moment(tl, at('reply') + 0.01).beat, 'reply');
  const end = moment(tl, tl.done);
  assert.equal(end.beat, 'record');
  assert.deepEqual(end.shown, ids);
  assert.equal(end.done, true);
  assert.equal(moment(tl, tl.done - 0.01).done, false);
  assert.deepEqual(moment(tl, 999).shown, ids, 'past the end it stays finished');
});

test('?chat= reads seconds; anything else plays as normal', () => {
  assert.equal(held('8.2'), 8.2);
  assert.equal(held('0'), 0);
  assert.equal(held('-3'), 0);
  for (const v of [null, '', 'abc', 'NaN']) assert.equal(held(v), null, String(v));
});

const SITE = '/home/wsl/Coding/Anamata/anna-site/app/page.tsx';
test('the conversation is the site\'s, word for word', { skip: !existsSync(SITE) && 'anna-site is not checked out here' }, () => {
  const src = readFileSync(SITE, 'utf8');
  // the English half of the page: the Dutch copy follows it
  const en = src.slice(0, src.indexOf("'Wat Anna heeft gedaan'"));
  const week = en.slice(en.indexOf("id: 'week'"), en.indexOf("id: 'leave'"));
  assert.ok(week.length > 200, 'found the week scenario');
  const one = (s) => week.includes(`'${s}'`);
  for (const k of ['who', 'person', 'answer', 'question', 'reply', 'result']) assert.ok(one(annaDemo[k]), `${k}: ${annaDemo[k]}`);
  for (const k of ['steps', 'sources', 'record']) {
    assert.ok(annaDemo[k].length > 0, k);
    for (const s of annaDemo[k]) assert.ok(one(s), `${k}: ${s}`);
  }
  assert.equal(annaDemo.steps.length, 4);
  assert.equal(annaDemo.record.length, 3);
  assert.ok(en.includes(`record: '${annaDemo.recordHeading}'`), 'the record\'s heading');
  assert.equal(annaDemo.reply, 'Yes, and submit it.');
});
