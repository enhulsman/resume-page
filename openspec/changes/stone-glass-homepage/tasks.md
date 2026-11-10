## Test commands (every chunk ends with all of them green)

- Unit, glass: `node --test tests/glass-*.test.mjs`
- Unit, site: `npm test`
- Build: `npm run build`
- E2E, glass (dev server on 127.0.0.1:4399, start it with `npx astro dev --host 127.0.0.1 --port 4399` if it is not running):
  `BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-*.e2e.mjs`
- E2E, existing pages: `BASE=http://127.0.0.1:4399 npm run test:e2e`

Rules for every chunk: write the chunk's tests from its scenarios first and see them fail for the
right reason; then build; then run every command above. E2E tests wait on state
(`__glassReady`, the window's `done`, terminal output, `document.fonts.ready`, frame counts), never
on a fixed sleep; frame-sensitive checks freeze the light with `?t=` or `__glass.at(t)`; every test
that needs the loop running loads with `?guard=off`. The lab and its tests keep running untouched
until chunk 8. An old test is only removed or rewritten where a task below names it and the
decision behind it.

## 1. Glass as site code (glass-material)

- [x] 1.1 Unit tests (`tests/glass-home.test.mjs`): the list in config (`glassMoments`); the shipped picks; the overlap check itself (pure function, in `tests/lib/moments.mjs`); the guard's decision (`slowFrom`: a capped frame rate is not a slow device, expensive drawing is, the first second and the window, no verdict before a full window); the tokens are opaque and defined once (`--glass-ink-quiet`, `--glass-ink-red`); keep the existing model tests (unlit pane, lit seam, loop closes, distance 1)
- [x] 1.2 `glassMoments` in `src/config/glass.ts`; `src/styles/stone.css` with the stone tokens (ground `#EEEAE3`, ink, Archivo scale, hairline), `--glass-ink-quiet` (start `#5C5650`) and `--glass-ink-red` (start `#8F3320`)
- [x] 1.3 `src/scripts/glass/panes.js` from `hero.js`: mounts every `[data-glass="ribbed"]`, one shared WebGL context, 10 s loop, still frame on reduced motion (also when switched on later), off-screen pause; without the dial, `look=before` and the `paneFor` hooks; adds `window.__glass.draws` (per pane), `__glass.slow`, `__glass.guard(on)`, `?guard=off`, a test hook for added draw work, the slow-device guard (`src/scripts/glass/guard.js` holds the pure `slowFrom`; `panes.js` only collects `{ t, interval, draw }` samples and calls it), and the no-WebGL soft CSS gradient computed from `glassCards`
- [x] 1.4 `src/components/stone/GlassCard.astro` (ribbed card, text as HTML, canvas `aria-hidden`) and `src/components/stone/GlassWindow.astro` (frosted body, title bar, `[data-glow]` beneath, `data-glass="frosted"`); the lab's alpha inks become `--glass-ink-quiet`, the darker opaque inks stay
- [x] 1.5 One-line note in `model.js` above ink, eight layers, slide and turn: used by the retired ANNA stagings, kept with their tests, not wired to anything
- [x] 1.6 Run all test commands

## 2. The old homepage leaves; the hero arrives (stone-homepage: hero, arrival; glass-material: ribbed)

- [x] 2.1 Tests from: hero content (`h1` whitespace collapsed), the name is plain, readouts from data, phone card row, screen reader reads the card, every canvas `aria-hidden`, reduced motion still, one context with the four cards lit at 390x844, off screen (counts rise in view, flat out of view), the guard is wired, no-WebGL fallback (cards part), card text at 4.5:1 over 20 moments, arrival (no `intro` class, body not clipped), headings and labels live in config (`homeSections` with what exists so far). Port `tests/glass-hero.e2e.mjs`'s H3 tests to `/` in `tests/glass-hero.e2e.mjs`; its lab-only and H2 tests stay against `/hero-lab` until chunk 8. New: `tests/glass-home.e2e.mjs`
- [x] 2.2 `homeSections` in `src/config/home.ts` (role line, intro line, section headings, link labels, the word for now, terminal title, photo alt); `homeDim` on `DetailListing` (pytaiga-mcp: 2)
- [x] 2.3 `src/components/stone/Hero.astro` (plain `h1` from `site.name`, intro, four `GlassCard`s from `glassCards`, `data-glass-moment="hero"`); replace `src/pages/index.astro` outright with the stone page holding only the hero, loading `panes.js`; later chunks add sections to it
- [x] 2.4 Remove the arrival: the head block in `OverzichtLayout.astro` that sets `html.intro`, the `html.intro` rules in `overzicht.css`, `src/scripts/overzicht/intro.js`, and the `ovz:arrived` wait in `Terminal.astro`
- [x] 2.5 Retire the old homepage's suites (decision 2026-11-09: the drawing-sheet homepage retires): delete `tests/intro.e2e.mjs` and `tests/overzicht.e2e.mjs`; in `tests/sheets.e2e.mjs` drop `/` from the path lists at lines 76, 396, 482 and 504, and rewrite line 421's test ("on /projects and on the homepage") for /projects only; update `test:e2e` in `package.json`
- [x] 2.6 Run all test commands

## 3. Chrome on every page (stone-homepage: shared chrome, phones reach every page)

- [x] 3.1 Tests (`tests/glass-chrome.e2e.mjs`): no sheet frame (seven pages), inner pages carry the chrome (six pages, name beside the mark, footer text), dark system theme (seven pages), every page from every page at 390x844, keyboard order in the menu; in `tests/glass-hero.e2e.mjs`, hero fits 1280x720 / 1440x900 / 1920x1080 (here, because the old frame and bar until this chunk take height the lab never had)
- [x] 3.2 Rewrite or retire in `tests/sheets.e2e.mjs` (decisions 2026-11-09: stone chrome on every page, dark mode dropped): rewrite line 75 (bar contents: "EH.", four links, "Get in touch", no theme button), line 116 (phones reach every page through the stone menu) and line 481 (menu keyboard order) to the stone bar; rewrite line 45's per-page check to the stone ground and bar; keep line 132 (keyboard focus reaches the bar's name; the name stays) and line 676 (signature and full name on one line on small phones; the name stays), adjusting only selectors the restyle changes; rewrite line 396 to "scrolled content never shows above the bar" without its frame check, because the frame leaves; at line 298 drop `.frame` from the print-hidden list (the bar, footer and skip link stay hidden in print, so the stone bar and footer keep a print rule); retire line 101 (stored theme and toggle), line 311 (prints from the dark theme) and line 411 (green seam at phone scales: the green table and frame leave)
- [x] 3.3 `footer` in `src/config/home.ts` ("Made in Utrecht by", "Proverbs 3:5-7"; the closing full stop is markup); remove the `.frame` element from `OverzichtLayout.astro` and the frame and green-table rules from `overzicht.css`; `OverzichtLayout`, `Bar.astro` (keeps "EH." and the name), `Foot.astro` to stone and Archivo; the menu from `chrome.js` restyled, its theme code removed; remove the theme script, button and dark rules; map inner pages' colour variables to stone
- [x] 3.4 Run all test commands

