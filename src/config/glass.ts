// The glass: the hero's cards (one [04] light per project), what may be glass, and the frosted windows' glows.
// Titles and links come from home.ts; each readout's number is one of the project's own
// dimensions there, so a number changed on the homepage changes here too.
import { details, annaLead, annaLevels, type DetailListing } from './home.ts';

type RGB = [number, number, number];
export interface LayerTune {
  scale?: number; stretch?: [number, number]; ground?: number; dx?: number; dy?: number;
  /** This layer's distance as a share of the card's (below 1: nearer the glass). */
  dist?: number;
  /** Added to the layer's shear: the shape leans, its sway kept. */
  lean?: number;
  set?: { color?: RGB; color2?: RGB; g0?: number; g1?: number; sigma?: number; opacity?: number; h?: number };
}

export interface GlassCard {
  id: 'anna' | DetailListing['id'];
  title: string;
  href: string;
  /** The number the readout leads with ('' for ANNA, whose fact is a phrase). */
  value: string;
  readout: string;
  /** Which of the study's fitted lights: 0 flame, 1 tide, 2 mist, 3 dusk, 4 moss. */
  light: number;
  /** The card's own colour, 0..255; the glass never shades it, only the light. */
  base: [number, number, number];
  /** Text colour on the card. */
  ink: 'dark' | 'light';
  /** Per layer of the light, how a pale card reshapes it (see cardState in scripts/glass/model.js); null keeps the study's. */
  tune?: (LayerTune | null)[];
  /** How far behind the glass the light sits: 0 hard edges, 1 the study's softness (Ezra's picks, 2026-11-09). */
  distance: number;
  /** One faint broad light under the rest, in the card's hue, so the ribs show across the whole card. */
  wash: { color: RGB; opacity: number };
  /** Lab only: the card as it was before review round 3 (no wash; set below). */
  before?: { tune?: (LayerTune | null)[] };
}

const dim = (id: DetailListing['id'], i: number) => {
  const d = details.find(x => x.id === id);
  if (!d || !d.dims[i]) throw new Error(`home.ts has no dimension ${i} for ${id}`);
  return { d, value: d.dims[i].value };
};

const card = (id: DetailListing['id'], title: string, i: number, words: (v: string) => string,
  light: number, base: GlassCard['base'], ink: GlassCard['ink'], distance: number, wash: GlassCard['wash'], tune?: GlassCard['tune']): GlassCard => {
  const { d, value } = dim(id, i);
  return { id, title, href: d.href, value, readout: words(value), light, base, ink, distance, wash, tune };
};

// warm stone glass, a shade under the page (#EEEAE3) so the card edge reads. One stone for all
// five, tinted a few levels toward each light: the light carries the colour, not the card.
const STONE: GlassCard['base'] = [226, 221, 213];
const tint = (d: RGB): GlassCard['base'] => STONE.map((v, j) => v + d[j]) as RGB;

// Study units: the card is 296 x 360; the title sits above y 80, the readout below y 300.
// Every light gets one hard contour (sigma ~0.05-0.12: a few px) for the ribs to break.
export const glassCards: GlassCard[] = [
  // the flame: a soft halo, then one hard-edged tongue, yellow at its root, red at the tip
  { id: 'anna', title: 'ANNA', href: annaLead.href, value: '', readout: 'In production', light: 0, base: tint([4, -1, -5]), ink: 'dark', distance: 0.35, wash: { color: [236, 150, 96], opacity: 0.2 },
    tune: [
      { scale: 1.9, dy: 10, set: { color: [242, 168, 112], sigma: 1.0, opacity: 0.75 } },
      { set: { opacity: 0 } },
      { scale: 1.45, stretch: [0.8, 1.15], lean: 0.15, dy: -22, set: { color: [214, 58, 34], color2: [255, 196, 96], g0: 150, g1: 300, sigma: 0.07 } },
    ] },
  // the tide: a deep sea band with crisp edges, paler at its crest
  card('henk', 'Henk', 0, v => `${v} ports · 0 inbound`, 1, tint([-3, -1, 3]), 'dark', 0.8, { color: [120, 156, 210], opacity: 0.18 }, [
    { scale: 0.95, set: { color: [128, 170, 226], color2: [48, 92, 172], g0: 130, g1: 260, sigma: 0.1 } },
  ]),
  // the sunset: a sun disc, yellow above and coral below, setting into a plum ground that fills
  // everything below the horizon, so the sun never shows again under it
  card('homelab', 'Homelab', 0, v => `${v} machines`, 3, tint([5, -5, -6]), 'dark', 0.5, { color: [236, 160, 132], opacity: 0.18 }, [
    { scale: 1.5, dy: -3, dist: 0.45, set: { color: [255, 180, 104], color2: [242, 92, 80], g0: 115, g1: 255, sigma: 0.05 } },
    { ground: 150, dy: -55, set: { sx: 900, color: [150, 122, 150], color2: [226, 212, 208], g0: 222, g1: 292, sigma: 0.018 } },
    { set: { opacity: 0 } },
  ]),
  // the moss: a pale halo, and a hard-rimmed pod, lit at the top
  card('sandbox', 'Claude Sandbox', 1, v => `${v} risk`, 4, tint([-2, 1, -3]), 'dark', 0.45, { color: [150, 188, 110], opacity: 0.18 }, [
    { scale: 2.2, set: { color: [196, 214, 160], sigma: 1.0, opacity: 0.6 } },
    { scale: 1.12, dy: 10, set: { color: [214, 234, 150], color2: [86, 140, 50], g0: 140, g1: 290, sigma: 0.07, opacity: 1 } },
  ]),
];

