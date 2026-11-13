// The glass: the hero's cards (one [04] light per project), what may be glass, and the frosted windows' glows.
// Titles and links come from home.ts; each readout's number is one of the project's own
// dimensions there, so a number changed on the homepage changes here too.
import { details, annaLead, register, type DetailListing, type CardListing } from './home.ts';

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
  id: 'anna' | DetailListing['id'] | CardListing['id'];
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
  /** The colour this card's light throws on the hero's name (its light's own hue, not its stone; sketch round 3, 2026-11-11). */
  spill?: RGB;
}

const dim = (id: DetailListing['id'], i: number) => {
  const d = details.find(x => x.id === id);
  if (!d || !d.dims[i]) throw new Error(`home.ts has no dimension ${i} for ${id}`);
  return { d, value: d.dims[i].value };
};

const card = (id: DetailListing['id'], title: string, i: number, words: (v: string) => string,
  light: number, base: GlassCard['base'], ink: GlassCard['ink'], distance: number, wash: GlassCard['wash'], spill: RGB | undefined, tune?: GlassCard['tune']): GlassCard => {
  const { d, value } = dim(id, i);
  return { id, title, href: d.href, value, readout: words(value), light, base, ink, distance, wash, spill, tune };
};

// warm stone glass, a shade under the page (#EEEAE3) so the card edge reads. One stone for all
// five, tinted a few levels toward each light: the light carries the colour, not the card.
const STONE: GlassCard['base'] = [226, 221, 213];
const tint = (d: RGB): GlassCard['base'] => STONE.map((v, j) => v + d[j]) as RGB;

// Study units: the card is 296 x 360; the title sits above y 80, the readout below y 300.
// Every light gets one hard contour (sigma ~0.05-0.12: a few px) for the ribs to break.
export const glassCards: GlassCard[] = [
  // the flame: a soft halo, then one hard-edged tongue, yellow at its root, red at the tip
  { id: 'anna', title: 'ANNA', href: annaLead.href, value: '', readout: 'In production', light: 0, base: tint([4, -1, -5]), ink: 'dark', distance: 0.35, wash: { color: [236, 150, 96], opacity: 0.2 }, spill: [238, 92, 30],
    tune: [
      { scale: 1.9, dy: 10, set: { color: [242, 168, 112], sigma: 1.0, opacity: 0.75 } },
      { set: { opacity: 0 } },
      { scale: 1.45, stretch: [0.8, 1.15], lean: 0.15, dy: -22, set: { color: [214, 58, 34], color2: [255, 196, 96], g0: 150, g1: 300, sigma: 0.07 } },
    ] },
  // the tide: a deep sea band with crisp edges, paler at its crest
  card('henk', 'Henk', 0, v => `${v} ports · 0 inbound`, 1, tint([-3, -1, 3]), 'dark', 0.8, { color: [120, 156, 210], opacity: 0.18 }, [40, 110, 235], [
    { scale: 0.95, set: { color: [128, 170, 226], color2: [48, 92, 172], g0: 130, g1: 260, sigma: 0.1 } },
  ]),
  // the sunset: a sun disc, yellow above and coral below, setting into a plum ground that fills
  // everything below the horizon, so the sun never shows again under it
  card('homelab', 'Homelab', 0, v => `${v} machines`, 3, tint([5, -5, -6]), 'dark', 0.5, { color: [236, 160, 132], opacity: 0.18 }, [240, 78, 70], [
    { scale: 1.5, dy: -3, dist: 0.45, set: { color: [255, 180, 104], color2: [242, 92, 80], g0: 115, g1: 255, sigma: 0.05 } },
    { ground: 150, dy: -55, set: { sx: 900, color: [150, 122, 150], color2: [226, 212, 208], g0: 222, g1: 292, sigma: 0.018 } },
    { set: { opacity: 0 } },
  ]),
  // the moss: a pale halo, and a hard-rimmed pod, lit at the top
  card('sandbox', 'Claude Sandbox', 1, v => `${v} risk`, 4, tint([-2, 1, -3]), 'dark', 0.45, { color: [150, 188, 110], opacity: 0.18 }, [100, 170, 30], [
    { scale: 2.2, set: { color: [196, 214, 160], sigma: 1.0, opacity: 0.6 } },
    { scale: 1.12, dy: 10, set: { color: [214, 234, 150], color2: [86, 140, 50], g0: 140, g1: 290, sigma: 0.07, opacity: 1 } },
  ]),
];

