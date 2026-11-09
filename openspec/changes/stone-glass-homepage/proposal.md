## For Ezra first

**Decisions (Ezra, 2026-11-09):**

1. **Reach: agreed.** The homepage moves to stone and glass in full; the shared chrome (top bar,
   footer, colours, type) moves on every page, so inner pages get the stone ground and new bar
   while their bodies keep their layout. Restyling those bodies is a follow-up change.
2. **Dark mode: dropped for now, listed as a follow-up** once the light-mode redesign of the
   whole site is done.
3. **ANNA's section: open, to brainstorm.** G4's wide pane with four lights may be too plain.
   The section's content is fixed (what ANNA is, its four levels); its visual idea is not, and
   is settled in a brainstorm before task 4.2.
4. **Drawing-sheet language retires from the homepage: agreed for now** (can shift later). The
   photo and the live terminal stay in About, and **the terminal is restyled in the new visual
   approach** too.

**What a visitor sees:**

- The hero as in `/hero-lab` today: your name, the intro line, four glass cards (ANNA, Henk,
  Homelab, Claude Sandbox), each a link to its project page.
- Below it, in order: ANNA (what it is and its four levels; its visual idea still to brainstorm), the other projects as a
  plain list, experience, writing, About (notes, photo, terminal), contact.
- Glass appears only where there is light with a job: the hero cards, ANNA's section (form to
  brainstorm), possibly the terminal, and one slim strip by the contact. Everything else is type on stone.
- No arrival animation; the page is there at once. Light moves on a slow 10 s loop and holds
  still for anyone who asks for reduced motion.

## Why

Card run 7 settled the direction: G4's warm stone page system, with the name as the hero and the
[04] ribbed glass as its one material (H3, prototyped and tuned in `/hero-lab` on
`feat/glass-hero`). The current homepage is the drawing-sheet design, so the hero cannot ship on
its own: the page under it has to speak the same language.

## What Changes

- **New homepage** in stone and glass: hero (H3), ANNA, projects list, experience, writing,
  About, contact. Same real copy and data sources (`src/config/home.ts`, `site.ts`,
  `resume.ts`, blog frontmatter); nothing typed in twice.
- **The glass becomes a site component**: one `GlassPane` (canvas + real HTML text) driven by the
  model and shader proven in `/hero-lab`, with the per-card distance, wash and tuning moved into
  config.
- **Shared chrome** on every page: stone colours, Archivo type scale, the new top bar ("EH." mark,
  page links, "Get in touch") and footer. **BREAKING** for the drawing-sheet look on inner
  pages: their bodies keep their layout but sit on stone.
- **Retired from the homepage:** the arrival (`intro.js`), the ANNA 3D scene (`scene.js`,
  `main.js` on the homepage), the Details sheet with its drawings, the title block, the stamp,
  the theme button and dark theme (dark returns as a follow-up after the light redesign).
- **The About terminal** keeps its behaviour and is restyled for stone and glass.
- **`/hero-lab` is removed** once the homepage carries everything it proved; it lives on in the
  branch history.

## Capabilities

### New Capabilities

- `glass-material`: the ribbed-glass pane: rendering, motion loop, distance and tuning, reduced
  motion, pausing, the no-WebGL fallback, and what may never be drawn into the canvas (text).
- `stone-homepage`: the homepage's sections, their order, their content sources, the hero's
  fit on the first screen, and the shared chrome every page carries.

### Modified Capabilities

(none: `openspec/specs/` is empty; the drawing-sheet pages were never specified)

## Impact

- **Files:** `src/pages/index.astro`; new `src/components/stone/*` and
  `src/components/glass/GlassPane.astro`; `src/scripts/glass/*` (from the prototype);
  `src/config/glass.ts`; a new `src/styles/stone.css`; `src/layouts/OverzichtLayout.astro`
  (chrome only); retire homepage-only parts of `src/components/overzicht/` and
  `src/scripts/overzicht/` (`intro.js`, `scene.js`, `main.js`, homepage use of `depth.js`).
- **Tests:** `tests/overzicht.e2e.mjs`, `tests/intro.e2e.mjs` and the homepage parts of
  `tests/sheets.e2e.mjs` are replaced by tests derived from these specs; inner-page tests keep
  passing; `tests/glass-hero.*` move to the component.
- **Performance:** six WebGL contexts on the homepage (four cards, ANNA's pane, the contact
  strip), well under browsers' limit of about sixteen. Device pixel ratio capped at 2; light
  pauses off screen, in a background tab, and when frames run slow.
- **No new dependencies.** No change to the Worker, the contact form or the PDF résumé.