// What may be glass (Ezra, 2026-11-10): only an object with something behind it, never to explain
// anything, at most one on any screen. Each id is a `data-glass-moment` on the page, top to bottom;
// a new glass object is one line here and passes the same tests (tests/glass-home.*).
export const glassMoments = ['hero', 'anna', 'terminal'] as const;
export type GlassMoment = (typeof glassMoments)[number];

const rgba = (c: RGB, a: number) => `rgb(${c.join(' ')} / ${a})`;

/**
 * A card without WebGL: its ground (--base) under a soft radial gradient of its own light, the
 * layer with the hard contour (the flame's tongue, the tide, the sun, the pod) over its wash.
 * Computed at build time; every gradient fades to nothing, so there is no edge.
 */
export function fallbackFor(c: GlassCard): string {
  const tune = c.tune ?? [];
  const layer = tune.find((t) => t?.set?.color2) ?? tune.find((t) => t?.set?.color);
  const col = (layer?.set?.color ?? c.wash.color) as RGB;
  return [
    `radial-gradient(ellipse 52% 44% at 50% 58%, ${rgba(col, 0.62)} 0%, ${rgba(col, 0)} 100%)`,
    `radial-gradient(ellipse 80% 75% at 50% 52%, ${rgba(c.wash.color, 0.5)} 0%, ${rgba(c.wash.color, 0)} 100%)`,
  ].join(', ');
}

const STONE_GROUND: RGB = [238, 234, 227]; // #EEEAE3
const lum = (c: RGB) => {
  const lin = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
};
/**
 * A card's hue as an ink on stone, for its index in the homepage's Projects rows (the only colour
 * mark there): the deep end of its light's hard-edged layer, darkened (every channel scaled alike,
 * so the hue stays) only as far as 4.5:1 on the stone ground needs.
 */
export function hueInk(c: GlassCard): string {
  const layer = (c.tune ?? []).find((t) => t?.set?.color2);
  const from = (layer?.set?.color2 ?? c.wash.color) as RGB;
  const ground = lum(STONE_GROUND);
  for (let k = 1; k > 0; k -= 0.01) {
    const rgb = from.map((v) => Math.round(v * k)) as RGB;
    if ((ground + 0.05) / (lum(rgb) + 0.05) >= 4.5) return `rgb(${rgb.join(' ')})`;
  }
  return 'rgb(0 0 0)';
}

/** A frosted window's glow: soft radial lights beneath it, blurred, for the window to frost. */
export interface WindowGlow {
  /** Where the glow sits around its window, as CSS `inset`. */
  inset: string;
  blur: number;
  lights: { at: [number, number]; color: RGB; opacity: number }[];
}
// As tuned in the lab (/hero-lab): ANNA's flame, red at its foot, yellow at its heart, amber
// around; the terminal's, the hero's four lights as one soft field.
export const windowGlows: Record<'flame' | 'cards', WindowGlow> = {
  flame: { inset: '14% -7% 10%', blur: 28, lights: [
    { at: [28, 66], color: [214, 58, 34], opacity: 0.5 },
    { at: [52, 42], color: [255, 196, 96], opacity: 0.6 },
    { at: [78, 58], color: [240, 160, 118], opacity: 0.55 },
  ] },
  cards: { inset: '6% -8% 10%', blur: 28, lights: [
    { at: [22, 40], color: [236, 120, 70], opacity: 0.55 },
    { at: [46, 62], color: [110, 150, 214], opacity: 0.45 },
    { at: [70, 38], color: [240, 150, 120], opacity: 0.45 },
    { at: [86, 64], color: [150, 190, 110], opacity: 0.42 },
  ] },
};
/** The glow's CSS background: one soft radial gradient per light, each fading to nothing. */
export const glowBackground = (g: WindowGlow) =>
  g.lights.map((l) => `radial-gradient(closest-side at ${l.at[0]}% ${l.at[1]}%, ${rgba(l.color, l.opacity)}, ${rgba(l.color, 0)})`).join(', ');

