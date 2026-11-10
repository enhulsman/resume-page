## Context

`/hero-lab` on `feat/glass-hero` (f9cf8a2) proved three glass objects in code: the H3 hero (four
ribbed cards, the [04] model and shader in `src/scripts/glass/`, per-card distance and wash, one
shared WebGL context feeding every pane's 2D canvas), ANNA's frosted Teams window
(`anna-window.js`, `anna-window-model.js`, copy in `annaCalls` and `src/config/anna-demo.ts`), and
the terminal as a frosted window over a soft glow of the four card colours. The same page still
carries rejected work: the H2 variant, the name glare (`glare.js`), the turn, journey and stack
stagings (`anna.js`, `anna-model.js`, `anna-scene.js`, `anna-turn.js`, `anna-journey.js`,
`annaExploded` in `glass.ts`) and the lab bar. The "words" staging (`words.js`) was already removed
in bdda757.

The agreed page inventory (2026-11-10, `~/.local/state/handoffs/threads-saved/2026-11-10-page-rethink/inventory.md`)
is the source of truth for what is on the page; the ANNA display decision is
`2026-11-10-anna-display/synthesis.md`, narrowed by Ezra's 2026-11-10 calls (no run line, levels to
/projects). The rest of the site is the drawing-sheet design (`OverzichtLayout`, `overzicht.css`,
`src/scripts/overzicht/`). There is no AGENTS.md or CLAUDE.md in the repo.

## Goals / Non-Goals

**Goals:** ship the homepage in stone with exactly three glass moments as proven in the lab; give
every page the stone chrome; keep every word and number single-source; every text on glass at
4.5:1 or better; remove the lab and the rejected stagings once nothing depends on them.

**Non-Goals:** restyling inner page bodies (follow-up change); a dark theme (follow-up after the
light redesign); new copy beyond section headings, link labels and the photo's alt; Finance Bot's
hero card (benched in config, can return as 05); usage or adoption facts for ANNA (none exist yet).

## Decisions

1. **What may be glass is a list in config.** `glass.ts` exports
   `glassMoments = ['hero', 'anna', 'henk', 'sandbox', 'bible', 'terminal']` (the three project windows added 2026-11-11). Each moment's root element carries
   `data-glass-moment="<id>"`; each glass object carries `data-glass="ribbed"` or
   `data-glass="frosted"`. Tests compare the page against the list, so a new object is one config
   line plus the same tests. *Why:* Ezra keeps the list open; the test is the gate, not memory.

2. **Glass wherever it holds something (Ezra, 2026-11-11; replaces the one-moment rule).** Glass
   goes on any object that genuinely holds something: a light (ribbed) or a window's content
   (frosted). There is no per-screen limit: the projects' three windows share a screen as one group,
   and ANNA's window stands beside her heading with today's stone under the hero. The tests no longer
   compute overlaps; they check that every glass object holds something and that no glass is faded,
   hidden or moved on scroll. `tests/lib/moments.mjs` went with the overlap check.

3. **Ribbed panes: one driver, from the lab.** `hero.js` is copied to `panes.js`, which mounts
   every `[data-glass="ribbed"]` on the page through the one shared WebGL context, keeps the 10 s
   loop, the still frame at 2.4 s for reduced motion, the off-screen pause, `?t=` and
   `window.__glass`/`__glassReady` for tests. Dropped from the copy: the distance dial, the
   `look=before` path and the `paneFor`/`redrawPane` hooks (only the stagings used them). Added: the
   slow-device guard and the no-WebGL fallback. The guard measures the time spent drawing each frame
   (`performance.now()` around the draw calls), never the interval between frames, so a phone that
   caps frames at 30 Hz is not slow; it averages over 2 s starting 1 s after `__glassReady`, and
   above 20 ms draws the still frame and stops the loop for the visit. The decision is a pure
   function, `slowFrom(samples)` in `src/scripts/glass/guard.js`, over `{ t, interval, draw }`
   samples, unit-tested on made-up samples (30 Hz with cheap draws stays, expensive draws trip, the
   first second and older samples are ignored, no verdict before 2 s of eligible samples; frames
   that drew no pane are not sampled), because an e2e run cannot tell a capped frame rate
   from swiftshader's own slowness. `panes.js` only collects samples. It has a test switch
   (`?guard=off`, `__glass.guard(false)`); e2e checks only the wiring (a 30 ms busy-work hook trips
   it, `?guard=off` keeps the loop running), and the off-screen test first proves the counts rise
   in view. The
   no-WebGL fallback is each pane's CSS ground plus a soft radial gradient
   of its light's colour, computed at build time from `glassCards`. Model features only the
   stagings used (ink, eight layers, slide and turn) stay in `model.js`/`shader.js` with their unit
   tests; they cost nothing at runtime.