## 4. ANNA's section (anna-section)

- [x] 4.1 Tests from: the copy in order, the link to anna-site, written in config only, no run line or levels, one glass object, all there before it plays, plays once to the end, Replay, the reader scrolls back, reduced motion (from the start, switched on before and during play), no focus trap, phone, not on the homepage, on /projects, nothing on the homepage imports them; also the page matches the list and something behind every window for the hero and ANNA so far. Port `tests/glass-anna-window.e2e.mjs` to `/` (its `?chat=` tests too); keep `tests/glass-anna-window.test.mjs` as is
- [x] 4.2 `src/components/stone/AnnaSection.astro`: copy from `annaLead` and `annaCalls`, index `01`, message names from `annaLead.title` and `annaDemo.who`, `GlassWindow` titled `annaCalls.window` holding `annaDemo`'s beats, flame glow beneath, `data-glass-moment="anna"`; the window starts below the heading, lead and first rule (design 2); reuse `anna-window.js` and `anna-window-model.js` unchanged unless a selector must widen
- [x] 4.3 Run all test commands

## 5. Projects, Experience, Writing (stone-homepage)

- [x] 5.1 Tests from: the rows, the number is the project's, /projects keeps its numbers, a number changes at its source (unit, on the row builder), Experience, a new post (unit, on `diaryEntries(...).slice(0, 5)`), no glass anywhere else and no colour panels for these sections
- [x] 5.2 Build on what exists: rows from `buildProjects` in `src/lib/projects.ts` (it already joins `status`) plus `homeDim`, in one small pure function; Writing from `diaryEntries` in `src/lib/frontmatter.ts`; no new date sorting. Then `Projects.astro`, `Experience.astro`, `Writing.astro` in `src/components/stone/`: type on stone, hairline rules, tabular figures, index numbers as the only colour mark
- [x] 5.3 Run all test commands

