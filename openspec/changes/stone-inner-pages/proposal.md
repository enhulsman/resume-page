## For Ezra

**Every inner-page decision is yours and made (2026-11-10, `FINAL-PICKS.md`), binding on this change:**

- Project pages: P1's head (index in its card hue, title, hook) with layout **ac**: the text on the
  left, one wide right column that opens with the page's window (which scrolls away), then a
  sticky block: "On this page", the facts in two columns, the numbers in two columns. On a phone
  the window comes after the lead, the facts and numbers at the end, and the contents list is
  hidden.
- Blog posts: B1 with layout ac; a post's project in the sticky block; fenced code in a frosted
  window; a post with neither a window nor a project ends the block with "Other writing" (the
  three newest other posts, title and date).
- /blog: BI2 (titles as the list) with one soft tide light far behind "Blog", and the project's
  light behind a title on hover. /resume: R3 (years as the spine) with one soft sunset light far
  behind the name. /contact: C2 wide (columns 0.78/1.22, the form in a frosted "New message"
  window up to 820 px). /projects: I2e (ANNA's window leads, then one piece of ribbed glass per
  project) with your three fixes: Finance Bot its own hue, "This site" gets the new hook as its
  intro, the text column a bit wider.
- Windows hold something real: Henk's chat, the sandbox's report and bible-tui's reader (on their
  project pages and posts), Homelab's `homelab-health` output (H1), Finance Bot's Discord `/upload`
  reply (it replaces its drawing), pytaiga-mcp's Overzicht drawing in a frosted pane, the
  henk-exactly-once post's own drawing in its pane, ANNA's Teams window with her four levels as rows
  under it. Encrypted Chat TUI and This site have no window.
- The Henk, Bible, Homelab, Sandbox and Finance drawings leave the site; `AnnaPlate`, `plate.js`,
  `scene.js` and `depth.js` retire; the drawing-sheet look leaves every inner page.
- Diagrams get "View larger" (a frosted dialog: "Close", Escape, click outside), shown only where
  the diagram is drawn smaller than its natural size.
- The bar's hover glow takes one light per link: Projects flame, Blog tide, Résumé sunset,
  Contact moss; desktop only, as now.
- Approved copy goes in verbatim: "Made for fun", This site's hook, "The Idea", the opening of
  "Built Like It Matters", the levels' names without minus numbers, the Homelab texts (description,
  hook, workstation sentence, "One command for the whole lab"), and the labels "Other writing",
  "View larger", "Close", "New message", "On this page".

**Still yours, shown to you before anything ships (none blocks the build):**

1. **Three sections of This site's page** ("Stack Choices", "The Terminal", "Two Things You Might
   Have Missed") speak the drawing sheet and carry stale numbers. They are drafted at build with
   measured numbers and shown to you verbatim (task 10.3); nothing of them ships without your OK.
2. **This site's `description` and stack** (found while writing this spec, not in FINAL-PICKS):
   the description still reads "Astro portfolio drawn as a set of technical drawings, with a canvas
   section of ANNA ...", and `tech` lists "Canvas 2D". Drafted with item 1 and shown to you.
3. **Finance Bot's own hue.** You asked for one; its colour is tuned at build and you see it in
   the review screenshots before anything ships.

**Calls made in this spec that you may want to reverse:**

1. **Finance Bot's window glows in its new hue,** not the "mist": FINAL-PICKS says mist "until its
   own hue exists", and this change creates that hue.
2. **/blog's head light is the tide only.** The sketch's head light had a second, amber light;
   FINAL-PICKS says "one soft tide light".
3. **This site's card on /projects reads its intro from This site's page** (the approved hook in
   `ResumePage.mdx`), so the sentence lives in one place. Encrypted Chat TUI keeps its one-liner.
4. **The card's text column is 60% of the card** on a desktop (the sketch: 52%), the light's pane
   keeping the rest.
5. **A post keeps its "Updated" date** in its facts when it has one (spec-factory does); the ac
   sketch left it out, the live post shows it.
6. **The henk-exactly-once drawing's pane glows in Henk's tide** (its project's light, as a post's
   code window does); pytaiga-mcp's pane keeps the sketch's warm glow.
