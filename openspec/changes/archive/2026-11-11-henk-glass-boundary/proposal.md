## For Ezra

**Your decisions, made and binding on this change (2026-11-12):**

- Variant D of Henk's trust-boundary diagram replaces today's line drawing on /projects/Henk, for
  everyone (no query flag): one frosted pane in the site's frosted-glass material (as Henk's Signal
  window) with real-glass edges, Henk's blue light soft and far back behind the lower half, a cool
  pale wash above, the boxes inside the pane faintly translucent tiles, all ink crisp in front, the
  untrusted lanes above the pane on plain stone. Same facts, labels and caption as today.
- A new side piece in "Made for fun", after sleep: licht.hulsman.dev, "Genesis 1, lit only by its
  own letters" (the text you OK'd, verbatim).

**What changes for a reader:** Henk's page shows the trust boundary as a pane of glass the
untrusted alerts and the owner's messages cross into; the choke point and the tools sit in Henk's
blue light. /projects lists licht under "Made for fun".

## Why

The dashed red line and the ink box drew the trust boundary as a diagram convention. As one pane of
the site's frosted glass, the boundary becomes the object the site already uses for "something sits
behind this": what is inside Henk is behind glass, in his light; what is outside is on bare stone.
The sketch (branch `sketch/henk-boundary`, variant D) left three weak spots this change fixes: the
blue spilled past the pane's sides onto the stone (a murky halo on a phone), the boxes read too
faint, and the frost's grain sat behind small labels.

## What Changes

- `src/components/diagrams/HenkBoundary.astro` (new) replaces `HenkFlow.astro` (deleted; nothing
  else uses it) on `src/pages/projects/Henk.mdx`. The figure keeps the `henk-flow` class, the same
  `svg` (`viewBox 0 0 440 652`, title, description, every label) and the same caption, so "View
  larger" works on it unchanged.
- The pane is a `.glass-window` (`data-glass="frosted"`, grain and rim of the shared material) under
  the drawing's lower part, with a `[data-glow]` beneath it that is clipped to the pane's own box, so
  no light reaches the stone. The figure is a glass moment of its own, `henk-boundary`, listed in
  `innerGlass` between `henk` and `diagram`.
- No WebGL and no loop: the pane is CSS, so reduced motion, the slow-device guard and a browser
  without WebGL all show the same still pane. In print the light goes and the pane is plain.
- `site.sidePieces` gains `{ url: 'https://licht.hulsman.dev', line: 'Genesis 1, lit only by its own
  letters' }` after sleep.

## Capabilities

### New Capabilities

### Modified Capabilities
- `glass-material`: Henk's trust-boundary diagram on its frosted pane joins the drawings glass may
  hold.
- `stone-inner-pages`: `/projects/Henk` lists `henk`, `henk-boundary`, `diagram`; `HenkFlow.astro`
  retires and `HenkBoundary.astro` stays.
- `stone-article-layout`: only Claude Sandbox's diagram stays a line drawing on bare stone; Henk's
  keeps "View larger" by the same rule.
- `stone-project-pages`: Henk's trust boundary on one frosted pane.
- `stone-projects-index`: the side pieces, in order, licht included.

## Impact

- `src/components/diagrams/HenkBoundary.astro` (new), `HenkFlow.astro` (deleted),
  `src/pages/projects/Henk.mdx`, `src/config/glass.ts` (`innerGlass`, `InnerMoment`),
  `src/config/site.ts` (`sidePieces`).
- Tests: `tests/henk-boundary.e2e.mjs` (new, in the still lane), plus the existing tests that named
  the old markup: `tests/inner-pages.test.mjs` (the `innerGlass` entry), `tests/inner-retired.test.mjs`
  (the kept and retired files), `tests/inner-site.e2e.mjs` (the drawings glass may hold) and
  `tests/inner-article.e2e.mjs` (only the sandbox's diagram is on bare stone).
- No new dependency, no new script.
