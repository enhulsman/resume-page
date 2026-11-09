// ANNA's four levels as four light shapes behind one pane, as numbers (tests:
// tests/glass-anna-scene.test.mjs). Two stagings use them (/hero-lab?lab=1&anna=turn|journey):
//   turnScene:    the ANNA card tilted back. Face-on the four overlap into one flame; tilted, each
//                 slides by its depth (parallax) and they come apart, top to bottom in level order.
//   journeyScene: one tall pane. The question goes down through the outlet, out along a connector
//                 and back, and arrives at the top as one message. Operations is always on.
// The shapes: Identity one small near light (one person); Claude two tongues meeting one outlet
// (two backends, one interface); MCP connectors bands fanning sideways; Operations the broad wash
// under everything. Every layer carries its `level` and its `depth` (0 at the glass, 1 furthest).
import { PERIOD } from './model.js';

export const LEVELS = ['identity', 'claude', 'connectors', 'ops'];
export const TURN_PANE = { w: 296, h: 400 };
export const JOURNEY_PANE = { w: 296, h: 520 };
const BASE = [230, 220, 208]; // ANNA's card (config/glass.ts: STONE tinted [4, -1, -5])
const C = 148;
const TAU = 2 * Math.PI;
const wave = (t, cycles, phase = 0) => Math.sin((TAU * cycles * t) / PERIOD + phase); // loops on PERIOD

// ANNA's colours, from its hero card: a red tip, a yellow root, an amber glow
// and one golden point, the person: inside the flame it reads as its bright core
const TIP = [214, 58, 34], ROOT = [255, 196, 96], GLOW = [240, 160, 118], AMBER = [244, 170, 84], CORE = [246, 190, 70];
const EMBER = [214, 72, 36], MESSAGE = [232, 120, 62]; // the question on its way (journey), and the answer it becomes
const TONGUE = { r: 18, h: 3.2, lean: 0.26 }; // root radius, height in radii, lean toward the other

/** Where the tongues' tips meet, for roots at `root`. */
export const outletY = (root) => root - TONGUE.r * TONGUE.h * Math.cos(TONGUE.lean);

/**
 * The four shapes, unmoved, around an axis at x = C. `y` places each level: the person's light,
 * the tongues' roots (their tips meet above, at outletY), the base the bands fan from, the wash.
 */
function shapes(t, y) {
  const sway = 0.035 * wave(t, 1), lift = 0.15 * wave(t, 2, 0.7);
  const outlet = outletY(y.root);
  const tongue = (side) => ({ // a drop whose tip leans in to the outlet; its root sits out to one side
    level: 'claude', depth: 0.34, kind: 'drop',
    cx: C + side * 17, cy: y.root, sx: TONGUE.r, sy: TONGUE.r, h: TONGUE.h + (side > 0 ? lift : 0),
    rot: side * -(TONGUE.lean + sway * side), sigma: 0.1, opacity: 0.92,
    color: TIP, color2: ROOT, g0: outlet + 6, g1: y.root + 10,
  });
  return [
    { level: 'ops', depth: 1, kind: 'ellipse', cx: C, cy: y.wash, sx: 250, sy: 150, sigma: 0.6, color: GLOW, opacity: 0.42 + 0.04 * wave(t, 1, 2.1) },
    // three bands through the flame's base, each at its own angle; a pulse runs along them in turn
    ...[-0.21, 0, 0.21].map((rot, k) => ({
      level: 'connectors', depth: 0.67, kind: 'ellipse', cx: C, cy: y.base, sx: 112, sy: 5.5, rot, sigma: 0.32, color: AMBER,
      opacity: 0.62 + 0.14 * wave(t, 2, -k * 2.1),
    })),
    tongue(-1), tongue(1),
    { level: 'identity', depth: 0.08, kind: 'ellipse', cx: C, cy: y.person, sx: 9 * (1 + 0.03 * wave(t, 1, 1)), sy: 9, sigma: 0.16, color: CORE, opacity: 1 },
  ];
}

