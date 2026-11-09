// The glass hero prototype's cards (/hero-lab): one [04] light per project.
// Titles and links come from home.ts; each readout's number is one of the project's own
// dimensions there, so a number changed on the homepage changes here too.
import { details, annaLead, type DetailListing } from './home.ts';

type RGB = [number, number, number];
export interface LayerTune {
  scale?: number; stretch?: [number, number]; ground?: number; dx?: number; dy?: number;
  /** This layer's distance as a share of the card's (below 1: nearer the glass). */
  dist?: number;
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
}

const dim = (id: DetailListing['id'], i: number) => {
  const d = details.find(x => x.id === id);
  if (!d || !d.dims[i]) throw new Error(`home.ts has no dimension ${i} for ${id}`);
  return { d, value: d.dims[i].value };
};

const card = (id: DetailListing['id'], title: string, i: number, words: (v: string) => string,
  light: number, base: GlassCard['base'], ink: GlassCard['ink'], distance: number, tune?: GlassCard['tune']): GlassCard => {
  const { d, value } = dim(id, i);
  return { id, title, href: d.href, value, readout: words(value), light, base, ink, distance, tune };
};

// warm stone glass, a shade under the page (#EEEAE3) so the card edge reads. One stone for all
// five, tinted a few levels toward each light: the light carries the colour, not the card.
const STONE: GlassCard['base'] = [226, 221, 213];
const tint = (d: RGB): GlassCard['base'] => STONE.map((v, j) => v + d[j]) as RGB;

// Study units: the card is 296 x 360; the title sits above y 80, the readout below y 300.
// Every light gets one hard contour (sigma ~0.05-0.12: a few px) for the ribs to break.
export const glassCards: GlassCard[] = [
  // the flame: a soft halo, then one hard-edged tongue, yellow at its root, red at the tip
  { id: 'anna', title: 'ANNA', href: annaLead.href, value: '', readout: 'In production', light: 0, base: tint([4, -1, -5]), ink: 'dark', distance: 0.35,
    tune: [
      { scale: 1.9, dy: 10, set: { color: [242, 168, 112], sigma: 1.0, opacity: 0.75 } },
      { set: { opacity: 0 } },
      { scale: 1.45, dy: -22, set: { color: [214, 58, 34], color2: [255, 196, 96], g0: 150, g1: 300, sigma: 0.07 } },
    ] },
  // the tide: a deep sea band with crisp edges, paler at its crest
  card('henk', 'Henk', 0, v => `${v} ports · 0 inbound`, 1, tint([-3, -1, 3]), 'dark', 0.8, [
    { scale: 1.1, set: { color: [120, 164, 222], color2: [30, 70, 150], g0: 130, g1: 260, sigma: 0.1 } },
  ]),
  // the mist: a haze, and over it one cool band with hard edges
  card('finance', 'Finance Bot', 1, v => `${v} rules`, 2, tint([-2, 0, 3]), 'dark', 0.5, [
    { scale: 2.6, dy: -30, set: { color: [168, 176, 190], sigma: 1.0 } },
    { scale: 1.25, dy: -24, set: { color: [252, 252, 253], color2: [206, 213, 226], g0: 190, g1: 260, sigma: 0.08 } },
  ]),
  // the sunset: a sun disc, yellow above and coral below, setting into a plum ground that fills
  // everything below the horizon, so the sun never shows again under it
  card('homelab', 'Homelab', 0, v => `${v} machines`, 3, tint([5, -5, -6]), 'dark', 0.5, [
    { scale: 1.5, dy: -3, dist: 0.45, set: { color: [255, 180, 104], color2: [242, 92, 80], g0: 115, g1: 255, sigma: 0.05 } },
    { ground: 150, dy: -55, set: { sx: 900, color: [150, 122, 150], color2: [226, 212, 208], g0: 222, g1: 292, sigma: 0.018 } },
    { set: { opacity: 0 } },
  ]),
  // the moss: a pale halo, and a hard-rimmed pod, lit at the top
  card('sandbox', 'Claude Sandbox', 1, v => `${v} risk`, 4, tint([-2, 1, -3]), 'dark', 0.45, [
    { scale: 2.2, set: { color: [196, 214, 160], sigma: 1.0, opacity: 0.6 } },
    { scale: 1.12, dy: 10, set: { color: [214, 234, 150], color2: [86, 140, 50], g0: 140, g1: 290, sigma: 0.07, opacity: 1 } },
  ]),
];

export const h2Card: GlassCard = { ...glassCards[0], readout: 'In production at Anamata' };
