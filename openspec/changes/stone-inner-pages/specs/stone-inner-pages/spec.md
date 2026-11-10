## ADDED Requirements

### Requirement: Inner-page glass is listed per route
Every glass moment on an inner page SHALL be listed in `innerGlass` in `src/config/glass.ts`, which maps each inner route to its moment ids top to bottom: `/projects` `anna`, `project-cards`; `/projects/AnnaAssistant` `anna`; `/projects/Henk` `henk`, `diagram`; `/projects/ClaudeSandbox` `sandbox`, `diagram`; `/projects/BibleTui` `bible`; `/projects/HomelabInfrastructure` `homelab`; `/projects/FinanceBot` `finance`; `/projects/PytaigaMcp` `pytaiga`; `/blog/henk-watchdog` `henk`, `code`; `/blog/henk-exactly-once` `post-drawing`; `/blog/bible-tui` `bible`; `/contact` `compose`; and no moment for `/projects/EncryptedChatTUI`, `/projects/ResumePage`, `/blog`, `/blog/spec-factory`, `/blog/successor-scoreboard` and `/resume`. Every built inner route SHALL have an entry. Each moment's root carries `data-glass-moment`; every glass object `data-glass="ribbed"` or `"frosted"`; every `canvas` and every element with a `backdrop-filter` inside `main` sits inside a moment; every frosted window has a `[data-glow]` beneath it, except the diagram dialog's panel, whose "behind" is the blurred page (`stone-article-layout`). The page lights, the hover lights and the bar's glow are not glass.

#### Scenario: Every route has an entry
- **GIVEN** `innerGlass` in a unit test, and the routes the build produces from `src/pages/projects/*.mdx`, the published `src/pages/blog/*.mdx`, /projects, /blog, /resume and /contact
- **WHEN** they are compared
- **THEN** every route has an entry and every entry is a built route

#### Scenario: The pages match the list
- **GIVEN** each inner route loaded at 1440x900
- **WHEN** its `data-glass-moment` values are read in document order
- **THEN** they equal its `innerGlass` entry, and every `canvas` and every element with a computed `backdrop-filter` other than `none` inside `main` has an ancestor (or itself) with `data-glass-moment`

#### Scenario: The kinds
- **GIVEN** each inner route loaded
- **WHEN** the glass objects in each moment are read
- **THEN** `project-cards` holds only `data-glass="ribbed"` panes (`aria-hidden`), and every other moment holds exactly one `data-glass="frosted"` window

### Requirement: Inner windows are the homepage's windows
Every frosted window on an inner page SHALL be a `GlassWindow`: a translucent body with a backdrop blur, a light rim, the frost's two-layer grain under its text and above its glow, the sheen that follows a mouse, and a glow of soft radial lights with no hard edge beneath it. Something SHALL always be behind it.

#### Scenario: Something behind every window
- **GIVEN** each inner route with a frosted window, loaded at 1440x900 with every window finished (reduced motion, or `?speed=10` and ANNA at `done`)
- **WHEN** each window outside the closed diagram dialog is hidden and the area it covered is captured
- **THEN** a `[data-glow]` sits beneath it and the captured pixels vary by more than 20 levels, and no two neighbouring pixels on a horizontal line through the window's centre differ by more than 6 levels

#### Scenario: Grain in every inner window
- **GIVEN** each inner route with a frosted window loaded
- **WHEN** every window's `::after` is inspected
- **THEN** it has a `feTurbulence` noise background, a lower `z-index` than the window's text, and `pointer-events: none`