4. **Frosted windows: one component, two contents.** `GlassWindow.astro` renders the frosted body
   (translucent ground, backdrop blur, light rim, title bar) and a glow beneath it (`data-glow`,
   `aria-hidden`), a few soft radial gradients with no hard edge. ANNA's window glows in the flame's
   colours. The terminal's glow and its reflection (Ezra, 2026-11-10: "just one or two colors in a
   different configuration, so it's less busy and feels more premium") use two card hues, ANNA's warm
   wash and Henk's cool one: the glow's two lights sit diagonally, warm high left, cool low right;
   the reflection is two mini ribbed panes of those cards (`terminalReflection` in `glass.ts`),
   upside down, each an oval that fades to nothing under a 10 px blur, a large one near the top left
   and a smaller one lower on the right, never a row (decoration, `aria-hidden`, inside the terminal
   moment). The lab's row of four panes along the top edge read as four colour blocks with straight
   edges.

5. **One shared contrast fix: opaque inks on glass.** `stone.css` defines `--glass-ink-quiet`, an
   opaque warm grey (start `#5C5650`: about 7.2:1 on white, 6.0:1 on stone), and it replaces exactly
   the inks that were alpha-blended in the lab (window titles 0.55 and 0.66, Replay, message names)
   plus the terminal's dim `#8a8278` (about 3.8:1 even on white) and ANNA's settled work line. Inks
   that are opaque and darker (the work line while she works and the artefacts' quiet text
   `#4a453f`, which measured 4.0:1 in the shared quiet ink over the projects' brighter glows; the
   artefacts `#3a3632`; body ink) stay. (The steps and record left on
   2026-11-11.) The
   terminal's red prompt and error text take `--glass-ink-red` (start `#8F3320`), because `#B4432B`
   is likely about 3.5:1 over the terminal's glow and turning it grey would lose the prompt. If the
   measured test fails, the failing token darkens in its one place; nothing else changes. The hero
   cards' title, index and readout stay full ink.

6. **ANNA's section is the lab's window staging, minus the lab.** Left: `h2` "ANNA",
   `annaLead.text`, `annaCalls.heading`, the three rules (rule, why, how), `annaCalls.closing`, and
   `annaCalls.more` linking to https://anna-site.anamata.ai. Right: the window, titled
   `annaCalls.window`, playing `annaDemo` once when about 40% in view, with Replay. `anna-window.js`
   and `anna-window-model.js` are reused as they are; the conversation's beats are all in the markup
   from the start. The section shows `01`, the ANNA card's index, beside its heading.

