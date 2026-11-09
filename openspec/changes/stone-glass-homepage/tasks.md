## 1. Tests first

- [ ] 1.1 Unit tests from `glass-material`: unlit pane, lit seam, distance picks, loop closes, layer budget, readout contrast over 20 moments
- [ ] 1.2 E2E tests from `stone-homepage`: hero content and fit (three sizes), phone row, section order, ANNA levels, no project twice, new-post order, terminal `ls`, chrome on inner pages, dark system theme, no arrival
- [ ] 1.3 E2E tests from `glass-material`: accessible card names, reduced motion, off-screen pause, slow-device guard (injected slow frames), no-WebGL fallback

## 2. Glass as a component

- [ ] 2.1 `GlassPane.astro` and `src/scripts/glass/panes.js` from the prototype; config stays in `src/config/glass.ts`
- [ ] 2.2 Slow-device guard and build-time CSS fallback gradient
- [ ] 2.3 Brainstorm ANNA's section and the terminal's look with Ezra; prototype the chosen idea in `/hero-lab?lab=1`

## 3. Chrome

- [ ] 3.1 `stone.css` tokens (ground, ink, Archivo scale) and the new bar and footer in `OverzichtLayout`
- [ ] 3.2 Remove the theme script, button and dark rules; map inner pages' colour variables to stone

## 4. Homepage

- [ ] 4.1 Hero (H3) from the prototype
- [ ] 4.2 ANNA section in the brainstormed form
- [ ] 4.3 Projects list, Experience, Writing
- [ ] 4.4 About (notes, photo, terminal restyled) and Contact (with the strip, if it earns its place)
- [ ] 4.5 Delete retired homepage code and its tests; remove `/hero-lab`

## 5. Check and close

- [ ] 5.0 Follow-ups to file: inner page bodies in stone; dark mode after the light redesign

- [ ] 5.1 Fresh-eyes review round on the whole homepage at 1440, 1280 and phone; Ezra's look on the tailnet
- [ ] 5.2 Measure frame time on a mid Android phone; Codex review of the branch
- [ ] 5.3 `openspec validate stone-glass-homepage --strict`, archive on the branch