### Requirement: Every text on inner-page glass reads at 4.5:1
Every text inside a frosted window on an inner page (titles, artefact lines, the Homelab and Finance Bot lines, ANNA's conversation, code, the form, the drawing panes' labels, and the open diagram dialog's "Close" and labels) SHALL have at least 4.5:1 contrast against the pixels behind it, using only opaque inks (`--glass-ink-quiet`, `--glass-ink-red`, `#4a453f`, `#3a3632` or the ink), never an alpha-blended colour.

#### Scenario: Measured on every window
- **GIVEN** each inner route with a frosted window at 1440x900 and at 390x844, every window finished (reduced motion, ANNA at `done`), and at 390x844 the diagram dialog opened through "View larger" where the page has one
- **WHEN** each text element inside each window (HTML text and SVG `text`) has its colour read, then all of the window's text is made transparent at once, one screenshot of the window is taken, and the pixels behind each element's box are sampled from it
- **THEN** the lowest contrast of every element is at least 4.5:1

#### Scenario: Opaque inks only
- **GIVEN** the stylesheets and `<style>` blocks of the inner pages in a unit test
- **WHEN** every colour set on a text selector inside a glass object is read
- **THEN** none has an alpha below 1

### Requirement: One light per page
Each page's light SHALL be one entry in `pageLights` in `src/config/glass.ts`, a near and a deep colour: `projects` the flame, `blog` the tide, `resume` the sunset, `contact` the moss (Ezra, 2026-11-10, "the hero's four lights, card order"). The bar's hover glow for a link SHALL be drawn from its page's entry, and /blog and /resume SHALL each carry their entry as a head light: one `[data-page-light]` element, `aria-hidden="true"`, `pointer-events: none`, painted behind the heading (a negative `z-index` in an isolated head), its background only soft radial gradients that fade to nothing under a wide blur, still under every motion setting, and not printed. The text over a head light SHALL keep 4.5:1.

#### Scenario: Lights in config
- **GIVEN** `pageLights` in a unit test
- **WHEN** it is read
- **THEN** it has exactly `projects`, `blog`, `resume` and `contact`, each with a near and a deep colour, and each near colour is the first light colour (`tune[0].set.color`) of its hero card in `glassCards`: `projects` ANNA's flame (242, 168, 112), `blog` Henk's tide (128, 170, 226), `resume` Homelab's sunset (255, 180, 104), `contact` Claude Sandbox's moss (196, 214, 160)

#### Scenario: Soft, behind, silent
- **GIVEN** /blog and /resume loaded at 1440x900 and at 390x844
- **WHEN** the head light is inspected and a horizontal line of pixels through its centre is captured with everything else in the head hidden (`visibility: hidden`)
- **THEN** it is `aria-hidden`, ignores the pointer, paints below the `h1`, no two neighbouring pixels differ by more than 6 levels, and it lies within the page's width (no sideways scroll)

#### Scenario: Text over the light
- **GIVEN** /blog and /resume at 1440x900 and 390x844
- **WHEN** the `h1`, the line under it (/blog) and the role line and lead (/resume) are made transparent and the pixels behind them sampled from one screenshot per width
- **THEN** each text's contrast is at least 4.5:1

### Requirement: Copy comes only from config on inner pages
Every word and number on an inner page outside the MDX prose SHALL come from config or content: the homepage's corpus (string values of `src/config/*.ts`, project and blog frontmatter, what `diaryEntries`, `buildProjects` and `pageFacts` derive) plus `pageWords` (new, `src/config/pages.ts`: the article's labels "Stack", "Code", "Preview", "Date", "Updated", "Reading", "min", "On this page", "Other writing", "View larger", "Close", "Case study", "Made for fun", the résumé's group headings, section headings, actions and labels ("Languages", "GPA", "present"), the contact form's labels, button, states and fallback messages, "New message", and the /projects and /blog header lines, and "at", the word joining /resume's role line to the company; because the check ignores values under three letters, the corpus also holds the derived role text, `site.role` followed by that word) and what `src/lib/article.ts` derives (dates, reading times, `site.location` without its flag, and every link shown without its scheme: the facts' Code and Preview, the side pieces' addresses). The check SHALL be the homepage's covering check, run on every inner route over `main` and the footer, excluding the MDX prose (`.prose`), the two Overzicht drawings' own SVG (`.dwg`, words drawn in the drawing as the diagrams' are in the prose), the diagram dialog's copy of a diagram, and Turnstile's frame.

#### Scenario: The rendered inner pages are all config
- **GIVEN** each inner route loaded at 1440x900 with every window landed
- **WHEN** every text node and every `alt`, `title` and `aria-label` under `main` and the footer, outside `.prose`, `.dwg` and the dialog's diagram copy, is checked against the corpus
- **THEN** after removing every corpus value it contains as whole words, longest first, no letters remain in any of them

#### Scenario: The labels live in config
- **GIVEN** `pageWords` in a unit test
- **WHEN** it is read
- **THEN** it holds "On this page", "Other writing", "View larger", "Close", "New message", "Made for fun" and "Case study" verbatim, and no file under `src/components/stone/`, `src/layouts/` or `src/pages/` (MDX bodies and the sketches under `src/pages/sketches/`, which go in the last chunk, excepted) holds any of them as a whole string literal or as the whole text between two tags (comments are not read)

### Requirement: Inner pages are still on request
With `prefers-reduced-motion: reduce`, nothing on an inner page SHALL move on its own: the ribbed cards hold their still frame, every window shows finished, ANNA's conversation shows finished without Replay, drawings arrive drawn, the diagram dialog opens without a fade, and hover lights and cards change without a transition or a lift. Switching reduced motion on after load SHALL have the same effect at once.