7. **A diagram opens by a click on it only when its "View larger" button shows,** so a diagram at
   full size is not a button.
8. **The words the layouts typed in** ("Stack", "Code", "Preview", "Date", "Reading", "Updated",
   "min", "Case study", the résumé's labels, the form's labels) move into config, so the
   homepage's single-source check can cover the inner pages too. No word changes.
9. **Henk's and bible-tui's numbers move from the `StatStrip` in their text into their page's
   frontmatter (`stats`)**, so the layout can place them in the right column; the values do not
   change. A post shows its project's first number.
10. **The link-preview generator retires with `scene.js`.** `scripts/og-image.mjs` draws
    `public/og-image.png` from ANNA's 3D drawing, which this change deletes. The script goes; the
    image itself stays as it is, so link previews keep the drawing-sheet ANNA drawing until a
    stone preview is made (a follow-up, not in this change).

**What a visitor sees change:**

- Every inner page is stone and type, the same bar, footer and Archivo as the homepage. No title
  blocks, dimension lines, revision letters, stamp, pencil or crosshair anywhere.
- A project page opens like its chapter on the homepage: the index in its colour, the title, the
  hook, and on the right the project's own window (Henk's chat, the sandbox's report, bible-tui's
  reader, the homelab's health check, Finance Bot's reply in Discord, ANNA's conversation with her
  four levels under it, pytaiga-mcp's drawing behind frosted glass). Scrolling on, the window goes
  and a column stays beside the text: what is on the page, with the section you are reading in
  bold, the facts and the numbers.
- A post reads the same way: its window or code in frosted glass, its project beside the text, or,
  for a post that belongs to no project, three other posts to read next.
- /projects: ANNA's conversation first, then every project as a piece of ribbed glass holding its
  own light, under Running, Paused and Done; the side pieces under "Made for fun".
- /blog: the five titles set large, a soft blue light far behind "Blog". /resume: the years set
  large beside each role, a soft sunset light behind the name; it still prints on white.
  /contact: the form in a frosted "New message" window, the address set large beside it.
- In the bar, each link glows in its own colour under the pointer.
- Large diagrams on a phone get "View larger".
- With reduced motion every page is still: windows show finished, lights hold still, no fades.
- On a phone nothing scrolls sideways; the contents list is left out.
- The Henk, Bible, Homelab, Sandbox and Finance drawings and ANNA's 3D plate are gone (the git
  history keeps them).

## Why

`stone-glass-homepage` gave every page the stone bar and footer but left the inner page bodies in
the drawing-sheet look, so a click from the homepage lands in a different site. The sketch rounds
of 2026-11-12 (53 routes under `src/pages/sketches/inner/`) and Ezra's picks of 2026-11-10 settled
every inner page. This change builds them, retires what only the drawing sheet used, and removes
the sketches, so the whole site can be deployed once.

## What Changes

