// ANNA in a glass window: when each beat of the conversation lands, and what her one line of work
// says. Pure, no DOM (the driver is anna-window.js; the tests are tests/glass-anna-window.test.mjs).
//
// Joris asks; she answers; under her answer one line shows her work, what she read and then each
// step replacing the last (Ezra, 2026-11-11, sketch C2); she asks the one question that is his and
// the line settles into a summary; he types his reply into the box and sends it; she reports.
// Pacing (Ezra, 2026-11-11): her question lands between round 1's ~8 s (too fast) and round 2's
// ~22 s (too slow): each line of work stays up 1.1 s plus 25 ms a character, so with today's copy
// her question lands at 13.9 s and the play ends at 20.5 s.

/** Seconds per typed character of the reply. */
export const CHAR = 0.065;

/** How long a line of work stays up, in seconds: long enough to read it. */
export const dwell = (text) => 1.1 + text.length * 0.025;

/**
 * The beats, in order, each with the second it lands (`at`), for her lines of work `lines` (what
 * she read, then one line per step) and the reply `reply`. The first line lands with the `sources`
 * beat, each later one with its `step-<i>` beat; `typing` is the stretch in which the reply is
 * typed; `done` is the end.
 */
export function timeline({ lines, reply }) {
  const beats = [];
  let t = 0.3;
  const add = (id, gap) => { t += gap; beats.push({ id, at: +t.toFixed(3) }); };
  add('person', 0);
  add('answer', 1.4);
  add('sources', 1.5);
  for (let i = 1; i < lines.length; i++) add(`step-${i - 1}`, dwell(lines[i - 1]));
  add('question', dwell(lines.at(-1)));
  add('typing', 3.2); // the question is the long one: time to read it first
  const from = t, to = from + reply.length * CHAR;
  t = to;
  add('reply', 0.35);
  add('result', 1.0);
  return { beats, typing: { from, to, chars: reply.length }, done: +(t + 0.8).toFixed(3) };
}

/**
 * The conversation at second `t`: the newest beat that has landed (or null), every beat landed so
 * far, how much of the reply is in the box, and whether it is finished.
 */
export function moment(tl, t) {
  const shown = tl.beats.filter((b) => t >= b.at).map((b) => b.id);
  const sent = shown.includes('reply');
  const { from, chars } = tl.typing;
  // character k (1-based) lands at from + (k - 1) * CHAR
  const typed = sent || t < from ? 0 : Math.min(chars, Math.floor((t - from) / CHAR + 1e-6) + 1);
  return { t, beat: shown.at(-1) ?? null, shown, typed, done: t >= tl.done };
}

/**
 * What her line of work says, given the beats shown: the newest step's line, or what she read; once
 * her question has landed (or before anything has, as the page shows it without a script), `done`.
 */
export function workText(shown, lines, done) {
  if (shown.includes('question') || !shown.includes('sources')) return done;
  const step = [...shown].reverse().find((b) => b.startsWith('step-'));
  return step ? lines[+step.slice(5) + 1] : lines[0];
}

/** ?chat=<seconds>: the moment to hold, or null to play as normal. */
export function held(v) {
  if (v == null || v.trim() === '') return null;
  const s = Number(v);
  return Number.isFinite(s) ? Math.max(0, s) : null;
}