// What may be glass (Ezra, 2026-11-10, changed 2026-11-11): any object that genuinely holds
// something, a light or a window's content, never to explain anything; two may share a screen.
// Each id is a `data-glass-moment` on the page, top to bottom; a new glass object is one line here
// and passes the same tests (tests/glass-home.*). henk, sandbox and bible are the Projects windows.
export const glassMoments = ['hero', 'anna', 'henk', 'sandbox', 'bible', 'terminal'] as const;
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
/** A card's faint broad light (its wash), by id: the hue a window's glow borrows from the hero. */
const washOf = (id: GlassCard['id']): RGB => {
  const c = glassCards.find((x) => x.id === id);
  if (!c) throw new Error(`glass.ts has no card ${id}`);
  return c.wash.color;
};

/** One of the hero's lights reflected in the terminal's glass. */
export interface ReflectionPane {
  card: GlassCard['id'];
  /** Where it shows on the window, upright, in % of the window: left, top, width, height. */
  box: [number, number, number, number];
}
/**
 * The terminal's reflection of the hero (Ezra, 2026-11-10: "just one or two colors in a different
 * configuration, so it's less busy and feels more premium"): two of the cards' lights, one warm and
 * one cool, far behind the glass. Each pane is an oval that fades to nothing under a wide blur, the
 * warm one large near the top left, the cool one smaller and lower on the right, never a row. The
 * terminal's glow beneath the window holds the same two hues (windowGlows.cards).
 */
export const terminalReflection: { blur: number; opacity: number; panes: ReflectionPane[] } = {
  blur: 10,
  opacity: 0.34,
  panes: [
    { card: 'anna', box: [2, 0, 60, 36] },
    { card: 'henk', box: [62, 10, 34, 24] },
  ],
};

// Every project's own light (openspec stone-inner-pages, Ezra 2026-11-10): a near and a deep colour
// for its windows' glows and /blog's hover lights, and a ribbed light (`card`) for its card on
// /projects. The hero's three projects keep their card's light; bible-tui (amber), pytaiga-mcp (teal),
// Encrypted Chat TUI (violet), herdr-android (orchid) and This site (warm, ANNA's flame without its tongue) are tuned as in
// the inner-page sketches; Finance Bot has a light of its own (Ezra's fix), a jade green, no longer the
// benched mist: its deep colour at least 30 degrees of hue from every other project's and the mist's.
export type ProjectLightId = DetailListing['id'] | CardListing['id'];
export interface ProjectLight { near: RGB; deep: RGB; card: GlassCard }
const heroCard = (id: GlassCard['id']) => {
  const c = glassCards.find((x) => x.id === id);
  if (!c) throw new Error(`glass.ts has no hero card ${id}`);
  return c;
};
const listingOf = (id: ProjectLightId) => {
  const l = [...details, ...register].find((x) => x.id === id);
  if (!l) throw new Error(`home.ts has no project ${id}`);
  return l;
};
/** A project light of its own: one of the study's fitted shapes (`light`), recoloured. */
const ownLight = (id: ProjectLightId, light: number, base: GlassCard['base'], wash: RGB, distance: number, tune: GlassCard['tune']): GlassCard =>
  ({ id, title: listingOf(id).title, href: listingOf(id).href, value: '', readout: '', light, base, ink: 'dark', distance, wash: { color: wash, opacity: 0.2 }, tune });