7. **Projects as rows of type, on what exists.** Rows come from `buildProjects` in
   `src/lib/projects.ts`, which already joins each listing's `status` from frontmatter. Every project except ANNA and `hideOnHome` ones, hero-card
   projects first in card order carrying their card index (02 Henk, 03 Homelab, 04 Claude Sandbox),
   then the rest in `home.ts` order (Finance Bot, bible-tui, pytaiga-mcp, then the register). A row:
   index if any, title, `what`, status, and its homepage number set large in
   tabular figures with its label beside it (the register's entries have no number). The number is
   `dims[homeDim]`, a new optional index on a listing (default 0), so pytaiga-mcp shows "50 → 5" as
   the inventory asks while `dims`' order, which /projects reads, stays. Index numbers
   may take the hue of their card's light: colour only as that small mark.

8. **Experience, Writing, About, Contact.** Experience: each `resume.ts` entry as years
   (`startDate`–`endDate`, or `startDate`–now), `role` and `client`, hairline rules, link to /resume.
   Writing: `diaryEntries(...).slice(0, 5)` from `src/lib/frontmatter.ts` (published, newest first),
   each with title, date label and its one-line `line`, link to /blog; no new sorting code. About: `notes`, the site photo plain (alt from config), and the terminal window.
   Contact: `site.social.email` set large as a mailto link, then the contact page, LinkedIn and
   GitHub as type. Section headings and link labels live in `home.ts` (`homeSections`).

9. **Copy single-source, checked on the rendered page.** A source scan that strips `{...}` would
   miss words written inside a `.map()`, so the check runs on the page itself: every text node and
   every `alt`, `title` and `aria-label` under `main` and the footer (outside the terminal's own
   output, which `single-source.test.ts` already checks) is covered by the corpus: every corpus
   value of three letters or more that it contains as whole words is removed, longest first, and
   no letters may remain. A plain substring test
   would fail correct markup, because the browser merges neighbouring values into one text node
   (the footer line, `annaLead.text` plus its full stop, the sources joined with " · "). The corpus:
   string values exported by `src/config/*.ts`, project and blog frontmatter, and what
   `diaryEntries`, `buildProjects` and `pageFacts` derive. The checker is a function with its own
   unit test on five fixtures: a typed heading, a word inside a mapped list and "Blogs about" next
   to a corpus "Blog" must fail; the footer line and the lead with its full stop must pass. Literals the lab
   markup held get config homes: the terminal title, headings, labels and photo alt in
   `homeSections`, the `h1` from `site.name`, the message names from `annaLead.title` and
   `annaDemo.who`. The existing project-fact tests stay.

10. **Reduced motion is a still page.** Lights hold the still frame; the conversation shows
    finished with no Replay; the terminal prints its intro at once with a steady caret (it already
    does when reduced motion is set on load); no CSS transition moves anything. Switching reduced
    motion on after load does the same at once: `terminal-animation.ts` reads `matchMedia` once
    today, so it gains a change listener that renders the rest of the intro instantly.

11. **Chrome.** `OverzichtLayout` stays the one layout. Its bar ("EH." mark, Projects, Blog,
    Résumé, Contact, "Get in touch") and footer move to stone and Archivo; the theme script, button
    and dark rules go; inner page bodies keep their `overzicht.css` layout with colour variables
    mapped to stone. The drawing-sheet frame (`.frame` with its A–F letters, in the layout, not in
    any page body) and the green table leave every page: they are chrome, and the 2026-11-09
    decision took the drawing-sheet language off the homepage, which renders inside this layout.
    The bar keeps "EH." with "Ezra Hulsman" beside it, as today, so a visitor arriving on an inner
    page still sees whose site it is. On phones (860 px and below) the bar keeps today's menu button from `chrome.js`,
    restyled, its theme code removed: the lab bar simply hid the links, which would strand phone
    visitors. The footer's words move to `footer` in `home.ts` ("Made in Utrecht by" + `site.name`,
    the "Proverbs 3:5-7" link); the drawing-sheet line goes. Both are calls for Ezra.

12. **Order of work: the old homepage leaves first, the lab last.** Nothing deploys before Ezra's
    review, so there is no reason to keep the drawing-sheet homepage under the new one. Chunk 2
    replaces `index.astro` with the stone page (hero only, sections added chunk by chunk), removes
    the arrival (the layout's `html.intro` head block and CSS, `intro.js`, the terminal's
    `ovz:arrived` wait) and retires `intro.e2e.mjs`, `overzicht.e2e.mjs` and the homepage parts of
    `sheets.e2e.mjs`. Chunk 3 rewrites or retires each named `sheets.e2e.mjs` test that asserts the
    old bar, theme or dark print. Chunk 7 only deletes files and adds whole-page tests. New glass
    code lives in new files while the lab still runs, so the lab's tests stay green until chunk 8
    removes the lab, its scripts, its tests and the lab-only exports of `glass.ts` (`h2Card`,
    `annaExploded`, `AnnaPane`, `AnnaVariant`, the `before` look). `AnnaPlate`/`plate.js` stay for
    /projects. Model features only the stagings used (ink, eight layers, slide, turn) stay with
    their tests and get a one-line note in `model.js` so nobody wires them back by accident.

