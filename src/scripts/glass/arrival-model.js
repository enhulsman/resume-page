// The hero's arrival and the name's light, as pure functions (stone-homepage: "The hero arrives and
// the cards' light reaches the name", Ezra's pick from the hero sketch, round 3, 2026-11-11).
// One timeline, t in seconds: the four cards fade in one after another while their lights come up
// from dim and far behind the glass; once they have landed their colours rise in the name from
// below, hold, and settle into a resting tint that follows each card's light over the 10 s loop.
// arrival.js drives it in the page; tests/glass-hero.test.mjs checks it here.
import { cardState, fieldAt, PERIOD } from './model.js';

/** The arrival's length (s): the spill has settled by then. */
export const T = 5;
/** Card i starts fading in at START(i) s, 160 ms after the one before; FADE s later it is in. */
export const START = (i) => 0.12 + 0.16 * i;
export const FADE = 0.72;
/** Each light comes up over GLOW s, starting GLOW_DELAY s after its card. */
const GLOW = 0.95, GLOW_DELAY = 0.06;
/** The spill rises over RISE, holds, and settles over SETTLE ([start, length] in s). */
const RISE = [1.5, 0.7], SETTLE = [3.7, 1.3];
/** The resting tint, a share of the peak, at a card's brightest (half that at its dimmest). */
export const REST = 0.46;
/** The light's strength at its source, below the letters. */
export const SPILL_A = 0.76;
/** A phone's cards sit further below a smaller name: their light is this much stronger. */
export const PHONE_GAIN = 1.9;
/** The mouse's light at the pointer. */
export const HOVER_A = 0.5;

const clamp = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const outCubic = (x) => 1 - (1 - clamp(x)) ** 3;

/** How far card i is in at t (0 out, 1 in). */
export const cardIn = (i, t) => outCubic((t - START(i)) / FADE);
/** Card i's light at t: 0 dim and far behind the glass, 1 as it always draws. */
export const glowIn = (i, t) => smooth((t - START(i) - GLOW_DELAY) / GLOW);
/** The resting tint for a light at `amount` (0 its dimmest, 1 its brightest). */
export const restLevel = (amount) => REST * (0.5 + 0.5 * amount);
/** A card's spill at arrival time t, its light at `amount`: 0 before, 1 at the peak, then its rest. */
export function spillK(t, amount) {
  const s = smooth((t - SETTLE[0]) / SETTLE[1]);
  return smooth((t - RISE[0]) / RISE[1]) * (1 - s + s * restLevel(amount));
}

/**
 * How much light a card shows over its loop, in n samples: 0 at its dimmest, 1 at its brightest
 * (a light that barely changes stays 1). Upper parts of the card, nearest the name, weigh most.
 * Computed at build time (Hero.astro renders it as data-amount).
 */
export function loopAmounts(card, n = 40) {
  const row = [];
  for (let k = 0; k < n; k++) {
    const st = cardState(card.light, (PERIOD * k) / n, card.base, card.tune, card.distance, card.wash);
    let sum = 0, w = 0;
    for (let y = 30; y <= 290; y += 26) for (let x = 20; x <= 276; x += 32) {
      const F = fieldAt(st, x, y), wy = 1.6 - y / 290;
      sum += (wy * (Math.abs(F[0] - st.base[0]) + Math.abs(F[1] - st.base[1]) + Math.abs(F[2] - st.base[2]))) / 3;
      w += wy;
    }
    row.push(sum / w);
  }
  const lo = Math.min(...row), hi = Math.max(...row);
  return hi - lo <= 0.08 * hi ? row.map(() => 1) : row.map((v) => (v - lo) / (hi - lo));
}

/** A card's light amount at loop time t, between its samples; 1 when it has none. */
export function amountAt(row, t) {
  if (!row?.length) return 1;
  const n = row.length, f = ((((t % PERIOD) + PERIOD) % PERIOD) / PERIOD) * n, k = Math.floor(f) % n;
  return row[k] + (row[(k + 1) % n] - row[k]) * (f - Math.floor(f));
}

const rgba = (c, a) => `rgb(${c.map((v) => Math.round(v)).join(' ')} / ${+a.toFixed(3)})`;
/** A soft radial light (rx, ry its radii, at x, y in px): six falling stops, no edge anywhere. */
export function softLight(c, a, rx, ry, x, y) {
  const stops = [[1, 0], [0.82, 18], [0.55, 36], [0.28, 56], [0.1, 76], [0, 100]];
  return `radial-gradient(${rx.toFixed(0)}px ${ry.toFixed(0)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, ${stops.map(([k, p]) => `${rgba(c, a * k)} ${p}%`).join(', ')})`;
}

/**
 * Where a card's light sits on the name (boxes in viewport px): x at the card's centre, y a third
 * of the way down the card but never more than 1.45 names below the name's top (on a phone the
 * intro stands between), radii rx, ry; `seen` the share of the card in view (a phone's row scrolls
 * sideways) and `gain` the phone's extra strength.
 */
export function spillPlace(card, row, name, viewWidth, phone) {
  const seen = clamp((Math.min(card.right, row.right, viewWidth) - Math.max(card.left, row.left, 0)) / card.width);
  const y = Math.min(card.top + card.height * 0.3 - name.top, name.height * 1.45);
  return {
    x: card.left + card.width / 2 - name.left, y,
    rx: card.width * (phone ? 1.15 : 0.95), ry: y * 0.86,
    seen, gain: phone ? PHONE_GAIN : 1,
  };
}

/** The hue at viewport x: each card's (`hue`) weighted by how near its centre x is, in card widths. */
export function hueAt(x, cards) {
  let w = 0;
  const c = [0, 0, 0];
  for (const card of cards) {
    const d = (x - (card.left + card.width / 2)) / card.width, wi = Math.exp(-3 * d * d);
    w += wi;
    for (let j = 0; j < 3; j++) c[j] += card.hue[j] * wi;
  }
  return c.map((v) => v / w);
}
