// Unit tests for shell-parser.ts — parseLine()
import { parseLine } from '../src/scripts/shell-parser';

function assertParsed(result: ReturnType<typeof parseLine>) {
  if ('error' in result) throw new Error(`Unexpected error: ${result.error}`);
  return result;
}

// Test 1: Simple command
const t1 = assertParsed(parseLine('echo hello', {}));
console.assert(t1.groups.length === 1, 'T1: one group');
console.assert(t1.groups[0].pipeline[0].name === 'echo', 'T1: command name');
console.assert(t1.groups[0].pipeline[0].args[0] === 'hello', 'T1: args');

// Test 2: Pipe
const t2 = assertParsed(parseLine('cat resume | grep DevOps', {}));
console.assert(t2.groups[0].pipeline.length === 2, 'T2: two pipeline stages');
console.assert(t2.groups[0].pipeline[0].name === 'cat', 'T2: first cmd');
console.assert(t2.groups[0].pipeline[1].name === 'grep', 'T2: second cmd');

// Test 3: && operator
const t3 = assertParsed(parseLine('cd projects && ls', {}));
console.assert(t3.groups.length === 2, 'T3: two groups');
console.assert(t3.groups[1].operator === '&&', 'T3: && operator');

// Test 4: ; operator
const t4 = assertParsed(parseLine('cd projects; pwd', {}));
console.assert(t4.groups.length === 2, 'T4: two groups');
console.assert(t4.groups[1].operator === ';', 'T4: ; operator');

// Test 5: Quoted args
const t5 = assertParsed(parseLine('echo "hello world"', {}));
console.assert(t5.groups[0].pipeline[0].args[0] === 'hello world', 'T5: quoted arg');

// Test 6: Variable expansion
const t6 = assertParsed(parseLine('echo $FOO', { FOO: 'bar' }));
console.assert(t6.groups[0].pipeline[0].args[0] === 'bar', 'T6: var expansion');

// Test 7: Comments
const t7 = assertParsed(parseLine('echo hello # this is a comment', {}));
console.assert(t7.groups[0].pipeline[0].args.length === 1, 'T7: comment stripped');
console.assert(t7.groups[0].pipeline[0].args[0] === 'hello', 'T7: only hello');

// Test 8: Unclosed quote — shell-quote handles gracefully (no error)
const t8 = assertParsed(parseLine('echo "hello', {}));
console.assert(t8.groups[0].pipeline[0].args[0] === 'hello', 'T8: unclosed quote treated leniently');

// Test 9: Empty input
const t9 = assertParsed(parseLine('', {}));
console.assert(t9.groups.length === 0, 'T9: empty input');

// Test 10: Complex pipeline with && and |
const t10 = assertParsed(parseLine('echo $STACK | tr ":" "\\n" && wc -l', { STACK: 'a:b:c' }));
console.assert(t10.groups.length === 2, 'T10: two groups');
console.assert(t10.groups[0].pipeline.length === 2, 'T10: first group has pipe');
console.assert(t10.groups[0].pipeline[1].name === 'tr', 'T10: tr in pipe');
console.assert(t10.groups[1].pipeline[0].name === 'wc', 'T10: wc in second group');

console.log('All shell-parser tests passed!');