13. **Tests wait on state, never on time.** swiftshader renders slowly: e2e tests wait on
    `__glassReady`, on the window's `done` state, on terminal output, on `fonts.ready`, on frame
    counts, never on a fixed sleep. Frame-sensitive checks freeze the light with `?t=` or
    `__glass.at(t)`; tests of the running loop load with `?guard=off`. `?chat=` stays on `/` as a
    test hook, like `?t=`.

## Risks / Trade-offs

- **More glass on the page** (six moments, up to three project windows on one screen): glass that
  is everywhere stops feeling rare → only objects that hold something are glass; Ezra judges the
  real page.
- **The artefacts' texts (Henk's chat, the sandbox's report) are placeholders** written from the
  project pages' facts → they live in `projectWindows` in config, listed for Ezra before anything
  ships; bible-tui's verses are KJV.
- **Contrast over a glow is measured, not computed** → the e2e test samples real pixels for every
  text on glass; the opaque token makes the result stable across lights.
- **Shader cost on phones** (four cards and four minis) → one shared context, DPR cap 2, off-screen
  pause, slow-device guard; measure on a mid Android before archiving.
- **Inner pages look half-converted** until the follow-up → chrome alone already removes the jump
  between two different bars.
- **Henk, Homelab and Sandbox shown twice** (card and row) may read as repetition → listed in the
  proposal as a call Ezra may reverse.
- **No adoption evidence for ANNA** (synthesis gap) → nothing is invented; the section claims only
  what anna-site and config already say.

## Migration Plan

All on `feat/glass-hero`; nothing ships until merged and deployed with Ezra's OK. Rollback is the
previous deploy. `/hero-lab` lives on in the branch history.

## Open Questions

None block the build. For Ezra's morning look:
whether the three hero projects should also be rows, whether the terminal's reflection stays, the
phone menu versus a row of links, and the footer's wording (all in the proposal's For Ezra list).

## Round 1 responses

All seven should-fix findings were right and are applied; none declined.

- M1: the one-moment rule is measured on each moment's glass box, computed from offsets and walked, before and after play; the cost is in For Ezra item 13. (Retired 2026-11-11: decision 2.)
- M2: the old homepage and arrival leave in chunk 2 with their suites; chunk 3 names every `sheets.e2e.mjs` test it rewrites or retires and why.
- M3: `homeDim` (option a) keeps `dims`' order for /projects; pytaiga shows "50 → 5"; For Ezra item 3.
- M4: phones keep today's menu, restyled (pick, For Ezra item 10); footer text in config, verbatim in For Ezra item 11; tests on seven pages.
- M5: the guard measures draw time, starts after a 1 s settle, has `?guard=off`; capped frame rate and off-screen-rises-first scenarios added; For Ezra item 9.
- S1: the quiet token covers only the alpha inks and `.terminal-dim`; darker opaque inks stay; the prompt gets `--glass-ink-red`, not grey.
- S2: the copy check runs on the rendered page against a config corpus, with a `.map()` fixture; terminal title, `h1` and message names have config homes.
- S3: rows build on `projects.ts`, Writing on `diaryEntries` and its `line`.
- S4: chrome, dark-theme and phone-menu scenarios include `/projects/Henk` and `/blog/bible-tui`.
- S5: a page-level "reduced motion switched on after load" scenario, and `terminal-animation.ts` gains the change listener.
- S6: For Ezra corrected (the reduced-motion intro is not new) and extended with the missing calls; item 1 names the reversal.
- S7: scenarios split across the chunks where their objects exist; the two orphans are in chunks 2 and 4.
- Minors: glow line clipped to the window's box; `?chat=` kept as a test hook; `h1` compared with whitespace collapsed; `client` named; `model.js` note.

