// The play-speed test hook, ?speed=<n>: ANNA's conversation, the projects' artefacts and the
// terminal's intro (and its passing hint) play n times faster, so the browser tests need not wait
// out ~20 s of conversation in real time. The light's loop and its slow-device guard keep real time.
// The hook ships with the page (CI runs the browser tests against the production build), so, like
// ?busy= (guard.js), only a small finite factor counts: a number from 1 to SPEED_MAX. Anything
// else (Infinity, text, zero, a negative, a factor under 1) plays at normal speed, never slower and
// never all at once.

/** The fastest a play may run: ten times its own pace. */
export const SPEED_MAX = 10;

/** ?speed=<n> as a factor from 1 to SPEED_MAX; anything else is 1. */
export function speedFrom(v) {
  const n = typeof v === 'string' ? (v.trim() === '' ? NaN : Number(v)) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n > 1 ? Math.min(n, SPEED_MAX) : 1;
}

/** This page's play speed, from its URL. */
export const pageSpeed = () => speedFrom(new URLSearchParams(location.search).get('speed'));
