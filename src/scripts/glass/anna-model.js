// ANNA's stack as numbers, no DOM (tests: tests/glass-anna.test.mjs). anna.js drives it.
// open:   0 the four panes pressed into one block, 1 pulled apart (scroll sets it)
// active: the level being read (-1 none); that pane slides out and sharpens

const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

/** What one pane should show: its distance, the flame's two opacities, and how far it slides out (0..1). */
export function paneTarget(pane, i, { open, active }) {
  let distance = pane.distance;
  let tongue = pane.tune[2].set.opacity;
  let halo = pane.tune[0].set.opacity;
  let slide = 0;
  const shut = 1 - smooth(open);
  // pressed together, every pane sees the flame through the whole block
  distance += 0.9 * shut;
  tongue *= 1 - 0.6 * shut;
  halo *= 1 - 0.4 * shut;
  if (active === i) {
    distance = Math.min(distance, 0.2);
    tongue = 1;
    halo = Math.max(halo, 0.75);
    slide = 1;
  } else if (active >= 0) {
    distance += 0.35;
    tongue *= 0.8;
  }
  return { distance, tongue, halo, slide };
}

/** The gap between panes as a share of the open gap: nearly touching when shut. */
export const gapShare = (open) => 1 - 0.94 * (1 - smooth(open));

export const TURN = { rest: { rx: 60, rz: -45 }, minTilt: 15, maxTilt: 88 };

/** A drag of (dx, dy) CSS px: sideways turns the stack round, up and down tilts it. */
export function turnBy(s, dx, dy) {
  return {
    rz: s.rz + dx * 0.35,
    rx: Math.min(TURN.maxTilt, Math.max(TURN.minTilt, s.rx + dy * 0.25)),
  };
}
