## 1. Tests first

- [x] 1.1 `tests/henk-boundary.e2e.mjs` (still lane, `?t=2.4`): the pane and its moment, every label at 4.5:1 at 1440 and 390, the light contained (stone beside the pane), no sideways scroll, still under reduced motion, readable without WebGL and in print, licht after sleep on /projects; watch them fail
- [x] 1.2 Unit: `innerGlass['/projects/Henk']` is `henk`, `henk-boundary`, `diagram`; `site.sidePieces` holds licht after sleep; `HenkFlow.astro` retired, `HenkBoundary.astro` kept
- [x] 1.3 Existing e2e tests that named the old markup: the drawings glass may hold (`inner-site`), only the sandbox's diagram on bare stone (`inner-article`)

## 2. The pane

- [x] 2.1 `HenkBoundary.astro`: the drawing's ink in front of one `.glass-window` pane, the glow beneath clipped to the pane's box, translucent tiles, real-glass edges, print styles
- [x] 2.2 `Henk.mdx` uses it; `HenkFlow.astro` deleted; `innerGlass` and `InnerMoment` gain `henk-boundary`

## 3. Made for fun

- [x] 3.1 `site.sidePieces`: licht after sleep, verbatim

## 4. Done

- [x] 4.1 `npm test`, `npm run build`, the full browser suite against the build
- [x] 4.2 Screenshots at 1440x900 and 390x844 and of "Made for fun"
- [x] 4.3 `openspec archive henk-glass-boundary --yes`
