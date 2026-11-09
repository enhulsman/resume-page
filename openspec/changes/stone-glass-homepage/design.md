## Context

`/hero-lab` on `feat/glass-hero` proved the hero in code: the [04] study's model and shader
(`src/scripts/glass/`), one canvas per card, per-card distance, a wash, a quiet readout band, and
Ezra's tuning (H3, four cards, the newer look, distances 0.35/0.8/0.5/0.45). Review rounds and
his calls are in `~/Coding/threads-saved/card-run-7/` and this session's handoff. The rest of the
site is the drawing-sheet design (`OverzichtLayout`, `overzicht.css`, `scripts/overzicht/`).

## Goals / Non-Goals

**Goals:** ship the homepage in G4's system with the H3 hero as prototyped; give every page the
stone chrome; keep every word and number single-source.

**Non-Goals:** restyling inner page bodies (follow-up change); a dark theme (follow-up after the
light redesign); new copy beyond the
section headings; Finance Bot's card (benched in config, can return as 05).

## Decisions

1. **`GlassPane` is an Astro component plus one script.** Props: light index, ground, tune, wash,
   distance, size class; slot for the HTML text. `src/scripts/glass/hero.js` becomes
   `panes.js` and mounts every `[data-glass]` on any page. *Why:* the prototype's per-card canvas
   already handles scrolling rows and resize; a shared full-page canvas would fight the phone's
   scrolling card row. *Alternative rejected:* one canvas with scissor rects per pane, saves
   contexts but couples layout to a fixed overlay.
2. **ANNA's section: reopened (Ezra, 2026-11-09), brainstorm before building.** First idea, kept
   for reference: **ANNA's pane reuses the study's lights.** Four lights in one wide pane: the pane's field is
   the sum of four light groups placed at quarters of its width, each a retuned study light
   (flame for Identity, mist for Claude, tide for MCP connectors, dusk for Operations), at
   distance about 0.6. The shader's three-layer budget is per draw, so the pane draws in four
   scissored passes on one canvas. *Why:* one material, one family; no new light shapes to fit.
3. **Contact strip:** a slim pane (about 6:1) carrying a slow horizontal blend of the four hero
   lights' colours; its job is to close the page on the same material. Lowest priority: it is
   the first thing cut if it reads as decoration.
4. **Slow-device guard:** `panes.js` keeps a rolling average of frame time; above 20 ms over 2 s
   it draws the still frame once and stops the loop for the visit.
5. **No-WebGL fallback:** each pane's ground gets a CSS radial gradient approximating its light,
   computed at build time from the config (centre, colour at the still moment).
6. **Chrome:** `OverzichtLayout` keeps its job as the one layout; its bar, footer, colours and
   fonts switch to stone, the theme script and button go. Inner page bodies keep their
   `overzicht.css` rules for layout only; colour variables map to stone.
7. **Retired code is deleted, not parked:** `intro.js`, `scene.js`, the homepage `main.js`,
   `YouSheet`, `DetailsSheet`, `RevisionsSheet`'s drawing table, `ContactSheet`'s stamp. Their
   history stays in git. `AnnaPlate`/`plate.js` stay for `/projects` until the follow-up.

## Risks / Trade-offs

- **Shader cost on phones** (four subsamples per pixel, up to three layers, six canvases) →
  DPR cap 2, off-screen pause, slow-device guard; measure on a mid Android before archiving.
- **Inner pages look half-converted** until the follow-up → keep the follow-up next in line;
  chrome alone already removes the jump between two different bars.
- **ANNA's four-light pane is new** (not tuned in the lab) → build it in `/hero-lab` first
  behind `?lab=1` and get Ezra's distance picks before it reaches the homepage.
- **Dropping dark mode** removes a feature visitors may use → stated in the proposal as his call.

## Migration Plan

All on `feat/glass-hero`; nothing ships until merged and deployed with Ezra's OK. Rollback is the
previous deploy.

## Open Questions

- ANNA's section: its visual idea (brainstorm with Ezra; G4's four-light pane may be too plain).
- The terminal's new look: glass behind it, or type on stone with one light (brainstorm with ANNA's).
- Whether the contact strip earns its place (decision 3).