## Round 2 responses

- N1: the sheet frame and green table leave every page (design 11, "No sheet frame" scenario, For Ezra item 14); the bar keeps the name (no visitor-visible change); chunk 3.2 names `sheets.e2e.mjs:132` and `:676` kept, `:396` rewritten, `:411` retired, each with its reason.
- N2: the copy check is a covering check (remove corpus values longest first, no letters may remain), with the footer line and the lead plus full stop as must-pass fixtures; ANNA's copy scenario uses the same wording.
- N3: the guard's decision is the pure `slowFrom` in `guard.js`, unit-tested on samples; e2e checks only the wiring.
- S8: For Ezra item 13 now matches design 2 (window below heading, lead and first rule; the gap is that copy plus stone).
- S9: the hero-fit scenario moves to chunk 3, after the old frame and bar are gone.
- Minors: the corpus names `diaryEntries`, `buildProjects` and `pageFacts`; the footer's full stop is markup.


## Sketch round 2 decisions (2026-11-11)

14. **ANNA's window: one line of work, no scroll, fixed size.** The window is as tall as the
    finished conversation from the first frame (every beat laid out, hidden until it lands), so
    nothing scrolls and "Close my week" stays at the top. Under her answer, one line (`.aw-work`, the
    `sources` beat) shows her work: a pulsing dot and `annaCalls.work.lines` in turn (the sources,
    then four steps short enough for one line on a phone; anna-demo.ts keeps anna-site's full steps
    and record, unrendered), settling into `annaCalls.work.done` when her question lands. The line is
    `white-space: nowrap` at a fixed height with an ellipsis as the fallback, so it can never change
    the window's size. `anna-window-model.js`'s `timeline({ lines, reply })` gives each line a dwell
    of 1.1 s plus 25 ms a character: with today's copy her question lands at 13.9 s and the play ends
    at 20.5 s (round 1: 7.8 s and 15.8 s; round 2: 22.4 s and 29 s). The crossfade is 0.25 s out,
    0.4 s in. Reduced motion and no JavaScript show the settled line. The chat's own scroll (follow,
    reader scroll-back, a focusable transcript) goes with the scroll; the transcript stays a named
    region. The window's top is level with the index "01" (grid row 1), and the section keeps
    today's top padding.

15. **Projects: three windows, two offset columns.** `projectWindows` in `home.ts` holds the three
    artefacts (Henk's Signal chat, the sandbox's report, bible-tui's reader) and their window titles.
    `Projects.astro` renders the chapters in page order Henk, Claude Sandbox, bible-tui, then the
    rows, in one grid: wider than 760 px, two columns, Henk (column 1, row 1), the sandbox (column 2,
    row 1, padded down so it starts lower), bible-tui (column 1, row 2) and the rows (column 2, row
    2); at 760 px and below, one column in page order, so the reading order never differs from the
    visual order. Each chapter is its own glass moment (`henk`, `sandbox`, `bible`), its glow in its
    project's colours (`windowGlows`: the tide and the moss from the cards, a new amber for
    bible-tui). A small driver (`src/scripts/glass/artefacts.js`) lands each artefact's lines once
    when it is half in view; reduced motion and no JavaScript show them finished.

16. **The pointer is a light; grain in the frost.** `pointer.js` holds the pure `leanToward` and the
    sheen; `panes.js` eases each pane toward its lean (0.35 s) and draws it shifted, with the pointed
    card's distance scaled by 0.3, only while the loop runs (never on touch, reduced motion, the
    guard's still frame or `?t=`). The sheen on every frosted window is a radial highlight at
    `--sx`/`--sy`, moved by a mouse only. The grain is `GlassWindow`'s `::after`: two SVG
    `feTurbulence` layers at 0.55 opacity, under the text, above the glow, on every frosted window.

17. **The bar: weight for the current page, a glow on hover.** `nav a[aria-current="page"]` takes
    weight 800 at 86% width with no underline; every page link has a `::before` radial glow of the
    hero's warm light at opacity 0, raised to 1 on hover. B3 a is parked.
