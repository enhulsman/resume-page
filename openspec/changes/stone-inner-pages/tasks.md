## Test commands (every chunk ends with all of them green)

- Unit: `npm test` (it already runs every `tests/glass-*.test.mjs`), and until task 12.3 adds them
  to it, `node --test tests/inner-*.test.mjs`
- Build: `npm run build`
- E2E (dev server on 127.0.0.1:4399, start it with `npx astro dev --host 127.0.0.1 --port 4399` if
  it is not running): `BASE=http://127.0.0.1:4399 npm run test:e2e` (it already runs every
  `tests/glass-*.e2e.mjs` and `tests/sheets.e2e.mjs`), and until task 12.3 adds them to it,
  `BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/inner-*.e2e.mjs`. Do not run
  the glass e2e files a second time on their own.

**Test cost (the e2e suite was cut from 11.5 to about 5 minutes; keep the inner files near two
minutes in all).** One browser context per route per file, reused across widths with
`page.setViewportSize`, never a new context per width. Checks that read the same page state share
one test: in `inner-site.e2e.mjs` each route loads once with reduced motion (every window finished on
arrival, nothing to wait for) and checks the list, the kinds, grain, the glow beneath, the copy
coverage, the drawing-sheet selectors and the still screenshots, then resizes to 390 (and 320 for
article pages) for sideways scroll and contrast. Contrast is sampled from one screenshot per window
(or per page and moment for the ribbed cards) with all its text made transparent at once, never one
screenshot per element. A test that needs the normal motion (a play landing once, the sticky block,
the loop) loads separately and only on the route the scenario names. Every inner test of /contact
stubs Turnstile's script (as "A send, mocked" does), so no third-party frame animates or loads.