- **One article layout for project pages and posts** (`ProjectLayout` and `BlogLayout` on a
  shared stone article): head, a right column with the window then a sticky block (contents,
  facts, numbers, the post's project or "Other writing"), the prose in one column; phone order.
- **Windows on inner pages** through the homepage's `GlassWindow` and `artefacts.js`: the
  existing three artefacts, two new ones in config (`projectWindows.homelab`,
  `projectWindows.finance`), two drawing panes, ANNA's window, code windows, the contact form, and
  the diagram dialog. Every inner glass moment is listed per route in config (`innerGlass`).
- **Lights:** `pageLights` (flame, tide, sunset, moss) for the bar's hover and the head lights of
  /blog and /resume; `projectLights` for /projects' ribbed cards, with Finance Bot's own.
- **/projects, /blog, /resume, /contact** rebuilt as picked.
- **Copy:** the approved texts, the levels' names, the Homelab texts; the inner pages' labels move
  into config and the single-source check covers every inner page.
- **Retired:** the five drawings, `AnnaPlate`, `plate.js`, `scene.js`, `depth.js`,
  `StatStrip.astro`, `DetailCard`, `ProjectCard`, the overzicht pencil pointer, the layout's
  hatch and arrow defs and B612 preload, every drawing-sheet rule for page bodies in
  `overzicht.css`, the résumé's revision letters, the contact stamp and its mail line; last, the
  sketches.

## Capabilities

### New Capabilities

- `stone-article-layout`: the shared layout ac of project pages and posts: columns, the window
  slot, the sticky block, "On this page", the phone order, diagrams and "View larger".
- `stone-project-pages`: each project page's head, facts, numbers and window, ANNA's page, the
  Homelab and Finance Bot windows, pytaiga-mcp's pane, and the approved copy of the Homelab and
  This site pages.
- `stone-blog`: a post's head, window, code windows, project block and "Other writing"; /blog
  with its tide light.
- `stone-projects-index`: /projects (I2e): ANNA leads, the ribbed project cards, each project's
  light, "Made for fun".
- `stone-resume`: /resume (R3) with its sunset light, and printing.
- `stone-contact`: /contact (C2 wide).
- `stone-inner-pages`: what holds for every inner page: glass listed per route, text on glass at
  4.5:1, the page lights, copy from config, reduced motion, phone width, and the retirement of the
  drawing-sheet look, its files and the sketches.

### Modified Capabilities

- `glass-material`: "Glass only where something is behind it" covers the inner pages
  (`innerGlass`) and names the two drawings and the diagram dialog that may sit in frost.
- `stone-homepage`: the bar's hover glow takes each page's own light; `AnnaPlate`, `plate.js`,
  `scene.js` and `depth.js` no longer stay.
- `anna-section`: ANNA's four levels are rows of type without minus numbers, on /projects and on
  her project page.

These three are deltas against `stone-glass-homepage`, which is built but not archived:
`stone-glass-homepage` must be archived first, so its specs exist in `openspec/specs/`.

## Impact

- **Files:** `src/layouts/ProjectLayout.astro`, `BlogLayout.astro`, `OverzichtLayout.astro`;
  new `src/components/stone/Article.astro`, `ArticleSide.astro`, `DiagramView.astro`,
  `DrawingPane.astro`, `AnnaLevels.astro`, `ProjectGlassCard.astro` (ribbed), `HomelabWindow.astro`, `FinanceWindow.astro`; `src/pages/projects/index.astro`,
  `blog/index.astro`, `resume.astro`, `contact.astro`; `src/config/glass.ts` (`innerGlass`,
  `pageLights`, `projectLights`), `home.ts` (`annaLevels`, `projectWindows.homelab` and
  `.finance`), new `src/config/pages.ts` (`pageWords`); new `src/lib/article.ts` (facts, numbers,
  contents, other writing); `HomelabInfrastructure.mdx`, `ResumePage.mdx`, `Henk.mdx`,
  `BibleTui.mdx` (frontmatter `stats`); `src/styles/stone.css` (inner page bodies),
  `overzicht.css` (drawing-sheet body rules out); `src/scripts/overzicht/chrome.js` (pointer
  import out); deletions listed above.
- **Tests:** new `tests/inner-pages.test.mjs`, `tests/inner-retired.test.mjs`,
  `tests/inner-article.e2e.mjs`, `tests/inner-windows.e2e.mjs`, `tests/inner-blog.e2e.mjs`,
  `tests/inner-projects.e2e.mjs`, `tests/inner-resume.e2e.mjs`, `tests/inner-contact.e2e.mjs`,
  `tests/inner-site.e2e.mjs`; named tests in `tests/sheets.e2e.mjs`, `glass-chrome.e2e.mjs`,
  `glass-home.test.mjs` and `glass-home.e2e.mjs` rewritten or retired (tasks.md names each);
  `tests/depth.test.mjs` goes with `depth.js`; `package.json` runs the new suites and loses the
  `og-image` script with `scripts/og-image.mjs`.
- **Performance:** /projects has eight ribbed cards of five panes each; 24 are drawn on a desktop
  and 16 on a phone, through the one shared WebGL context, with the off-screen pause and the
  slow-device guard; panes hidden at a width are not drawn.
- **No new dependencies.** No change to the Worker, the contact form's handling or the PDF résumé.
- **Not in this change** (FINAL-PICKS follow-ups): dark mode; frame time on a mid Android phone;
  the unused `fontkit`/`wawoff2` devDependencies; /resume's empty fifth column at 1800 px and
  wider; the homelab docs' missing `agent-read` lines. Also not here: a stone link-preview image
  (call 10).
