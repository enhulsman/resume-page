## ADDED Requirements

### Requirement: Sections in order
The homepage SHALL show, top to bottom: the hero, then the sections ANNA, Projects, Experience, Writing, About and Contact, each with an `h2` whose text comes from config.

#### Scenario: Section order
- **GIVEN** the homepage loaded
- **WHEN** the `h2` headings in `main` are read top to bottom
- **THEN** they are "ANNA", "Projects", "Experience", "Writing", "About", "Contact"

### Requirement: The hero is the name and four ribbed cards
The hero SHALL show the name (`site.name`) as a real `h1` in plain type, set on two lines (no glare, no effect on the name), the role and the intro line ("I build ANNA, an AI assistant in Microsoft Teams that does the admin no one should spend their day on."), and four ribbed glass cards in this order: ANNA, Henk, Homelab, Claude Sandbox, each a link to its project page, each with its index `01` to `04`. Each card's readout SHALL come from config: ANNA's is "In production", the others one of that project's dimensions in `home.ts`.

#### Scenario: Hero content
- **GIVEN** the homepage loaded at 1440x900
- **WHEN** the hero is read
- **THEN** the `h1`'s text with whitespace collapsed to single spaces reads "Ezra Hulsman", the intro line is present verbatim, the four card titles are ANNA, Henk, Homelab, Claude Sandbox in order, and every card's `href` starts with `/projects/`

#### Scenario: The name is plain
- **GIVEN** the homepage loaded
- **WHEN** the `h1` and its pseudo-elements are inspected
- **THEN** it has no `data-glare` attribute, its `::after` has no content, and no animation runs on it

#### Scenario: Readouts from the project data
- **GIVEN** `glassCards` and `details` in config
- **WHEN** a unit test compares them
- **THEN** ANNA's readout is "In production" and each other card's readout contains one of its project's `dims` values verbatim

#### Scenario: Hero fits the first screen
- **GIVEN** the homepage loaded at 1280x720, 1440x900 and 1920x1080
- **WHEN** the card row is measured after fonts are ready
- **THEN** the bottom of the card row is inside the viewport at each size

#### Scenario: Phone
- **GIVEN** the homepage loaded at 390x844
- **WHEN** the hero is laid out
- **THEN** the cards scroll sideways in their own row and the page itself has no sideways scroll

### Requirement: Projects: three in their own windows, the rest as rows
The Projects section SHALL show every project in `details` and `register` except ANNA and those marked `hideOnHome`, each once. Three of them, Henk, Claude Sandbox and bible-tui (`projectWindows` in `src/config/home.ts`, in that order), SHALL each be a chapter: its card index if it has one (02 Henk, 04 Claude Sandbox), its title linking to its project page, its `what` line, its homepage number set large in tabular figures with that dimension's label, its status, and a frosted window holding a real artefact of the project (Ezra, 2026-11-11, sketch A2 tight): Henk's Signal chat (an alert carrying an injection, Henk refusing it), the sandbox's session report, and bible-tui's reader on Genesis 1 (KJV). Every word and number in the artefacts SHALL come from `projectWindows`. The others SHALL be rows of type on stone with no glass: first the remaining hero-card project with its index (03 Homelab), then the rest in `home.ts` order (Finance Bot, pytaiga-mcp, Encrypted Chat TUI); a row shows the title, `what`, status and number (a register entry has none), and links to its page. The homepage number is `dims[homeDim]`, where `homeDim` is an optional index on a `DetailListing` in `home.ts` (default 0); pytaiga-mcp sets `homeDim: 2` so its row shows "50 → 5", and the order of `dims` (which /projects reads) does not change. Wider than 760 px the chapters SHALL stand in two offset columns: Henk then bible-tui on the left, Claude Sandbox on the right starting lower, the rows under it; at 760 px and below one column: Henk, Claude Sandbox, bible-tui, then the rows. The page order of the chapters and rows SHALL be the same at every width (Henk, Claude Sandbox, bible-tui, rows). Each artefact lands once, line by line, when it is well in view; with reduced motion, or without JavaScript, it shows finished. The section SHALL end with a link to /projects.