#### Scenario: No running animations
- **GIVEN** each inner route loaded with reduced motion (on /contact with Turnstile's script stubbed, as in every inner test of that page)
- **WHEN** `document.getAnimations()` is read after load and after scrolling to the bottom
- **THEN** no animation is running, and two screenshots of the first screen 30 frames apart are identical

#### Scenario: Switched on after load
- **GIVEN** /projects loaded without reduced motion, `?guard=off`, the cards' lights running and ANNA's window playing
- **WHEN** reduced motion is switched on
- **THEN** within the next frames the cards hold the still frame, the conversation shows finished, and two screenshots 30 frames apart are identical

### Requirement: No inner page scrolls sideways
At 390x844 (and at 320x800 for the article pages) no inner page SHALL scroll sideways; a wider piece (a window's line, a code block, a drawing) wraps or fits its column.

#### Scenario: Every route
- **GIVEN** every inner route loaded at 390x844 with every window finished (reduced motion), and every project page and post resized in the same page to 320x800
- **WHEN** it is scrolled once to the bottom and back, and the boxes are read at each width
- **THEN** at each width `document.documentElement.scrollWidth` is at most `innerWidth`, and every box in `main` lies within 0..`innerWidth`

### Requirement: The drawing-sheet look leaves the inner pages
No inner page SHALL carry the drawing sheet: no `.sheet`, `.sheet-head`, `table.titleblock`, `.dims` dimension ticks, `.revs` or `.rev` revision letters, `.schedule`, `.stamp`, `.transmittal`, `.plate`, `.detail` or `.register` cards, `.xhair` crosshair, `.pencil-mark` or `.pencil-line`, `main.page` sheet class, hatch or arrow definitions in the layout, and no B612 font preload. The overzicht pointer (`src/scripts/overzicht/pointer.js`) SHALL be gone and `chrome.js` SHALL keep only the phone menu and the plot-in of `.dwg` drawings. `overzicht.css` SHALL keep only the bar, the menu, the footer, the skip link, print rules and the two remaining drawings' line styles.

#### Scenario: None on any inner page
- **GIVEN** each inner route loaded at 1440x900
- **WHEN** the page is inspected
- **THEN** none of the listed selectors matches, no `link[rel=preload]` names `B612`, `body > svg defs` holds no `#hatch` or `#arrow`, and the mouse moving over the page adds no pencil or crosshair element

#### Scenario: The stylesheet and scripts
- **GIVEN** `src/styles/overzicht.css`, `src/scripts/overzicht/chrome.js` and `src/layouts/OverzichtLayout.astro` in a unit test
- **WHEN** they are read
- **THEN** `overzicht.css` has no rule for `.titleblock`, `.revs`, `.rev`, `.schedule`, `.stamp`, `.transmittal`, `.plate`, `.detail`, `.register`, `.xhair` or `.pencil`; `chrome.js` does not import `pointer.js`; the layout has no `B612` and no `id="hatch"`

### Requirement: The retired files are gone
The drawings Henk, Bible, Homelab, Sandbox and Finance (`HenkDrawing.astro`, `BibleDrawing.astro`, `HomelabDrawing.astro`, `SandboxDrawing.astro`, `FinanceDrawing.astro`), `AnnaPlate.astro`, `src/scripts/overzicht/plate.js`, `scene.js`, `depth.js` (and `tests/depth.test.mjs`), `src/scripts/overzicht/pointer.js`, `StatStrip.astro`, `DetailCard.astro` and the overzicht `ProjectCard.astro` SHALL be deleted (git history keeps them). `scripts/og-image.mjs` (which draws the link preview from `scene.js`) and its `og-image` npm script SHALL go with them; `public/og-image.png` stays as it is. `PytaigaDrawing.astro`, `PostHenkDrawing.astro` and the two diagrams stay. The drawings index SHALL export only pytaiga-mcp's drawing and the henk-exactly-once post's.

#### Scenario: Files
- **GIVEN** the repository
- **WHEN** a unit test checks the retired files
- **THEN** none exists (`scripts/og-image.mjs` included), `public/og-image.png`, `PytaigaDrawing.astro`, `PostHenkDrawing.astro`, `HenkFlow.astro` and `SandboxArchitecture.astro` do, `package.json` has no `og-image` script, and no file under `src/` or `scripts/` imports a retired file or contains `AnnaPlate`, `plate.js`, `scene.js`, `depth.js` or `StatStrip`

#### Scenario: Nothing of the plate on the built site
- **GIVEN** the site built with `npm run build`
- **WHEN** `dist/` is searched
- **THEN** no page contains `plate-stage`, `titleblock` or `class="stamp"`

### Requirement: The sketches are gone
The untracked sketch routes (`src/pages/sketches/`) SHALL be removed once the inner pages carry everything they showed; they are kept in the handoff folder and need no history.

#### Scenario: No sketch routes
- **GIVEN** the site built with `npm run build`
- **WHEN** `/sketches/inner/` is requested from the running site and `dist/` is searched
- **THEN** the response is 404, `dist/` has no `sketches` directory, the sitemap lists no `/sketches/` page, and `src/pages/sketches/` does not exist
