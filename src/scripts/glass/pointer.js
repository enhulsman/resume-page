// The pointer as a light (glass-material, Ezra 2026-11-11, sketch B1): on a desktop pointer the
// glass answers the mouse and adds nothing new. Each ribbed card's light leans a little toward the
// pointer when it is within about a card's reach, and the card under the pointer brings its light
// nearer the glass (sharper); over a frosted window a soft sheen follows the pointer. Touch, pen,
// reduced motion and a still or frozen light ignore it: phones are unaffected.
//
// leanToward is pure (tests/glass-home.test.mjs); panes.js eases each pane toward it and draws the
// light shifted. The sheen is wired here, on import.

/** Full lean, in study px: sideways and up or down. */
export const LEAN = { x: 52, y: 32 };
/** How much nearer the glass the pointed card's light comes: its distance is scaled by 1 - NEAR. */
export const NEAR = 0.7;

/**
 * The lean of a card's light toward `pointer` ([x, y] in viewport px, or null for none), given the
 * card's box ({ left, top, width, height }): `x`, `y` in study px and `near` (1 on the card, else 0).
 * Within 0.6 of a card's size from its centre the lean is full; it fades out over the next 1.4.
 */
export function leanToward(pointer, box) {
  if (!pointer) return { x: 0, y: 0, near: 0 };
  const nx = (pointer[0] - (box.left + box.width / 2)) / box.width;
  const ny = (pointer[1] - (box.top + box.height / 2)) / box.height;
  const reach = Math.max(0, 1 - Math.max(0, Math.hypot(nx, ny) - 0.6) / 1.4);
  if (reach === 0) return { x: 0, y: 0, near: 0 };
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  return {
    x: clamp(nx) * LEAN.x * reach || 0,
    y: clamp(ny) * LEAN.y * reach || 0,
    near: Math.abs(nx) < 0.5 && Math.abs(ny) < 0.5 ? 1 : 0,
  };
}

/** Where the mouse is, in viewport px, or null (no mouse yet, it left, or touch). */
export let pointer = null;

// in the page only (the unit tests import leanToward under Node)
if (typeof window !== 'undefined') {
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  addEventListener('pointermove', (e) => { pointer = e.pointerType === 'mouse' ? [e.clientX, e.clientY] : null; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; });
  addEventListener('blur', () => { pointer = null; });

  // the sheen on every frosted window: a soft highlight where the mouse is (once a frame at most)
  const windows = [...document.querySelectorAll('[data-glass="frosted"]')];
  let queued = false;
  function sheen() {
    queued = false;
    const on = pointer && !still.matches;
    document.documentElement.classList.toggle('pointer-light', !!on);
    for (const w of windows) {
      if (!on) { w.style.removeProperty('--sx'); w.style.removeProperty('--sy'); continue; }
      const b = w.getBoundingClientRect();
      if (b.bottom < -200 || b.top > innerHeight + 200) continue;
      w.style.setProperty('--sx', `${(((pointer[0] - b.left) / b.width) * 100).toFixed(1)}%`);
      w.style.setProperty('--sy', `${(((pointer[1] - b.top) / b.height) * 100).toFixed(1)}%`);
    }
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(sheen); } };
  if (windows.length) {
    addEventListener('pointermove', queue, { passive: true });
    addEventListener('scroll', () => { if (pointer) queue(); }, { passive: true });
    document.documentElement.addEventListener('pointerleave', queue);
    still.addEventListener('change', queue);
  }
}