#### Scenario: The projects, in order
- **GIVEN** the homepage loaded
- **WHEN** the Projects section's chapters and rows are read in page order
- **THEN** their titles are Henk's, Claude Sandbox's and bible-tui's listing titles (chapters), then Homelab's, Finance Bot, pytaiga-mcp and Encrypted Chat TUI (rows); Henk carries 02, Claude Sandbox 04 and Homelab 03; "This site" and ANNA are absent; each links to its page with its line and status

#### Scenario: The number is the project's
- **GIVEN** the homepage loaded
- **WHEN** each chapter's and row's large number is read
- **THEN** it equals that project's `dims[homeDim ?? 0].value` in `home.ts` (Henk "4", Claude Sandbox "3,700", bible-tui "102", Homelab "4", Finance Bot "0.75", pytaiga-mcp "50 → 5"), and its label equals that dimension's label; Encrypted Chat TUI has none

#### Scenario: /projects keeps its numbers
- **GIVEN** `home.ts` with `homeDim` added
- **WHEN** a unit test reads pytaiga-mcp's `dims`
- **THEN** their order is unchanged ("11", "3", "50 → 5"), so /projects still leads with the first two

#### Scenario: A number changes at its source
- **GIVEN** the row builder in a unit test with a project whose `dims[homeDim]` is changed
- **WHEN** the rows are built
- **THEN** the row shows the new value with no other edit

#### Scenario: Each chapter holds its artefact
- **GIVEN** the homepage loaded with every artefact landed
- **WHEN** each chapter's window is read
- **THEN** it is one frosted window titled from `projectWindows`, Henk's holds the alert and his messages, the sandbox's the report's command, lines and risk, bible-tui's the book, translation, five verses and its keys, all as in `projectWindows`

#### Scenario: Two offset columns on a desktop
- **GIVEN** the homepage at 1440x900 and 1280x720
- **WHEN** the chapters and rows are measured
- **THEN** Henk and bible-tui share the left column (bible-tui under Henk), Claude Sandbox stands in the right column starting at least 120 px lower than Henk, the rows stand under it in the right column, and the stone between two chapters in a column is at most 120 px

#### Scenario: Tight chapters on a phone
- **GIVEN** the homepage at 390x844
- **WHEN** the chapters and rows are measured
- **THEN** they stand in one column in page order, the stone between two chapters is at most 96 px, every box lies within 0..390 px and the page has no sideways scroll

#### Scenario: The artefacts land once
- **GIVEN** the homepage loaded
- **WHEN** a project window is out of view, then scrolled well into view
- **THEN** its lines are hidden until then and all shown after; with reduced motion, or with JavaScript off, every line shows at once

### Requirement: Experience, Writing, About and Contact keep their sources
Experience SHALL list every entry in `resume.ts` `experience` newest first (entries without an `endDate` first, then by `endDate`, then by `startDate`, each descending; a full tie keeps the résumé's order), as years (`startDate`–`endDate`, or `startDate`– and the word for now from config), `role` and the company (`client`), divided by hairline rules, ending with a link to /resume. The order SHALL be computed in code (`byRecency` in `src/lib/experience.ts`), not by reordering `resume.ts`, whose order /resume keeps. Writing SHALL list the first five of `diaryEntries` from `src/lib/frontmatter.ts` (published posts, newest first), each with its `title`, date `label` and one-line `line` (the post's `diary` line, or its description when it has none), ending with a link to /blog. About SHALL show `notes` from `home.ts`, the site photo as a plain image with its alt text from config, and the terminal in a frosted window. Contact SHALL show `site.social.email` set large as a `mailto:` link, then links to /contact, LinkedIn and GitHub from `site.ts`, as type with no glass.

#### Scenario: Experience
- **GIVEN** the homepage loaded
- **WHEN** the Experience rows are read
- **THEN** there is one row per `experience` entry, newest first (every job running to now above every job that ended, end years descending), each showing its `role`, its `client` and the years starting with `startDate`; "Pega DevOps Engineer" (2023 to now) sits above "DevOps Engineer" (2023 to 2024)

#### Scenario: Newest first, in code
- **GIVEN** `byRecency` called in a unit test on entries with and without an `endDate`, and on the real `experience`
- **WHEN** the result is read
- **THEN** current entries come first, then by `endDate`, then by `startDate`, each descending, a full tie keeps the input order, the input is left unchanged, and /resume does not use it

