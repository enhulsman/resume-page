## ADDED Requirements

### Requirement: Sections in order
The homepage SHALL show, top to bottom: the hero, then the sections ANNA, Projects, Experience, Writing, About and Contact, each with an `h2` whose text comes from config.

#### Scenario: Section order
- **GIVEN** the homepage loaded
- **WHEN** the `h2` headings in `main` are read top to bottom
- **THEN** they are "ANNA", "Projects", "Experience", "Writing", "About", "Contact"

### Requirement: The hero is the name and four ribbed cards
The hero SHALL show the name as a real `h1` in plain type (no glare, no effect on the name), the role and the intro line ("I build ANNA, an AI assistant in Microsoft Teams that does the admin no one should spend their day on."), and four ribbed glass cards in this order: ANNA, Henk, Homelab, Claude Sandbox, each a link to its project page, each with its index `01` to `04`. Each card's readout SHALL come from config: ANNA's is "In production", the others one of that project's dimensions in `home.ts`.

#### Scenario: Hero content
- **GIVEN** the homepage loaded at 1440x900
- **WHEN** the hero is read
- **THEN** the `h1` reads "Ezra Hulsman", the intro line is present verbatim, the four card titles are ANNA, Henk, Homelab, Claude Sandbox in order, and every card's `href` starts with `/projects/`

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

### Requirement: Other projects as rows of type
The Projects section SHALL list, as rows of type on stone with no glass, every project in `details` and `register` except ANNA and those marked `hideOnHome`: first the hero-card projects in card order, each with its card index (02 Henk, 03 Homelab, 04 Claude Sandbox), then the others in `home.ts` order. A row SHALL show the project's title, its `what` line, its status from the project page's frontmatter, its first dimension's value set large in tabular figures with that dimension's label, and link to its project page; a register entry has no number. The section SHALL end with a link to /projects.

#### Scenario: The rows
- **GIVEN** the homepage loaded
- **WHEN** the Projects rows are read
- **THEN** their titles are, in order, Henk's, Homelab's and Claude Sandbox's listing titles, then Finance Bot, bible-tui, pytaiga-mcp and Encrypted Chat TUI; the first three carry 02, 03, 04; "This site" is absent

#### Scenario: The number is the project's
- **GIVEN** the homepage loaded
- **WHEN** each detail row's large number is read
- **THEN** it equals that project's `dims[0].value` in `home.ts` (Henk "4", bible-tui "102", pytaiga-mcp "50 → 5"), and its label equals `dims[0].label`

#### Scenario: A number changes at its source
- **GIVEN** the row builder in a unit test with a project whose first dimension is changed
- **WHEN** the rows are built
- **THEN** the row shows the new value with no other edit

### Requirement: Experience, Writing, About and Contact keep their sources
Experience SHALL list every entry in `resume.ts` `experience` as years (`startDate`–`endDate`, or `startDate`– and the word for now from config), role and company, divided by hairline rules, ending with a link to /resume. Writing SHALL list the five newest published posts (files under `src/pages/blog/` not starting with `_`), newest first, each with title, date and description from frontmatter, ending with a link to /blog. About SHALL show `notes` from `home.ts`, the site photo as a plain image with its alt text from config, and the terminal in a frosted window. Contact SHALL show `site.social.email` set large as a `mailto:` link, then links to /contact, LinkedIn and GitHub from `site.ts`, as type with no glass.

#### Scenario: Experience
- **GIVEN** the homepage loaded
- **WHEN** the Experience rows are read
- **THEN** there is one row per `experience` entry in order, each showing its role and its company and the years starting with `startDate`

#### Scenario: A new post
- **GIVEN** the post list builder in a unit test with one more published post dated after all others
- **WHEN** the Writing list is built
- **THEN** that post is first and the list has at most five entries; a post whose file starts with `_` never appears

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
Every word and number on the homepage SHALL come from config or content files (`src/config/*.ts`, project and blog frontmatter). The homepage's markup (`src/pages/index.astro` and `src/components/stone/*.astro`) MUST contain no literal words: after frontmatter, comments, `<style>` and `<script>` blocks and `{...}` expressions are removed, no letters remain between tags or in `alt`, `title` or `aria-label` values. The existing single-source tests for project facts SHALL keep passing.

#### Scenario: The scan
- **GIVEN** `src/pages/index.astro` and every `src/components/stone/*.astro`
- **WHEN** the single-source test strips frontmatter, comments, style and script blocks and expressions
- **THEN** no letter remains between tags or in an `alt`, `title` or `aria-label` value

#### Scenario: The scan catches a typed-in word
- **GIVEN** a component source with `<h2>Projects</h2>` in its markup
- **WHEN** the scan runs over it
- **THEN** it reports that file and the word

#### Scenario: Headings and labels live in config
- **GIVEN** `homeSections` in `src/config/home.ts`
- **WHEN** a unit test reads it
- **THEN** it holds the headings "Projects", "Experience", "Writing", "About", "Contact", the link labels and the photo's alt text

### Requirement: The whole page is still on request
With `prefers-reduced-motion: reduce`, nothing on the homepage SHALL move on its own: the lights hold their still frame, ANNA's conversation shows finished, the terminal prints its intro at once with a steady caret, and no CSS transition or animation runs. Switching reduced motion on after load SHALL have the same effect at once.

#### Scenario: Reduced motion from the start
- **GIVEN** the homepage loaded with `prefers-reduced-motion: reduce` and `__glassReady`
- **WHEN** the page is screenshotted at the hero, at ANNA's window and at the terminal, and again after `requestAnimationFrame` has run 30 more times at each
- **THEN** each pair of screenshots is identical, ANNA's window shows every beat, and the terminal shows its whole intro and an input line

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
Every page SHALL use the stone ground (`#EEEAE3`), the Archivo type, the top bar (the "EH." mark linking home, Projects, Blog, Résumé, Contact, and "Get in touch") and the stone footer. There SHALL be no theme button and no dark theme.

#### Scenario: Inner pages carry the chrome
- **GIVEN** `/projects`, `/blog`, `/resume` and `/contact` each loaded
- **WHEN** the body background and the top bar are read
- **THEN** the background is `#EEEAE3` and the bar shows the "EH." mark and the five links

#### Scenario: Dark system theme
- **GIVEN** any of `/`, `/projects`, `/blog`, `/resume`, `/contact` loaded with `prefers-color-scheme: dark`
- **WHEN** the body background is read
- **THEN** it is still `#EEEAE3`, and no theme button exists

### Requirement: The drawing-sheet homepage retires
The homepage SHALL NOT play an arrival animation and SHALL NOT render the title block, the revision letters, the stamp, the drawings, the ANNA 3D scene or ANNA's section with its levels. The retired homepage code (`intro.js`, `scene.js`, the homepage `main.js`, `YouSheet`, `AnnaSection`, `DetailsSheet`, `RegisterSheet`, `RevisionsSheet`, `NotesSheet`, `ContactSheet`) SHALL be deleted; `AnnaPlate` and `plate.js` stay for /projects.

#### Scenario: Arrival
- **GIVEN** a new browser session
- **WHEN** the homepage loads
- **THEN** the hero is fully visible in the first painted frame and the document has no `intro` class

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