// Off the hero for now (Ezra, 2026-11-09: he barely uses it); it can come back as 05.
export const benched: GlassCard[] = [
  // the mist: a deep haze, and over it one tilted pale band
  card('finance', 'Finance Bot', 1, v => `${v} rules`, 2, tint([-2, 0, 3]), 'dark', 0.5, { color: [170, 180, 198], opacity: 0.18 }, [
    { scale: 2.6, dy: -30, set: { color: [146, 156, 176], sigma: 1.0 } },
    { scale: 1.25, dy: -24, lean: 0.15, set: { color: [250, 251, 253], color2: [186, 196, 216], g0: 190, g1: 260, sigma: 0.08 } },
  ]),
];

// Lab only (/hero-lab?look=before): the lights as they were before review round 3, which added
// the wash, leaned the flame, and lightened Henk. Homelab and Sandbox kept their tune.
const beforeTune: Partial<Record<GlassCard['id'], (LayerTune | null)[]>> = {
  anna: [
    { scale: 1.9, dy: 10, set: { color: [242, 168, 112], sigma: 1.0, opacity: 0.75 } },
    { set: { opacity: 0 } },
    { scale: 1.45, dy: -22, set: { color: [214, 58, 34], color2: [255, 196, 96], g0: 150, g1: 300, sigma: 0.07 } },
  ],
  henk: [{ scale: 1.1, set: { color: [120, 164, 222], color2: [30, 70, 150], g0: 130, g1: 260, sigma: 0.1 } }],
  finance: [
    { scale: 2.6, dy: -30, set: { color: [168, 176, 190], sigma: 1.0 } },
    { scale: 1.25, dy: -24, set: { color: [252, 252, 253], color2: [206, 213, 226], g0: 190, g1: 260, sigma: 0.08 } },
  ],
};
for (const c of [...glassCards, ...benched]) c.before = { tune: beforeTune[c.id] ?? c.tune };

export const h2Card: GlassCard = { ...glassCards[0], readout: 'In production at Anamata' };

// ---- ANNA's section (task 2.3, /hero-lab?lab=1): four panes over one flame, pulled apart ----
// ANNA's own light, the flame, so the section reads as ANNA and never borrows another card's. Words come from annaLevels in home.ts.

export interface AnnaPane {
  id: (typeof annaLevels)[number]['id'];
  name: string;
  text: string;
  light: number;
  base: GlassCard['base'];
  tune: LayerTune[];
  distance: number;
  wash: GlassCard['wash'];
}
/** `h`: the pane's height in study px (its width is always 296); the CSS keeps that aspect. */
export interface AnnaVariant { h: number; panes: AnnaPane[] }

const FLAME = 0;
const ANNA_BASE = glassCards[0].base;
/** The flame's two layers (halo, tongue) placed in a pane: centre, size and gradient in study px. */
const flame = (o: { x: number; haloY: number; halo: number; tongueY: number; tongue: number; tip: RGB; root: RGB; glow: RGB; g: [number, number]; haloOpacity?: number; tongueOpacity?: number }): LayerTune[] => [
  { scale: o.halo, dx: o.x - 147.4, dy: o.haloY - 208.8, set: { color: o.glow, sigma: 1.0, opacity: o.haloOpacity ?? 0.75 } },
  { set: { opacity: 0 } },
  { scale: o.tongue, stretch: [0.8, 1.15], lean: 0.15, dx: o.x - 148.5, dy: o.tongueY - 287, set: { color: o.tip, color2: o.root, g0: o.g[0], g1: o.g[1], sigma: 0.07, opacity: o.tongueOpacity ?? 1 } },
];

// ANNA's card colours: a red tip, a yellow root, an amber glow
const annaFlame = { tip: [214, 58, 34] as RGB, root: [255, 196, 96] as RGB, glow: [242, 168, 112] as RGB };

// exploded: one flame under the stack. The bottom pane is nearest it and shows it whole; each
// pane above sees it further off and through more glass: softer and fainter
const up = [
  { distance: 1.6, tongue: 0.5, halo: 0.45 },
  { distance: 1.1, tongue: 0.68, halo: 0.55 },
  { distance: 0.7, tongue: 0.85, halo: 0.65 },
  { distance: 0.35, tongue: 1, halo: 0.75 },
];
export const annaExploded: AnnaVariant = {
  h: 296,
  panes: annaLevels.map((l, i) => ({
    ...l, light: FLAME, base: ANNA_BASE, distance: up[i].distance,
    wash: { color: [236, 150, 96], opacity: 0.2 },
    tune: flame({ x: 148, haloY: 150, halo: 1.5, tongueY: 205, tongue: 1.1, g: [116, 229], haloOpacity: up[i].halo, tongueOpacity: up[i].tongue, ...annaFlame }),
  })),
};