#### Scenario: A new post
- **GIVEN** the Writing list built from `diaryEntries(...).slice(0, 5)` in a unit test, with one more published post dated after all others added to the sources
- **WHEN** the list is built
- **THEN** that post is first, the list has at most five entries, each entry shows its `line`, and a post whose file starts with `_` never appears

#### Scenario: About
- **GIVEN** the homepage loaded
- **WHEN** the About section is read
- **THEN** it contains every `notes` string, one `img` whose `alt` comes from config, and one frosted window holding the terminal

#### Scenario: The terminal still runs
- **GIVEN** the homepage loaded and the terminal's intro finished (waited on its first input line)
- **WHEN** a visitor clicks into the terminal, types `ls` and presses Enter
- **THEN** it lists the project directories as it does today, and `whoami` answers "ezra"

#### Scenario: The terminal window
- **GIVEN** the homepage loaded
- **WHEN** the terminal window is inspected
- **THEN** its computed `backdrop-filter` contains `blur(`, its background alpha is below 0.8, its title bar reads "ezra@hulsman: ~", and none of the drawing-sheet terminal styling (its own head bar) shows

#### Scenario: Contact
- **GIVEN** the homepage loaded
- **WHEN** the Contact section is read
- **THEN** its largest text is `site.social.email` in a link to `mailto:` + that address, and it links to /contact, `site.social.LinkedIn` and `site.social.GitHub`

### Requirement: Copy comes only from config
Every word and number on the homepage SHALL come from config or content files: string values exported by `src/config/*.ts`, project and blog frontmatter, and what `diaryEntries` (`src/lib/frontmatter.ts`), `buildProjects` and `pageFacts` (`src/lib/projects.ts`) derive from them (date labels, statuses). The check is a covering check: for every text node under `main` and the footer, and every `alt`, `title` and `aria-label` value there, every corpus value of three letters or more that occurs in the text as whole words (at word boundaries) is removed, longest first, and no letters SHALL remain (so markup may join config values with punctuation, as in the footer line or `annaLead.text` followed by a full stop); the terminal's own output (`.term-body`) is excluded, because its text is checked by the existing terminal test in `tests/single-source.test.ts`. Words that markup used to hold get config homes: the terminal title "ezra@hulsman: ~", the section headings, link labels and the photo's alt in `homeSections`; the `h1` from `site.name`; the message names from `annaLead.title` and `annaDemo.who`. The existing single-source tests for project facts SHALL keep passing.

#### Scenario: The rendered page is all config
- **GIVEN** the homepage loaded at 1440x900 with ANNA's conversation at `done`
- **WHEN** every text node and every `alt`, `title` and `aria-label` under `main` and the footer, outside `.term-body`, is checked against the corpus
- **THEN** after removing every corpus value it contains, longest first, no letters remain in any of them

#### Scenario: The check catches a typed-in word
- **GIVEN** the checker function in a unit test and four fixtures: `<h2>Projects</h2>` where "Projects" is not in the corpus; a link "See all" rendered inside a list of rows; the footer line "Made in Utrecht by Ezra Hulsman." with "Made in Utrecht by" and "Ezra Hulsman" in the corpus; and `annaLead.text` followed by "."; and a typed "Blogs about" with "Blog" in the corpus
- **WHEN** the checker runs over each fixture
- **THEN** it reports "Projects", "See all" and "Blogs about" (a corpus value inside a longer word is not removed), and passes the footer line and the lead

#### Scenario: Headings and labels live in config
- **GIVEN** `homeSections` in `src/config/home.ts`
- **WHEN** a unit test reads it
- **THEN** it holds the headings "Projects", "Experience", "Writing", "About", "Contact", the link labels, the word for now, the terminal title "ezra@hulsman: ~" and the photo's alt text

### Requirement: The whole page is still on request
With `prefers-reduced-motion: reduce`, nothing on the homepage SHALL move on its own: the lights hold their still frame, ANNA's conversation shows finished, the terminal prints its intro at once with a steady caret, and no CSS transition or animation runs. Switching reduced motion on after load SHALL have the same effect at once.

