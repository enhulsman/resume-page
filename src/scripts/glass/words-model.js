// Words and the glass, as numbers (tests: tests/glass-words.test.mjs).

const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

// The name on arrival: far behind the glass (blurred), coming into focus behind the ribs,
// then the glass lifts off and the real text stands.
export const REVEAL = { resolve: 1.5, total: 2.3, far: 5.5 };
/** At `t` seconds: `lod` the ink's blur (mip level), `glass` 1 behind glass, 0 the glass gone. */
export function revealAt(t) {
  const k = smooth(t / REVEAL.resolve);
  const lift = smooth((t - REVEAL.resolve) / (REVEAL.total - REVEAL.resolve));
  return { lod: t >= REVEAL.resolve ? 0 : REVEAL.far * (1 - k), glass: 1 - lift };
}
