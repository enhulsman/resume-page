## Test commands (every chunk ends with all of them green)

- Unit, glass: `node --test tests/glass-*.test.mjs`
- Unit, site: `npm test`
- Build: `npm run build`
- E2E, glass (dev server on 127.0.0.1:4399, start it with `npx astro dev --host 127.0.0.1 --port 4399` if it is not running):
  `BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-*.e2e.mjs`
- E2E, existing pages: `BASE=http://127.0.0.1:4399 npm run test:e2e`

Rules for every chunk: write the chunk's tests from its scenarios first and see them fail for the
right reason; then build; then run every command above. E2E tests wait on state
(`__glassReady`, the window's `done`, terminal output, `document.fonts.ready`), never on a fixed
sleep; frame-sensitive checks freeze the light with `?t=` or `__glass.at(t)`. The lab and its tests
keep running untouched until chunk 8.

## 1. Glass as site code (glass-material)

- [ ] 1.1 Tests: `glassMoments` equals `['hero','anna','terminal']`; shipped distances and Homelab's sun `dist`; the token unit test (`--glass-ink-quiet` defined once in `src/styles/stone.css`, opaque, at least 4.5:1 on `#FFFFFF` and `#EEEAE3`, no alpha colour on the listed glass text selectors); keep the existing model tests (unlit pane, lit seam, loop closes, distance 1). File: `tests/glass-home.test.mjs`
- [ ] 1.2 `glassMoments` in `src/config/glass.ts`; `src/styles/stone.css` with the stone tokens (ground `#EEEAE3`, ink, Archivo scale, hairline) and `--glass-ink-quiet` (start `#5C5650`)
- [ ] 1.3 `src/scripts/glass/panes.js` from `hero.js`: mounts every `[data-glass="ribbed"]`, one shared WebGL context, 10 s loop, still frame on reduced motion (also when switched on later), off-screen pause; without the dial, `look=before` and the `paneFor` hooks; adds per-pane draw counts and the slow-device flag on `window.__glass` for tests, the slow-device guard, and the no-WebGL soft CSS gradient computed from `glassCards`
- [ ] 1.4 `src/components/stone/GlassCard.astro` (ribbed card, text as HTML, canvas `aria-hidden`) and `src/components/stone/GlassWindow.astro` (frosted body, title bar, `[data-glow]` beneath, `data-glass="frosted"`), styles from the lab with every secondary glass text on `--glass-ink-quiet`
- [ ] 1.5 Run all test commands

## 2. Chrome and the page frame (stone-homepage: shared chrome)

- [ ] 2.1 Tests: inner pages carry the chrome; dark system theme keeps `#EEEAE3` and has no theme button. File: `tests/glass-chrome.e2e.mjs`
- [ ] 2.2 `OverzichtLayout`, `Bar.astro`, `Foot.astro` to stone and Archivo with the new bar ("EH.", Projects, Blog, Résumé, Contact, "Get in touch"); remove the theme script, button and dark rules; map inner pages' colour variables to stone
- [ ] 2.3 Run all test commands (inner-page parts of `sheets.e2e.mjs` must stay green)

## 3. The hero on the homepage (stone-homepage: hero; glass-material)

- [ ] 3.1 Tests from: hero content, name is plain, readouts from data, hero fits 1280x720 / 1440x900 / 1920x1080, phone card row, accessible card name, every canvas `aria-hidden`, reduced motion still, one WebGL context with every pane lit at 390x844, off-screen pause by draw count, slow-device guard, no-WebGL fallback, card text at 4.5:1 over 20 moments. Port `tests/glass-hero.e2e.mjs` to `/` (drop its lab-only tests into chunk 8's removal list). Files: `tests/glass-hero.e2e.mjs`, `tests/glass-home.e2e.mjs`
- [ ] 3.2 Hero's role line, intro line and every section heading, link label and the photo alt as `homeSections` in `src/config/home.ts`
- [ ] 3.3 `src/components/stone/Hero.astro` (H3 from the lab: plain `h1`, intro, four `GlassCard`s from `glassCards`, `data-glass-moment="hero"`); `src/pages/index.astro` renders the hero and loads `panes.js`; the old sheets stay below it until chunk 7
- [ ] 3.4 Run all test commands

## 4. ANNA's section (anna-section)

- [ ] 4.1 Tests from: the copy in order, the anna-site link, written in config only, no run line or levels, one glass object, all beats there before play, plays once to the end, Replay, the reader scrolls back, reduced motion (from the start, switched on before and during play), no focus trap, phone layout. Port `tests/glass-anna-window.e2e.mjs` to `/`; keep `tests/glass-anna-window.test.mjs` (timeline, anna-site words) as is
- [ ] 4.2 `src/components/stone/AnnaSection.astro`: copy from `annaLead` and `annaCalls`, index `01`, `GlassWindow` titled `annaCalls.window` holding `annaDemo`'s beats, flame glow beneath, `data-glass-moment="anna"`; reuse `anna-window.js` and `anna-window-model.js` unchanged unless a selector must widen
- [ ] 4.3 Remove the drawing-sheet `AnnaSection` from the homepage; check /projects still shows the four levels (scenario: on /projects)
- [ ] 4.4 Run all test commands

## 5. Projects, Experience, Writing (stone-homepage)

- [ ] 5.1 Tests from: the rows (order, indices, "This site" absent), the number is the project's, a number changes at its source (unit, on the row builder), Experience rows, a new post (unit, on the post list builder: newest first, at most five, drafts excluded), no glass in these sections, no colour panels. Files: `tests/glass-home.test.mjs`, `tests/glass-home.e2e.mjs`
- [ ] 5.2 Row builder and post list builder as pure functions (in `src/lib/`), then `Projects.astro`, `Experience.astro`, `Writing.astro` in `src/components/stone/`: type on stone, hairline rules, tabular figures, index numbers as the only colour mark
- [ ] 5.3 Run all test commands

## 6. About and Contact (stone-homepage; glass-material)

- [ ] 6.1 Tests from: About (notes, photo alt from config, one frosted window), the terminal window (blur, alpha, title, no old head bar), the terminal still runs (`ls`, `whoami`), its reflection minis lit and `aria-hidden`, window text at 4.5:1 (both windows, after `ls`), something behind every window, glow has no edge, Contact (email large as mailto, three links), no contact strip, reduced motion terminal (intro at once, steady caret). Port `tests/glass-terminal.e2e.mjs` to `/`
- [ ] 6.2 `About.astro` (notes, plain photo, `GlassWindow` titled "ezra@hulsman: ~" wrapping `Terminal.astro`, four-colour glow, the reflection minis, `data-glass-moment="terminal"`); Terminal prints its intro at once and stops the caret blink under reduced motion; `Contact.astro`
- [ ] 6.3 Run all test commands; if a text on glass is under 4.5:1, darken `--glass-ink-quiet` (one place) and rerun

## 7. The whole page, and the drawing sheets retire (stone-homepage)

- [ ] 7.1 Tests from: section order, one glass moment per screen (1440x900, 1280x720, 390x844 scroll walks), the page matches `glassMoments`, the kinds, no glass anywhere else, whole page still on request (screenshots and `getAnimations()`), phone width over the whole page, arrival (no `intro` class), retired files gone with `AnnaPlate` kept, copy scan (and its self-test with a typed-in word) added to `tests/single-source.test.ts`
- [ ] 7.2 `index.astro` holds only the stone sections; adjust spacing until the one-moment walk passes (space and placement, never fading glass)
- [ ] 7.3 Delete `intro.js`, `scene.js`, the homepage `main.js`, `YouSheet`, `AnnaSection` (overzicht), `DetailsSheet`, `RegisterSheet`, `RevisionsSheet`, `NotesSheet`, `ContactSheet` and code only they used; delete `tests/overzicht.e2e.mjs`, `tests/intro.e2e.mjs` and the homepage parts of `tests/sheets.e2e.mjs`; update `test:e2e` in `package.json` to the remaining files
- [ ] 7.4 Run all test commands

## 8. Remove the lab and the rejected stagings (last)

- [ ] 8.1 Tests from: no lab page (404, nothing in `dist/`), no staging code, no contact strip. Files: `tests/glass-retired.test.mjs`, `tests/glass-retired.e2e.mjs`
- [ ] 8.2 Delete `src/pages/hero-lab.astro`, `glare.js`, `anna.js`, `anna-model.js`, `anna-scene.js`, `anna-turn.js`, `anna-journey.js`, `hero.js` (and `words.js`/`words-model.js` if any remain); remove `h2Card`, `annaExploded`, `AnnaPane`, `AnnaVariant`, `beforeTune` and `before` from `glass.ts`; delete their tests (`glass-anna.test.mjs`, `glass-anna-scene.test.mjs`, `glass-anna.e2e.mjs`, `glass-anna-stagings.e2e.mjs`, `glass-glare.e2e.mjs`, the lab-only and H2 tests in `glass-hero.*`)
- [ ] 8.3 Add the glass unit tests to `npm test` and the glass e2e files to `test:e2e` in `package.json`, so CI runs them
- [ ] 8.4 Run all test commands and `openspec validate stone-glass-homepage --strict`

## 9. Check, not close

- [ ] 9.1 Fresh-eyes review of the whole homepage at 1440, 1280 and phone width; screenshots for Ezra
- [ ] 9.2 Codex adversarial review of the branch; fix MUST findings; rerun all test commands
- [ ] 9.3 Follow-ups to file: inner page bodies in stone; dark mode after the light redesign; frame time on a mid Android phone
- [ ] 9.4 Do not archive: Ezra reviews the real page first