## 6. About and Contact (stone-homepage; glass-material)

- [x] 6.1 Tests from: About, the terminal window, the terminal still runs (`ls`, `whoami`), one context with every pane lit including the reflection minis, window text measured at 4.5:1 (both windows, after `ls`), something behind every window and a window's glow has no edge (both windows), no-WebGL fallback (windows part), Contact, no contact strip, reduced motion switched on after load (mid-typing). Port `tests/glass-terminal.e2e.mjs` to `/`
- [x] 6.2 `About.astro` (notes, plain photo with alt from config, `GlassWindow` titled from `homeSections` wrapping `Terminal.astro`, four-colour glow, the reflection minis, `data-glass-moment="terminal"`); `terminal-animation.ts` listens for the reduced-motion change and renders the rest instantly, and the caret stops blinking under reduced motion; `Contact.astro`
- [x] 6.3 Run all test commands; if a text on glass is under 4.5:1, darken `--glass-ink-quiet` or `--glass-ink-red` (one place each) and rerun

## 7. The whole page (stone-homepage; glass-material)

- [x] 7.1 Tests from: section order, the overlap computed from the layout (three sizes, on load and after play), scrolling the whole page (three sizes), the page matches the list, the kinds, no glass anywhere else and no colour panels over the whole page, the rendered page is all config, the check catches a typed-in word (unit, on the covering checker with all five fixtures), reduced motion from the start and no running animations, phone width over the whole page, retired files are gone
- [x] 7.2 Adjust spacing and placement until the overlap checks pass (never fading or hiding glass)
- [x] 7.3 Delete the files only the old homepage used: the homepage `main.js`, `YouSheet`, the overzicht `AnnaSection`, `DetailsSheet`, `RegisterSheet`, `RevisionsSheet`, `NotesSheet`, `ContactSheet`; for `depth.js`, `span.js` and the name glyphs, grep inner pages first and delete only what nothing imports, with its unit test from `npm test`. Keep `AnnaPlate` and `plate.js` (and so `scene.js`, which `plate.js` draws, and `depth.js`, which `scene.js` imports)
- [x] 7.4 Run all test commands

## 8. Remove the lab and the rejected stagings (last)

- [x] 8.1 Tests from: no lab page (404, nothing in `dist/`), no staging code, no contact strip. Files: `tests/glass-retired.test.mjs`, `tests/glass-retired.e2e.mjs`
- [x] 8.2 Delete `src/pages/hero-lab.astro`, `glare.js`, `anna.js`, `anna-model.js`, `anna-scene.js`, `anna-turn.js`, `anna-journey.js`, `hero.js` (and `words.js`/`words-model.js` if any remain); remove `h2Card`, `annaExploded`, `AnnaPane`, `AnnaVariant`, `beforeTune` and `before` from `glass.ts`; delete their tests (`glass-anna.test.mjs`, `glass-anna-scene.test.mjs`, `glass-anna.e2e.mjs`, `glass-anna-stagings.e2e.mjs`, `glass-glare.e2e.mjs`, the lab-only and H2 tests left in `glass-hero.*`)
- [x] 8.3 Add the glass unit tests to `npm test` and the glass e2e files to `test:e2e` in `package.json`, so CI runs them
- [x] 8.4 Run all test commands and `openspec validate stone-glass-homepage --strict`

## 9. Check, not close

- [x] 9.1 Fresh-eyes review of the whole homepage at 1440, 1280 and phone width; screenshots for Ezra
- [x] 9.2 Codex adversarial review of the branch; fix MUST findings; rerun all test commands
- [x] 9.3 Follow-ups to file: inner page bodies in stone; dark mode after the light redesign; frame time on a mid Android phone (listed in the 2026-11-11 morning handoff)
- [x] 9.4 Do not archive: Ezra reviews the real page first (not archived)
