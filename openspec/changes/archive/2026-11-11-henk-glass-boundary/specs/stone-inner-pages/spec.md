## MODIFIED Requirements

### Requirement: Inner-page glass is listed per route
Every glass moment on an inner page SHALL be listed in `innerGlass` in `src/config/glass.ts`, which maps each inner route to its moment ids top to bottom: `/projects` `anna`, `project-cards`; `/projects/AnnaAssistant` `anna`; `/projects/Henk` `henk`, `henk-boundary`, `diagram`; `/projects/ClaudeSandbox` `sandbox`, `diagram`; `/projects/BibleTui` `bible`; `/projects/HomelabInfrastructure` `homelab`; `/projects/FinanceBot` `finance`; `/projects/PytaigaMcp` `pytaiga`, `diagram`; `/blog/henk-watchdog` `henk`, `code`; `/blog/henk-exactly-once` `post-drawing`, `diagram`; `/blog/bible-tui` `bible`; `/contact` `compose`; and no moment for `/projects/EncryptedChatTUI`, `/projects/ResumePage`, `/blog`, `/blog/spec-factory`, `/blog/successor-scoreboard` and `/resume`. Every built inner route SHALL have an entry. Each moment's root carries `data-glass-moment`; every glass object `data-glass="ribbed"` or `"frosted"`; every `canvas` and every element with a `backdrop-filter` inside `main` sits inside a moment; every frosted window has a `[data-glow]` beneath it, except the diagram dialog's panel, whose "behind" is the blurred page (`stone-article-layout`). The page lights, the hover lights and the bar's glow are not glass.

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

### Requirement: The retired files are gone
The drawings Henk, Bible, Homelab, Sandbox and Finance (`HenkDrawing.astro`, `BibleDrawing.astro`, `HomelabDrawing.astro`, `SandboxDrawing.astro`, `FinanceDrawing.astro`), `AnnaPlate.astro`, `src/scripts/overzicht/plate.js`, `scene.js`, `depth.js` (and `tests/depth.test.mjs`), `src/scripts/overzicht/pointer.js`, `StatStrip.astro`, `DetailCard.astro` and the overzicht `ProjectCard.astro` SHALL be deleted (git history keeps them). `scripts/og-image.mjs` (which draws the link preview from `scene.js`) and its `og-image` npm script SHALL go with them. `public/og-image.png` SHALL be replaced by a 1200x630 still of the stone homepage's hero, its four glass cards with the light frozen (`?t=`), taken from the running site (Ezra, 2026-11-10); no script regenerates it. `PytaigaDrawing.astro`, `PostHenkDrawing.astro`, `SandboxArchitecture.astro` and Henk's trust-boundary diagram (`HenkBoundary.astro`, which replaced `HenkFlow.astro` on 2026-11-12) stay; `HenkFlow.astro` SHALL be deleted. The drawings index SHALL export only pytaiga-mcp's drawing and the henk-exactly-once post's.

#### Scenario: Files
- **GIVEN** the repository
- **WHEN** a unit test checks the retired files
- **THEN** none exists (`scripts/og-image.mjs` included), `public/og-image.png` (a 1200x630 PNG), `PytaigaDrawing.astro`, `PostHenkDrawing.astro`, `HenkBoundary.astro` and `SandboxArchitecture.astro` do and `HenkFlow.astro` does not, `package.json` has no `og-image` script, and no file under `src/` or `scripts/` imports a retired file or contains `AnnaPlate`, `plate.js`, `scene.js`, `depth.js` or `StatStrip`

#### Scenario: Nothing of the plate on the built site
- **GIVEN** the site built with `npm run build`
- **WHEN** `dist/` is searched
- **THEN** no page contains `plate-stage`, `titleblock` or `class="stamp"`