#### Scenario: Reduced motion from the start
- **GIVEN** the homepage loaded with `prefers-reduced-motion: reduce` and `__glassReady`
- **WHEN** the page is screenshotted at the hero, at ANNA's window and at the terminal, and again after `requestAnimationFrame` has run 30 more times at each
- **THEN** each pair of screenshots is identical, ANNA's window shows every beat, and the terminal shows its whole intro and an input line

#### Scenario: Reduced motion switched on after load
- **GIVEN** the homepage loaded without reduced motion, `?guard=off`, with the terminal in view and its intro still typing
- **WHEN** reduced motion is switched on (`page.emulateMedia({ reducedMotion: 'reduce' })`)
- **THEN** within the next animation frames the cards hold the still frame, the terminal shows its whole intro and an input line, its caret does not blink, and two screenshots 30 frames apart are identical

#### Scenario: No running animations
- **GIVEN** the homepage loaded with reduced motion
- **WHEN** `document.getAnimations()` is read after load
- **THEN** no animation is running

### Requirement: Phone width with no sideways scroll
At 390x844 the homepage SHALL never scroll sideways; content that is wider (the hero card row) scrolls in its own container.

#### Scenario: The whole page
- **GIVEN** the homepage loaded at 390x844
- **WHEN** it is scrolled from top to bottom in steps of half the viewport height, and again after ANNA's conversation and the terminal's intro have finished
- **THEN** at every step `document.documentElement.scrollWidth` is at most `innerWidth`, and every section's box lies within 0..390 px

### Requirement: Shared chrome on every page
Every page SHALL use the stone ground (`#EEEAE3`), the Archivo type, the top bar (the "EH." mark linking home, Projects, Blog, Résumé, Contact, and "Get in touch") and the stone footer. The footer's words SHALL come from config (`footer` in `src/config/home.ts`): the line "Made in Utrecht by" followed by `site.name`, and the link "Proverbs 3:5-7" to `site.quoteUrl`; the drawing-sheet line ("Every dimension on this sheet is a real number. Nothing is drawn in perspective.") goes. The bar keeps the "EH." signature with the full name `site.name` beside it on one line, as today. The drawing-sheet frame (`.frame` with its A–F reference letters in `OverzichtLayout.astro`, and its border rules in `overzicht.css`) and the green table around it SHALL leave every page. There SHALL be no theme button and no dark theme.

#### Scenario: No sheet frame
- **GIVEN** each of `/`, `/projects`, `/projects/Henk`, `/blog`, `/blog/bible-tui`, `/resume`, `/contact` loaded
- **WHEN** the page is inspected
- **THEN** it has no `.frame` element, and the page ground at the viewport edges is `#EEEAE3`

#### Scenario: Inner pages carry the chrome
- **GIVEN** `/projects`, `/projects/Henk`, `/blog`, `/blog/bible-tui`, `/resume` and `/contact` each loaded
- **WHEN** the body background, the top bar and the footer are read
- **THEN** the background is `#EEEAE3`, the bar shows the "EH." mark with "Ezra Hulsman" beside it, the four page links and "Get in touch", and the footer reads "Made in Utrecht by Ezra Hulsman." with a "Proverbs 3:5-7" link

#### Scenario: Dark system theme
- **GIVEN** any of `/`, `/projects`, `/projects/Henk`, `/blog`, `/blog/bible-tui`, `/resume`, `/contact` loaded with `prefers-color-scheme: dark`
- **WHEN** the body background is read
- **THEN** it is still `#EEEAE3`, and no theme button exists

### Requirement: Phones reach every page from the bar
At 860 px wide and below, the bar SHALL fold the four page links into a menu button (the existing menu behaviour, restyled in stone, without the theme button); "Get in touch" and the "EH." mark stay visible. Opening the menu SHALL show the four links next in keyboard order.

#### Scenario: Every page from every page
- **GIVEN** each of `/`, `/projects`, `/projects/Henk`, `/blog`, `/blog/bible-tui`, `/resume`, `/contact` loaded at 390x844
- **WHEN** the menu button is pressed and each of Projects, Blog, Résumé and Contact is followed in turn
- **THEN** each lands on `/projects`, `/blog`, `/resume` and `/contact` respectively, and the page has no sideways scroll with the menu open

