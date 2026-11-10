// ANNA in a glass window: when each beat of the conversation lands. Pure, no DOM
// (the driver is anna-window.js; the tests are tests/glass-anna-window.test.mjs).
//
// Joris asks; she answers; her steps tick in under the sources she read; she asks the one question
// that is his; he types his reply into the box and sends it; she reports, and shows the record.

/** Seconds per typed character of the reply. */
export const CHAR = 0.065;
/** Seconds between two steps ticking in. */
const STEP = 0.9;

/**
 * The beats, in order, each with the second it lands (`at`), for a conversation with `steps` steps
 * and the reply `reply`. `typing` is the stretch in which the reply is typed; `done` is the end.
 */
export function timeline({ steps, reply }) {
  const beats = [];
  let t = 0.3;
  const add = (id, gap) => { t += gap; beats.push({ id, at: +t.toFixed(3) }); };
  add('person', 0);
  add('answer', 1.4);
  add('sources', 1.5);
  for (let i = 0; i < steps; i++) add(`step-${i}`, i === 0 ? 0.5 : STEP);
  add('question', 1.4);
  add('typing', 3.2); // the question is the long one: time to read it first
  const from = t, to = from + reply.length * CHAR;
  t = to;
  add('reply', 0.35);
  add('result', 1.0);
  add('record', 1.4);
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

/** ?chat=<seconds>: the moment to hold, or null to play as normal. */
export function held(v) {
  if (v == null || v.trim() === '') return null;
  const s = Number(v);
  return Number.isFinite(s) ? Math.max(0, s) : null;
}