// ---- staging A: the card, tilted back ----
// Face-on all four sit in one flame: the person its bright core, the bands across its base, the
// wash its glow. Tilted, each slides by how far it is from the pivot depth: the nearer ones up,
// the wash down, until they stand top to bottom in level order, each level with its copy.
const TURN_Y = { person: 205, root: 245, base: 258, wash: 272 };
const PIVOT = 0.6; // the depth that stays put
/** How far a light slides at a full turn, study px per unit of depth from the pivot: mostly down, a little sideways. */
const SPREAD = { y: 201, x: 40 };
const SOFTEN = 0.8; // at a full turn a light `depth` deep is (1 + SOFTEN * depth) times softer
/** Where each level's copy sits, level with its light at a full turn (study px down the pane). */
export const LABEL_Y = [100, 192, 272, 352];

export function turnScene(t, { turn = 0, only } = {}) {
  const layers = shapes(t, TURN_Y).map((L) => {
    const dy = (L.depth - PIVOT) * SPREAD.y * turn;
    return {
      ...L,
      cy: L.cy + dy, g0: L.g0 != null ? L.g0 + dy : undefined, g1: L.g1 != null ? L.g1 + dy : undefined,
      ox: (L.depth - PIVOT) * SPREAD.x * turn,
      sigma: L.sigma * (1 + SOFTEN * L.depth * turn),
    };
  });
  return { base: BASE, layers: only ? layers.filter((L) => L.level === only) : layers };
}

// ---- staging B: the journey ----
const JOURNEY_Y = { person: 70, root: 262, base: 372, wash: 420 };
const OUTLET = outletY(JOURNEY_Y.root);
const BAND = -0.21; // the connector the question goes out along (rising to the right)
const OUT = 98;
// the question's path: [p, x, y]; between keys it eases
const PATH = [
  [0, C, JOURNEY_Y.person],
  [0.16, C, JOURNEY_Y.person],
  [0.36, C, OUTLET],
  [0.5, C, JOURNEY_Y.base],
  [0.6, C + OUT * Math.cos(BAND), JOURNEY_Y.base + OUT * Math.sin(BAND)],
  [0.7, C, JOURNEY_Y.base],
  [0.84, C, OUTLET],
  [1, C, JOURNEY_Y.person],
];
const ease = (k) => k * k * (3 - 2 * k);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** Where the question is at journey progress `p` (0..1). */
export function requestAt(p) {
  const q = clamp01(p);
  let i = 1;
  while (i < PATH.length - 1 && PATH[i][0] < q) i++;
  const [p0, x0, y0] = PATH[i - 1], [p1, x1, y1] = PATH[i];
  const k = ease(clamp01((q - p0) / (p1 - p0 || 1)));
  return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k };
}

export function journeyScene(t, { p = 0, focus = -1, only } = {}) {
  const read = focus >= 0 ? LEVELS[focus] : null;
  const layers = shapes(t, JOURNEY_Y).map((L) => {
    const out = { ...L };
    if (L.level === 'ops') { out.sx = 230; out.sy = 190; } // the tall pane: the wash reaches up behind everything
    if (read && L.level === read) { out.sigma *= 0.55; out.opacity = Math.min(1, out.opacity * 1.2); }
    else if (read) out.sigma *= 1.25;
    return out;
  });
  // the band the question travels lights while it is out there
  const out = clamp01(1 - Math.abs(p - 0.6) / 0.12);
  const band = layers.find((L) => L.level === 'connectors' && L.rot === BAND);
  band.opacity = Math.min(1, band.opacity + 0.35 * out);
  // the person's light is the question: it travels, and at the end opens into the message
  const r = layers.find((L) => L.level === 'identity');
  const at = requestAt(p), open = ease(clamp01((p - 0.86) / 0.14));
  Object.assign(r, {
    request: true, cx: at.x, cy: at.y,
    color: EMBER.map((v, j) => v + (MESSAGE[j] - v) * open), // deeper than the core on its way; warmer once it is the message
    sx: r.sx + (112 - r.sx) * open, sy: r.sy + (20 - r.sy) * open,
    pn: 2 + 2 * open, // the message is a rounded box, not an ellipse
    sigma: r.sigma * (1 - 0.2 * open),
  });
  return { base: BASE, layers: only ? layers.filter((L) => L.level === only) : layers };
}