export const projectLights: Record<ProjectLightId, ProjectLight> = {
  henk: { near: [128, 170, 226], deep: [48, 92, 172], card: heroCard('henk') },
  // the sun, and the plum ground it sets into
  homelab: { near: [255, 180, 104], deep: [176, 120, 150], card: heroCard('homelab') },
  sandbox: { near: [196, 224, 140], deep: [86, 140, 50], card: heroCard('sandbox') },
  // the mist's shape (a deep haze, one tilted pale band), in jade: Finance Bot's own
  finance: { near: [150, 214, 164], deep: [52, 150, 78], card: ownLight('finance', 2, tint([-3, 1, -2]), [120, 186, 138], 0.5, [
    { scale: 2.6, dy: -30, set: { color: [150, 214, 164], sigma: 1.0 } },
    { scale: 1.25, dy: -24, lean: 0.15, set: { color: [228, 244, 232], color2: [52, 150, 78], g0: 190, g1: 260, sigma: 0.08 } },
  ]) },
  // amber: a flame's halo and a short tongue, deep orange at its tip
  bible: { near: [244, 196, 110], deep: [196, 110, 52], card: ownLight('bible', 0, tint([5, 0, -7]), [240, 176, 100], 0.45, [
    { scale: 1.9, dy: 10, set: { color: [246, 200, 130], sigma: 1.0, opacity: 0.7 } },
    { set: { opacity: 0 } },
    { scale: 1.3, stretch: [0.9, 1.05], dy: -16, set: { color: [196, 104, 40], color2: [255, 214, 120], g0: 150, g1: 300, sigma: 0.08 } },
  ]) },
  // teal: the tide's band, greener
  pytaiga: { near: [132, 204, 190], deep: [40, 120, 120], card: ownLight('pytaiga', 1, tint([-3, 1, 0]), [110, 180, 170], 0.6, [
    { scale: 0.95, set: { color: [132, 204, 190], color2: [36, 112, 112], g0: 130, g1: 260, sigma: 0.1 } },
  ]) },
  // violet: a pale halo and a hard-rimmed pod
  chat: { near: [196, 172, 226], deep: [104, 78, 168], card: ownLight('chat', 4, tint([-1, -2, 2]), [176, 156, 214], 0.45, [
    { scale: 2.2, set: { color: [206, 194, 230], sigma: 1.0, opacity: 0.6 } },
    { scale: 1.1, dy: 10, set: { color: [210, 190, 244], color2: [96, 70, 160], g0: 140, g1: 290, sigma: 0.07, opacity: 1 } },
  ]) },
  // orchid: the tide's band again, between the chat's violet and the homelab's plum
  herdr: { near: [226, 170, 232], deep: [150, 60, 160], card: ownLight('herdr', 1, tint([1, -2, 2]), [206, 150, 212], 0.6, [
    { scale: 0.95, set: { color: [226, 170, 232], color2: [150, 60, 160], g0: 130, g1: 260, sigma: 0.1 } },
  ]) },
  // warm: the bar's hover light, ANNA's flame without its tongue
  site: { near: [242, 168, 112], deep: [214, 58, 34], card: ownLight('site', 0, tint([4, -1, -5]), [236, 150, 96], 0.5, [
    { scale: 1.9, dy: 10, set: { color: [242, 168, 112], sigma: 1.0, opacity: 0.75 } },
    { set: { opacity: 0 } },
    { scale: 1.2, dy: -10, set: { color: [214, 90, 50], color2: [255, 196, 96], g0: 150, g1: 300, sigma: 0.09 } },
  ]) },
};

/**
 * Each page's light (openspec stone-inner-pages, Ezra 2026-11-10: "the hero's four lights, card
 * order"): the bar's hover glow per link, and the head light far behind /blog's and /resume's
 * heading. The near colour is its hero card's first light; the deep one as tuned in the sketches.
 */
export type PageLightId = 'projects' | 'blog' | 'resume' | 'contact';
const firstLight = (id: GlassCard['id']) => heroCard(id).tune![0]!.set!.color as RGB;
export const pageLights: Record<PageLightId, { near: RGB; deep: RGB }> = {
  projects: { near: firstLight('anna'), deep: [255, 196, 96] }, // the flame
  blog: { near: firstLight('henk'), deep: [96, 132, 200] }, // the tide
  resume: { near: firstLight('homelab'), deep: [214, 120, 140] }, // the sunset
  contact: { near: firstLight('sandbox'), deep: [150, 188, 110] }, // the moss
};

/**
 * Every inner page's glass, by route, top to bottom (openspec stone-inner-pages): each id is a
 * `data-glass-moment` on that page. A route without glass lists none; every built inner route has
 * an entry, so a new post or project page cannot gain or lose glass by accident.
 */
export type InnerMoment = 'anna' | 'project-cards' | 'henk' | 'sandbox' | 'bible' | 'homelab' | 'finance'
  | 'pytaiga' | 'diagram' | 'code' | 'post-drawing' | 'compose';