Rules for every chunk: write the chunk's tests from its scenarios first and see them fail for the
right reason; then build; then run every command above; then commit the chunk on its own (through
the git-commit-handler; never push). E2E tests wait on state (`__glassReady`, a window's lines
landed, ANNA's `done`, `document.fonts.ready`, frame counts, a drawing's `drawn` class), never on a
fixed sleep; light-sensitive checks freeze the light with `?t=` or `__glass.at(t)`; every test that
needs the loop running loads with `?guard=off`; ANNA's window is held with `?chat=`; plays whose end
state is all that matters load with `?speed=10`. The sketches under `src/pages/sketches/` stay
untracked and untouched until chunk 12: they import the drawings and the plate's config, and Astro
builds every route, so the files they hold are deleted only after they go (design 13). Scenarios that the MODIFIED requirements carry over unchanged from
`stone-glass-homepage` (glass-material "The list in config", "The page matches the list", "The
kinds", "Something behind every window", "No glass anywhere else"; stone-homepage "Arrival", "The
current page in weight", "A glow under the pointer"; anna-section "Not on the homepage") keep their
existing tests in `tests/glass-*.{test,e2e}.mjs`, which must stay green in every chunk. An old test is
only removed or rewritten where a task below names it and the decision behind it; line numbers are
those of `tests/sheets.e2e.mjs` at ba3e05b.

## 1. Config and the pure helpers (all capabilities: their config and functions)

- [x] 1.1 Unit tests (`tests/inner-pages.test.mjs`): `innerGlass` covers every built route and only those (stone-inner-pages "Every route has an entry"); `pageLights` (four entries, the hero's near colours); `projectLights` (eight, the hero three are their cards', no two alike; Finance Bot's hue at least 30 degrees from every other and from the mist, saturation at least 0.25); `windowGlows.finance` uses Finance Bot's light, `windowGlows.dusk` exists; `projectWindows.homelab` equals the approved table and holds nothing private; `projectWindows.finance` equals the approved lines; `annaLevels` names without minus numbers; `pageWords` holds the approved labels; `factsOf` (project and post, missing fields, labels from `pageWords`, en-US month for projects, en-GB day for posts, "Updated" only when set); `numbersOf` (`stats` first, else the first three `dims`, else none; a post: its project's first `dims`); `contentsOf` (the `h2` ids and texts in order, none without `h2`s); `otherWriting` (three newest others, no drafts, none with a window or project); Henk.mdx's and BibleTui.mdx's `stats` equal their old `StatStrip` values; by name: stone-inner-pages "Every route has an entry", "Lights in config" (page lights); stone-projects-index "Lights in config", "Finance Bot's own hue"; stone-project-pages "Built from frontmatter", "The output, verbatim" and "Nothing private" (config half), "The reply, verbatim" and "Its own light" (config half); stone-blog "The function"; anna-section "No minus numbers". Rewrite in `tests/glass-home.test.mjs` "each window has a glow of soft radial lights in config" (line 244 asserts exactly five `windowGlows` keys; decision 2026-11-10: Homelab's and Finance Bot's windows get their own glows) so the keys are the five plus `dusk` and `finance`, its other assertions kept
- [x] 1.2 `src/config/glass.ts`: `innerGlass`, `pageLights`, `projectLights` (the sketch's `hues.ts` tunings for bible-tui, pytaiga-mcp, Encrypted Chat TUI and This site, the hero's three from `glassCards`, and a new light for Finance Bot), `windowGlows.dusk` and `windowGlows.finance`
- [x] 1.3 `src/config/home.ts`: `annaLevels` names "Identity", "Claude", "MCP connectors", "Operations"; `projectWindows.homelab` and `projectWindows.finance` with the approved text verbatim (from the sketches' `HomelabArt.astro` and `FinanceArt.astro`); `introFromHook` on This site's register entry, joined by `buildProjects`
- [x] 1.4 New `src/config/pages.ts` with `pageWords` (every label listed in stone-inner-pages "Copy comes only from config", moved verbatim from the layouts and pages); new `src/lib/article.ts` with `factsOf`, `numbersOf`, `contentsOf`, `otherWriting`, `bare` and the flagless location (design 2)
- [x] 1.5 `stats` frontmatter on Henk.mdx and BibleTui.mdx with the `StatStrip` values; the `StatStrip` stays in the body until chunk 3 moves the numbers
- [x] 1.6 Run all test commands

## 2. The bar's lights (stone-homepage: the current page in weight, a link glows)

- [x] 2.1 Tests: "Each link its own light" and "Not on a phone" in `tests/glass-chrome.e2e.mjs`; keep "A glow under the pointer" (line 182 there) and "The current page in weight" as they are
- [x] 2.2 `.bar nav a::before` per link from `pageLights` (a custom property per link set from config in `Bar.astro`), desktop only as now
- [x] 2.3 Run all test commands

## 3. The article on project pages (stone-article-layout; stone-project-pages: head, facts, numbers, the three existing windows)

- [x] 3.1 Tests (`tests/inner-article.e2e.mjs`): stone-article-layout "Two columns at 1440", "The 1000 px boundary", "No drawing-sheet head" (project pages), "Beside the head", "It scrolls away", "No window, same column" (Encrypted Chat TUI), "It sticks while reading", "Facts and numbers in two columns", "The list is the page's headings", "The current section" (on Henk for now), "Following a link", "Order at 390", "Order at 999"; stone-project-pages "Henk's head", "A project without a card", "bible-tui's facts", "Henk's numbers", "Numbers from the listing", "No ticks, no numbers where there are none", "The window per page" (Henk, Claude Sandbox, bible-tui, Encrypted Chat TUI, This site), "Henk's chat, as on the homepage", "The lines land once" (on Henk for now)
- [x] 3.2 Rewrite or retire in `tests/sheets.e2e.mjs` (decision 2026-11-10: P1 head with layout ac, the drawings retire): retire line 239 ("a project page opens with its title block and its own drawing"); keep lines 522 (bible-tui's links) and 533 (the sandbox is retired), renaming "sheet" to "page" in 522's title only
- [x] 3.3 `src/components/stone/Article.astro` (head, `aside` with the window slot and `.side-stick`, prose), the side script marking the current section; `ProjectLayout.astro` on it, reading its window from `innerGlass`; Henk.mdx and BibleTui.mdx without `<StatStrip>` (numbers from `stats`); the five drawings no longer rendered by `ProjectLayout` (the files stay until chunk 12); ANNA's page keeps `AnnaPlate` until chunk 4 replaces it, so the plate tests at lines 198 and 256 stay green until then; `ProjectLayout`'s meta-description fallback ("Case study: ...", dead: every project page has a `description`) goes; article styles in `stone.css`
- [x] 3.4 Run all test commands

## 4. The new windows and ANNA's page (stone-project-pages; anna-section: on her page)

Commit this chunk in two parts, each with its own tests green: (a) the Homelab and Finance Bot
windows and the Homelab texts; (b) pytaiga-mcp's pane and ANNA's page.

- [x] 4.1 Tests (`tests/inner-windows.e2e.mjs`): "The output, verbatim", "Nothing private", "On a phone" (Homelab); "The reply, verbatim", "Its own light", "The drawing is gone" (Finance Bot); "The pane", "Plotted, and still on request", "It fits" (pytaiga-mcp); "Window and levels", "It plays once", "Still on request", "On a phone" (ANNA's page); "Still and without JavaScript" and "The lines land once" on Homelab and Finance Bot; "The texts, verbatim" (Homelab copy); anna-section "On her page"
- [x] 4.2 Retire in `tests/sheets.e2e.mjs` (decision 2026-11-10: ANNA's plate retires on her page, her window and levels take its place): line 198 ("ANNA's project page draws the model large") and line 256 ("ANNA's case study carries the section drawing"). In `tests/glass-home.test.mjs` rewrite "nothing on the homepage imports the four levels: the page and the stone components" (line 438) to the homepage's named components (anna-section "Nothing on the homepage imports them"), because `AnnaLevels.astro`, made in 4.3, lives in `src/components/stone/` (decision 2026-11-10: the levels are rows on /projects and ANNA's page); and rewrite "AnnaSection: one frosted window from config, the moment named, the window driver reused" (line 448, which reads only `AnnaSection.astro`'s source) to read `AnnaSection.astro` and `AnnaWindow.astro` together, every assertion kept, because 4.3 moves the window's markup into `AnnaWindow.astro` (decision 2026-11-10: ANNA's window also opens her page and /projects). `AnnaWindow.astro` keeps the class names `anna-window.js` keys on (`.anna-window`, `.aw-window`, `.aw-compose`, `[data-beat]`, `.aw-replay`)
- [x] 4.3 `HomelabWindow.astro`, `FinanceWindow.astro` (from config, `data-play`, landed by `artefacts.js`); `src/components/stone/DrawingPane.astro` (its own defs, no paper halo on glass) for pytaiga-mcp; `AnnaWindow.astro` factored out of `AnnaSection.astro` (the homepage unchanged; its glass and ANNA tests stay green) and `AnnaLevels.astro`, both on ANNA's page; the Homelab texts in `HomelabInfrastructure.mdx` (description, hook, the workstation sentence in place of the old one, the new paragraph after "Monitoring and alerting")
- [x] 4.4 Run all test commands; if a window text is under 4.5:1, darken its ink in `stone.css` (one place) and rerun

## 5. Diagrams: "View larger" (stone-article-layout)

- [x] 5.1 Tests (`tests/inner-article.e2e.mjs`): "Only where it shrinks", "Resizing across the natural width", "Open and close", "Reduced motion", "The diagram itself has no glass"
- [x] 5.2 `src/components/stone/DiagramView.astro` (one `<dialog>` per page with a diagram, frosted panel, `data-glass-moment="diagram"`) and its measuring script; the diagrams' labels and captions in Archivo, stone ink
- [x] 5.3 Run all test commands

## 6. Posts (stone-blog: a post; stone-article-layout on posts)

- [x] 6.1 Tests (`tests/inner-blog.e2e.mjs`): "The head", "The facts", "The window per post", "The post drawing fits", "henk-watchdog's log line", "Code on a phone", "Henk beside the watchdog post", "A project without a card", "On spec-factory", "Not where there is a window or a project"; stone-article-layout "The same layout on a post", "No window, same column" (spec-factory), "The order of the block", "It stops at the article's end", "The current section" (on henk-exactly-once), "No drawing-sheet head" (posts), "Order at 390" (henk-watchdog)
- [x] 6.2 Rewrite or retire in `tests/sheets.e2e.mjs` (decision 2026-11-10: B1 with layout ac; the hanging heads and the title block go): retire line 585 ("a post's text starts beside its title") and line 617 ("every heading of a post still hangs in the left column"); rewrite line 285 ("a post opens with its date in a title block and reads at a sane measure") to the date in the side's facts and a prose column of at most 672 px; line 595 ("a post's title block gives its reading time and its project") to the side's facts and project; line 610 ("on a phone a post reads in order") to title, lead, window, text, facts; line 625 ("the Henk post carries its own drawing under the title") to the drawing in the frosted pane opening the right column, and no drawing in posts without one; line 641 ("on a phone the post drawing fits") to the pane's selector
- [x] 6.3 `BlogLayout.astro` on `Article.astro`: facts, the window from `innerGlass` (Henk's chat, the bible-tui reader, `DrawingPane` with `PostHenkDrawing` and Henk's glow for henk-exactly-once), fenced code in `GlassWindow` (dots, no title, the post's project's glow, `data-glass-moment="code"`), the project block, "Other writing" from `otherWriting`
- [x] 6.4 Run all test commands

## 7. /blog and /resume with their lights (stone-blog: /blog; stone-resume; stone-inner-pages: one light per page)

- [ ] 7.1 Tests (`tests/inner-blog.e2e.mjs`, `tests/inner-resume.e2e.mjs`): /blog "Every post, newest first", "On a phone", "The head light is the tide", "A title's light on hover", "By keyboard, and still"; /resume "The head", "The sunset behind the name", "The rows", "On a phone" (both), "The rows from config", "One column on a phone", "Headings a screen reader can jump to", "Print"; stone-inner-pages "Lights in config", "Soft, behind, silent", "Text over the light"
- [ ] 7.2 Rewrite or retire in `tests/sheets.e2e.mjs` (decisions 2026-11-10: /blog BI2, /resume R3, no revision letters): rewrite line 275 ("/blog is the site diary") to BI2's list; line 295 ("/resume: every role as a revision, skills and schooling as schedules") to the spine rows and the three row sections; line 307 ("/resume prints on white with no chrome") to the print scenario, the page light included; keep line 475 (every section a heading), adjusting selectors only
- [ ] 7.3 `src/pages/blog/index.astro` (BI2, the head light, per-title hover lights from `projectLights`); `src/pages/resume.astro` (R3, the head light, labels from `pageWords`, print rules); the head light as one small component (`src/components/stone/PageLight.astro`)
- [ ] 7.4 Run all test commands

## 8. /contact (stone-contact)

- [ ] 8.1 Tests (`tests/inner-contact.e2e.mjs`): "Wide", "The 980 px boundary", "On a phone", "The fields", "A send, mocked", "A failed send", "Measured", "Focus", "Gone"
- [ ] 8.2 Rewrite or retire in `tests/sheets.e2e.mjs` (decision 2026-11-10: C2 wide; the stamp and the transmittal go): rewrite line 322 ("/contact is a transmittal: stamp, labelled fields, honeypot, Turnstile") without the stamp, the form inside the frosted window; line 342 ("/contact reports a failed send in the sheet's red") to `--glass-ink-red` at 4.5:1; line 571 ("/contact offers plain mail under the form") to the address set large (left column on a desktop, under the window on a phone)
- [ ] 8.3 `src/pages/contact.astro`: the C2-wide layout, `GlassWindow` "New message" with the flame glow, the form's markup, script and Turnstile unchanged except its words from `pageWords` and its styles on glass; no stamp, no transmittal, no mail line
- [ ] 8.4 Run all test commands; darken the labels' or the status line's ink in one place if a measurement fails

## 9. /projects (stone-projects-index; anna-section: on /projects)

- [ ] 9.1 Tests (`tests/inner-projects.e2e.mjs`): "The order", "Every project once, in its group", "Made for fun", "The lead", "On a phone" (lead), "A card's contents", "Two per row, then one", "The text column", "The light keeps its band on a phone", "One context, and only what shows", "Still on request", "Without WebGL", "Measured across the loop"; anna-section "On /projects"; rewrite `tests/glass-home.e2e.mjs` "the four levels live on /projects: ANNA's plate shows each name with its text" (line 387 reads `.anna-plate .plate-levels li`; decision 2026-11-10: the plate retires, the levels are rows under her text) to read the rows under ANNA's lead
- [ ] 9.2 Rewrite or retire in `tests/sheets.e2e.mjs` (decision 2026-11-10: I2e; the plate and the drawings on /projects retire): rewrite line 154 ("/projects leads with ANNA, then every project under its status") to I2e's lead and cards; retire line 186 ("the ANNA plate turns by hand and by its buttons"), line 212 ("turning the ANNA plate by hand draws no pencil line"), line 227 ("reduced motion: every plate arrives drawn"), line 402 ("clicking a project's drawing opens its case study", replaced by "A card's contents": each card is a link), line 431 ("on a phone a project's drawing fits the screen whole"), line 440 ("/projects on a wide screen: the text sits beside each drawing"), line 485 ("every detail drawing is drawn at a legible scale") and line 496 ("no project drawing scrolls sideways", replaced by "It fits" and "The post drawing fits"); rewrite line 510 ("the homelab counts the workstation") to the figures "4" and "7" on Homelab's card and its page and "is the fourth machine on the mesh" in its write-up, without the drawing
- [ ] 9.3 `src/components/stone/ProjectGlassCard.astro` (from `RibFull.astro`, text column 60%), `panes.js` skipping panes with no size; `src/pages/projects/index.astro` (header, ANNA's lead with `AnnaWindow` and `AnnaLevels`, the groups, "Made for fun"); `DetailCard`, overzicht `ProjectCard` and `AnnaPlate` no longer used (files stay until chunk 12)
- [ ] 9.4 Run all test commands; if a card text is under 4.5:1, adjust that project's light (or the text column's wash) in config and rerun

## 10. This site's page (stone-project-pages: This site's page speaks stone)

- [ ] 10.1 Tests: "The approved texts", "No drawing sheet left", "The claim holds"; rewrite `tests/sheets.e2e.mjs` line 648 ("the site's own case study ... the two jokes worth pointing at", decision 2026-11-10: the drawing-sheet sections are rewritten) to the section headings Ezra approves and keep its "leaves Claude out" assertion
- [ ] 10.2 Apply the approved texts verbatim to `ResumePage.mdx`: the hook, "The Idea", the opening of "Built Like It Matters"; check whether anything else in that section speaks the drawing sheet (today it is one paragraph, so nothing follows the opening)
- [ ] 10.3 Draft, with numbers measured on the built site (the JavaScript shipped per page, the terminal's command count, how the glass is rendered), new text for "Stack Choices", "The Terminal" and "Two Things You Might Have Missed" (it describes the retired ANNA room), plus the page's `description` and `tech`; show every draft to Ezra verbatim through the coordinator before it ships. Never mark this task done on a draft: it is done when Ezra has approved the words. Until then the drafts sit in the page so the tests can run, and chunk 12 stops with them listed for his review
- [ ] 10.4 Run all test commands

## 11. Every inner page (stone-inner-pages; glass-material)

- [ ] 11.1 Tests (`tests/inner-site.e2e.mjs`, `tests/inner-pages.test.mjs`): "The pages match the list", "The kinds", "Something behind every window", "Grain in every inner window", "Measured on every window", "Opaque inks only", "The rendered inner pages are all config", "The labels live in config", "No running animations", "Switched on after load", "Every route" (phone width), "None on any inner page", "The stylesheet and scripts"; glass-material "Only the three exceptions hold a drawing"; the covering checker reused from `tests/glass-home.*` with the corpus extended by `pageWords`, `resume.ts`, `projectWindows` and `article.ts`' derivations
- [ ] 11.2 Remove the drawing-sheet body rules from `overzicht.css` (title block, dims ticks, revisions, schedules, stamp, transmittal, plate, detail and register cards, crosshair, pencil, hatch); remove the B612 preload, the hatch and arrow defs and the `page` sheet class from `OverzichtLayout.astro`; remove the `pointer.js` import from `chrome.js` (the menu and the `.dwg` plot-in stay); any label still typed into an inner component moves to `pageWords`
- [ ] 11.3 Retire in `tests/sheets.e2e.mjs` line 80 ("has no sideways scroll at 390px", over the INNER sample): stone-inner-pages "Every route" now checks every inner route at 390 and 320 in the same loads, so keeping it would load each sample route twice (decision 2026-11-10: every page in stone). Keep lines 58, 91, 122, 141, 389, 462, 522, 533, 541, 556 and 658, adjusting only selectors the restyle changed
- [ ] 11.4 Run all test commands

## 12. The sketches go, the retired files go, then stop for Ezra (last)

- [ ] 12.1 Tests (`tests/inner-retired.test.mjs`, `tests/inner-site.e2e.mjs`): "Files" (stone-inner-pages "The retired files are gone"), "Nothing of the plate on the built site", "No sketch routes"; stone-homepage "Retired files are gone"; rewrite `tests/glass-home.test.mjs` "retired files are gone: ... AnnaPlate and plate.js stay" (line 712; decision 2026-11-10: the plate retires) so `AnnaPlate.astro`, `plate.js`, `scene.js` and `depth.js` are on the gone list
- [ ] 12.2 Delete `src/pages/sketches/` (untracked; the handoff folder keeps a copy). Then delete `HenkDrawing.astro`, `BibleDrawing.astro`, `HomelabDrawing.astro`, `SandboxDrawing.astro`, `FinanceDrawing.astro` (and their entries in `drawings/index.ts`), `AnnaPlate.astro`, `src/scripts/overzicht/plate.js`, `scene.js`, `depth.js`, `tests/depth.test.mjs`, `scripts/og-image.mjs` (it imports `scene.js`; `public/og-image.png` stays as it is), `src/scripts/overzicht/pointer.js`, `src/components/StatStrip.astro`, `DetailCard.astro` and the overzicht `ProjectCard.astro`. Remove any `overzicht.css` rule these deletions leave unused (the class-usage test at `tests/glass-home.test.mjs:752` scans `src/`, which held the sketches until now, and names them)
- [ ] 12.3 Add `tests/inner-*.test.mjs` to `npm test` and `tests/inner-*.e2e.mjs` to `test:e2e` in `package.json`, drop `tests/depth.test.mjs` from `npm test`, and drop the `og-image` script, so CI runs them; from here on the test commands are `npm test` and `npm run test:e2e` alone
- [ ] 12.4 Run all test commands, against the dev server and against the build (`npx astro preview`), and `openspec validate stone-inner-pages --strict`. Time `npm run test:e2e` against the dev server and report it with the 5-minute baseline; if it passes 7 minutes, merge the slowest inner tests along the "Test cost" rule before the stop
- [ ] 12.5 Fresh-eyes review of every inner page at 1440, 1000, 999 and 390; screenshots of each for Ezra, including Finance Bot's new hue on /projects and its window, and the text column at 1000 and 1200
- [ ] 12.6 Codex adversarial review of the branch's inner-page commits (check `quota-log --print` first; ask above 75% weekly); fix MUST findings; rerun all test commands
- [ ] 12.7 STOP for Ezra's review. Hand him: the screenshots, the drafted This site texts and description from 10.3 verbatim, Finance Bot's hue, the e2e time from 12.4, and the note that the link preview (`public/og-image.png`) keeps its drawing-sheet ANNA drawing until a stone one is made (proposal, call 10). Do not archive, push or deploy. When he approves, the archive order is `stone-glass-homepage` first, then this change: its `MODIFIED` requirements need the homepage's specs in `openspec/specs/`
