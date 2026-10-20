// Unit tests for shell-parser.ts — parseLine()
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLine } from '../src/scripts/shell-parser.ts';

function assertParsed(result: ReturnType<typeof parseLine>) {
  if ('error' in result) throw new Error(`Unexpected error: ${result.error}`);
  return result;
}

test('Simple command', () => {
  const t1 = assertParsed(parseLine('echo hello', {}));
  assert.equal(t1.groups.length, 1, 'T1: one group');
  assert.equal(t1.groups[0].pipeline[0].name, 'echo', 'T1: command name');
  assert.equal(t1.groups[0].pipeline[0].args[0], 'hello', 'T1: args');
});

test('Pipe', () => {
  const t2 = assertParsed(parseLine('cat resume | grep DevOps', {}));
  assert.equal(t2.groups[0].pipeline.length, 2, 'T2: two pipeline stages');
  assert.equal(t2.groups[0].pipeline[0].name, 'cat', 'T2: first cmd');
  assert.equal(t2.groups[0].pipeline[1].name, 'grep', 'T2: second cmd');
});

test('&& operator', () => {
  const t3 = assertParsed(parseLine('cd projects && ls', {}));
  assert.equal(t3.groups.length, 2, 'T3: two groups');
  assert.equal(t3.groups[1].operator, '&&', 'T3: && operator');
});

test('; operator', () => {
  const t4 = assertParsed(parseLine('cd projects; pwd', {}));
  assert.equal(t4.groups.length, 2, 'T4: two groups');
  assert.equal(t4.groups[1].operator, ';', 'T4: ; operator');
});

test('Quoted args', () => {
  const t5 = assertParsed(parseLine('echo "hello world"', {}));
  assert.equal(t5.groups[0].pipeline[0].args[0], 'hello world', 'T5: quoted arg');
});

test('Variable expansion', () => {
  const t6 = assertParsed(parseLine('echo $FOO', { FOO: 'bar' }));
  assert.equal(t6.groups[0].pipeline[0].args[0], 'bar', 'T6: var expansion');
});

test('Comments', () => {
  const t7 = assertParsed(parseLine('echo hello # this is a comment', {}));
  assert.equal(t7.groups[0].pipeline[0].args.length, 1, 'T7: comment stripped');
  assert.equal(t7.groups[0].pipeline[0].args[0], 'hello', 'T7: only hello');
});

test('Unclosed quote — shell-quote handles gracefully (no error)', () => {
  const t8 = assertParsed(parseLine('echo "hello', {}));
  assert.equal(t8.groups[0].pipeline[0].args[0], 'hello', 'T8: unclosed quote treated leniently');
});

test('Empty input', () => {
  const t9 = assertParsed(parseLine('', {}));
  assert.equal(t9.groups.length, 0, 'T9: empty input');
});

test('Complex pipeline with && and |', () => {
  const t10 = assertParsed(parseLine('echo $STACK | tr ":" "\\n" && wc -l', { STACK: 'a:b:c' }));
  assert.equal(t10.groups.length, 2, 'T10: two groups');
  assert.equal(t10.groups[0].pipeline.length, 2, 'T10: first group has pipe');
  assert.equal(t10.groups[0].pipeline[1].name, 'tr', 'T10: tr in pipe');
  assert.equal(t10.groups[1].pipeline[0].name, 'wc', 'T10: wc in second group');
});