export const innerGlass: Record<string, InnerMoment[]> = {
  '/projects': ['anna', 'project-cards'],
  '/projects/AnnaAssistant': ['anna'],
  '/projects/Henk': ['henk', 'diagram'],
  '/projects/ClaudeSandbox': ['sandbox', 'diagram'],
  '/projects/BibleTui': ['bible'],
  '/projects/HomelabInfrastructure': ['homelab'],
  '/projects/FinanceBot': ['finance'],
  '/projects/PytaigaMcp': ['pytaiga', 'diagram'],
  '/projects/EncryptedChatTUI': [],
  '/projects/HerdrAndroid': [],
  '/projects/ResumePage': [],
  '/blog': [],
  '/blog/henk-watchdog': ['henk', 'code'],
  '/blog/henk-exactly-once': ['post-drawing', 'diagram'],
  '/blog/bible-tui': ['bible'],
  '/blog/spec-factory': [],
  '/blog/successor-scoreboard': [],
  '/blog/herdr-android': [],
  '/resume': [],
  '/contact': ['compose'],
};

// As tuned in the glass lab (2026-11-09): ANNA's flame, red at its foot, yellow at its heart, amber
// around. The terminal's: the two reflected cards' hues, warm high on the left, cool low on the right.
// The projects' windows (sketch A2, 2026-11-11): each project's own light, near high on the left,
// deep low on the right: Henk's tide and the sandbox's moss from their cards, a new amber for bible-tui.
// Inner pages (2026-11-10): Homelab's window glows in its card's sun and plum (dusk), Finance Bot's
// in its own light, and /contact's "New message" in the moss, its page's light (the bar's Contact link).
const projectGlow = ({ near, deep }: { near: RGB; deep: RGB }): WindowGlow => ({ inset: '4% -7% 2%', blur: 26, lights: [
  { at: [30, 38], color: near, opacity: 0.95 },
  { at: [70, 66], color: deep, opacity: 0.62 },
] });
export const windowGlows: Record<'flame' | 'cards' | 'henk' | 'sandbox' | 'bible' | 'dusk' | 'finance' | 'moss', WindowGlow> = {
  henk: projectGlow(projectLights.henk),
  sandbox: projectGlow(projectLights.sandbox),
  bible: projectGlow(projectLights.bible),
  flame: { inset: '14% -7% 10%', blur: 28, lights: [
    { at: [28, 66], color: [214, 58, 34], opacity: 0.5 },
    { at: [52, 42], color: [255, 196, 96], opacity: 0.6 },
    { at: [78, 58], color: [240, 160, 118], opacity: 0.55 },
  ] },
  cards: { inset: '6% -8% 10%', blur: 32, lights: [
    { at: [30, 34], color: washOf('anna'), opacity: 0.5 },
    { at: [76, 70], color: washOf('henk'), opacity: 0.42 },
  ] },
  dusk: { inset: '4% -7% 2%', blur: 26, lights: [
    { at: [32, 36], color: projectLights.homelab.near, opacity: 0.9 },
    { at: [68, 66], color: projectLights.homelab.deep, opacity: 0.6 },
  ] },
  finance: projectGlow(projectLights.finance),
  moss: projectGlow(pageLights.contact),
};
/** The glow's CSS background: one soft radial gradient per light, each fading to nothing. */
export const glowBackground = (g: WindowGlow) =>
  g.lights.map((l) => `radial-gradient(closest-side at ${l.at[0]}% ${l.at[1]}%, ${rgba(l.color, l.opacity)}, ${rgba(l.color, 0)})`).join(', ');

// Off the hero for now (Ezra, 2026-11-09: he barely uses it); it can come back as 05.
export const benched: GlassCard[] = [
  // the mist: a deep haze, and over it one tilted pale band
  card('finance', 'Finance Bot', 1, v => `${v} rules`, 2, tint([-2, 0, 3]), 'dark', 0.5, { color: [170, 180, 198], opacity: 0.18 }, undefined, [
    { scale: 2.6, dy: -30, set: { color: [146, 156, 176], sigma: 1.0 } },
    { scale: 1.25, dy: -24, lean: 0.15, set: { color: [250, 251, 253], color2: [186, 196, 216], g0: 190, g1: 260, sigma: 0.08 } },
  ]),
];