#### Scenario: Keyboard order
- **GIVEN** `/projects` loaded at 390x844
- **WHEN** the menu button is focused and activated with Enter, then Tab is pressed
- **THEN** focus moves to the first of the four links

### Requirement: The drawing-sheet homepage retires
The homepage SHALL NOT play an arrival animation (the layout's head block that sets `html.intro`, the `html.intro` CSS, `intro.js` and the terminal's wait for `ovz:arrived` all go) and SHALL NOT render the title block, the revision letters, the stamp, the drawings, the ANNA 3D scene or ANNA's section with its levels. The retired homepage code (`intro.js`, the homepage `main.js`, `YouSheet`, `AnnaSection`, `DetailsSheet`, `RegisterSheet`, `RevisionsSheet`, `NotesSheet`, `ContactSheet`) SHALL be deleted; `AnnaPlate` and `plate.js` stay for /projects, and with them `scene.js` (the model `plate.js` draws) and `depth.js` (which `scene.js` imports).

#### Scenario: Arrival
- **GIVEN** a new browser session
- **WHEN** the homepage loads
- **THEN** the hero is fully visible in the first painted frame, the document never gets an `intro` class, and the body is not clipped to one screen

#### Scenario: Retired files are gone
- **GIVEN** the repository
- **WHEN** a unit test checks the retired files
- **THEN** none of them exists, and `AnnaPlate.astro` still does

### Requirement: The lab and the rejected stagings are gone
After the homepage carries the hero, ANNA's window and the terminal window, `/hero-lab` SHALL be removed with everything only it used: the H2 variant, the lab bar, the name glare, the turn, journey and stack stagings and the words staging (`glare.js`, `anna.js`, `anna-model.js`, `anna-scene.js`, `anna-turn.js`, `anna-journey.js`, `words.js`, `words-model.js`, `hero.js` once `panes.js` replaces it), the lab-only exports of `glass.ts` (`h2Card`, `annaExploded`, `AnnaPane`, `AnnaVariant`, the `before` look), and their tests. This SHALL be the last change of the build.

#### Scenario: No lab page
- **GIVEN** the site built with `npm run build`
- **WHEN** `/hero-lab` is requested from the running site
- **THEN** the response is 404 and `dist/` has no `hero-lab` page

#### Scenario: No staging code
- **GIVEN** the repository
- **WHEN** a unit test checks `src/scripts/glass/` and `src/config/glass.ts`
- **THEN** none of the staging files exists, `glass.ts` exports none of `h2Card`, `annaExploded` or the `before` look, and no file under `src/` contains `anna-turn`, `anna-journey`, `anna-x`, `data-glare` or `?lab=`

#### Scenario: No contact strip
- **GIVEN** the homepage loaded
- **WHEN** the Contact section is inspected
- **THEN** it holds no `canvas`, no `[data-glass]` and no element with a `backdrop-filter`

### Requirement: The current page is set in weight, and a link glows under the pointer
In the bar, the link of the page you are on SHALL be set in the name's heavy weight (`font-weight` 700 or more) with no underline, keeping `aria-current="page"`; the other links stay in their regular weight (500 or less). Hovering any of the four page links SHALL light a small soft glow of the hero's warm light behind the word (a radial gradient that fades to nothing, no hard edge), which is gone when the pointer leaves. On the homepage no link is current. (Ezra, 2026-11-11, sketch B3 b with c on hover; B3 a, the travelling full stop, is parked.)

#### Scenario: The current page in weight
- **GIVEN** `/projects`, `/blog`, `/resume` and `/contact` loaded at 1440x900
- **WHEN** the bar's four links are read
- **THEN** exactly one has `aria-current="page"`, the one for that page; its computed weight is at least 700 and it has no underline; the others weigh 500 or less

#### Scenario: A glow under the pointer
- **GIVEN** `/projects` loaded at 1440x900
- **WHEN** the mouse rests on the "Blog" link, then moves away
- **THEN** while it rests there the link's `::before` shows a radial-gradient glow (opacity above 0.5) and no other link's does; after it moves away the glow is gone (opacity 0)
