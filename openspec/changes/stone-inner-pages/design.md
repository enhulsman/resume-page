## Context

`stone-glass-homepage` (built on `feat/glass-hero`, not archived) shipped the stone homepage, the
stone bar and footer on every page, `GlassWindow`, `GlassCard`, `panes.js`, `artefacts.js`,
`anna-window.js`, the shared inks (`--glass-ink-quiet`, `--glass-ink-red`), the test hooks
(`?t=`, `?speed=`, `?chat=`, `?guard=off`) and the single-source covering check. Inner page bodies
were left in the drawing-sheet look: `ProjectLayout` (title block, drawing or `AnnaPlate`, prose),
`BlogLayout` (title block, hanging heads, `PostHenkDrawing`), /projects (`AnnaPlate`,
`DetailCard`, `ProjectCard`), /resume (revision letters, schedules), /contact (transmittal and
stamp), with `overzicht.css`, `scripts/overzicht/pointer.js` (pencil, crosshair) and the layout's
hatch and arrow defs and B612 preload.

The decisions are in `~/.local/state/handoffs/threads-saved/2026-11-12-inner-pages/FINAL-PICKS.md`
(it wins), with detail and the approved copy in `directions.md` beside it. The reference
implementation is the untracked sketch tree `src/pages/sketches/inner/` and its `_lib/`
(`Balance.astro` variant `ac`, `ProjectsIndex.astro` variant `i2e` with `RibFull.astro`,
`BlogIndex.astro` `bi2`, `Resume.astro` `r3`, `Contact.astro` `c2w`, `HomelabArt.astro`,
`FinanceArt.astro`, `DrawingPane.astro`, `Lightbox.astro`, `Levels.astro`, `hues.ts`,
`sketch.css`). A copy of that tree is kept in `src/` beside FINAL-PICKS. There is no AGENTS.md or
CLAUDE.md in the repo.

## Goals / Non-Goals

**Goals:** every inner page as picked; glass on inner pages only where it holds something real,
listed in config and tested like the homepage's; every text on glass at 4.5:1; every word from
config or content; reduced motion is a still page; no sideways scroll at 390 px; the
drawing-sheet look and its files gone; the sketches removed; one review stop for Ezra.

**Non-Goals:** redesigning any pick; new copy beyond the labels moved into config (the three This
site sections and its description are drafted and shown to Ezra, never shipped unseen); dark
mode; the homepage (except the bar's hover lights); the Worker or the contact form's server side;
deploying.

## Decisions

1. **One stone article for project pages and posts.** `src/components/stone/Article.astro` takes
   the head (index, title, lead), the window slot, the side data and the rendered prose, and lays
   them out as variant ac: from 1000 px a grid `minmax(0, 7fr) minmax(18rem, 5fr)` with
   `column-gap: clamp(40px, 6vw, 120px)`; head and prose capped at 42rem, the side's window and
   `.side-stick` capped at 36rem and set to the column's right edge; the side
   (`aside`) spans the article's rows and stretches, its window first, then `.side-stick`
   (`position: sticky; top: calc(var(--bar) + 32px)`), 56 px under the window. Below 1000 px the
   article is a flex column ordered head, window, prose, side block; the contents list is
   `display: none`. `ProjectLayout` and `BlogLayout` render the article directly (no `proseOf`
   cutting as the sketches did: the layout owns the body). *Why:* FINAL-PICKS "Layout ac"; one
   component keeps project pages and posts identical in behaviour.

2. **The side's data is pure and unit-tested.** `src/lib/article.ts` exports
   `factsOf(frontmatter, kind)` (project: `dateLabel` and the en-US month and year, Stack, Code,
   Preview; post: Date, Updated if any, Reading), `numbersOf(page)` (a project's `stats`
   frontmatter, else its listing's first three `dims`, else none; a post: its project's first
   `dims` entry), `contentsOf(html)` (the prose's `h2` ids and texts) and
   `otherWriting(posts, self)` (the three newest other published posts, or none when the post has
   a window or a project), plus the small derivations the copy check needs in its corpus:
   `bare(url)` (a link without its scheme, for the facts and /projects' side pieces) and the
   location without its flag. Labels come from `pageWords`. *Why:* the side is the part most likely to
   regress silently, and these are cheap to test without a browser.

3. **`StatStrip` leaves the prose.** Henk's and bible-tui's numbers move from the `<StatStrip>` in
   their MDX into a `stats` frontmatter list with the same values and labels; `StatStrip.astro`
   is deleted. *Why:* the layout must place the numbers in the side; lifting a component out of a
   rendered MDX body is what the sketches had to fake.

4. **The window per page is a table, not inference.** `innerGlass` in `src/config/glass.ts` maps
   every inner route to its glass moments top to bottom: `/projects`: `anna`, `project-cards`;
   `/projects/AnnaAssistant`: `anna`; `/projects/Henk`: `henk`, `diagram`;
   `/projects/ClaudeSandbox`: `sandbox`, `diagram`; `/projects/BibleTui`: `bible`;
   `/projects/HomelabInfrastructure`: `homelab`; `/projects/FinanceBot`: `finance`;
   `/projects/PytaigaMcp`: `pytaiga`, `diagram`; `/projects/EncryptedChatTUI`, `/projects/ResumePage`,
   `/blog`, `/resume`, `/blog/spec-factory`, `/blog/successor-scoreboard`: none;
   `/blog/henk-watchdog`: `henk`, `code`; `/blog/henk-exactly-once`: `post-drawing`, `diagram`;
   `/blog/bible-tui`: `bible`; `/contact`: `compose`. The layouts read their window from it; a unit
   test fails when a built route (a new post or project) has no entry. `glassMoments` (the
   homepage's list) is unchanged. *Why:* the homepage's "the page matches the list" gate, extended;
   a new page cannot gain or lose glass by accident.

5. **New windows are config plus the homepage's component.** `projectWindows.homelab` (title
   "ezra@workstation: ~", the command, the heading, the rows) and `projectWindows.finance` (title
   "Discord · #finance", the command line, the bot's message, the progress line, the summary) hold
   the sketches' text verbatim. `HomelabWindow.astro` and `FinanceWindow.astro` render them in
   `GlassWindow` with `data-play`, so `artefacts.js` lands them once, honours `?speed=`, and shows
   them finished under reduced motion and without JavaScript. Their glows are new `windowGlows`
   entries: `dusk` (the homelab card's sun and plum) and `finance` (Finance Bot's new light).
   *Why:* same mechanism, same tests, same contrast token as the homepage's three artefacts.

6. **Two drawings stay, in frost; the rest retire.** `src/components/stone/DrawingPane.astro`
   renders one Overzicht drawing in a frosted `GlassWindow` (dots, the page title or none) with
   its own hatch and arrow `<defs>`, so the layout's defs can go. It serves pytaiga-mcp
   (`PytaigaDrawing`, glow `cards`) and the henk-exactly-once post (`PostHenkDrawing`, glow
   `henk`). The plot-in stays in `chrome.js` (it already plots every `.dwg`, and draws them at once
   under reduced motion); the drawings' labels lose their paper halo on glass. `HenkDrawing`,
   `BibleDrawing`, `HomelabDrawing`, `SandboxDrawing` and `FinanceDrawing` are deleted with their
   entries in `drawings/index.ts`. *Why:* FINAL-PICKS "Windows per page"; this is the one place
   where glass holds a drawing, so `glass-material`'s "never explains" rule names it.

7. **ANNA's window is one per page.** `AnnaSection`'s window markup is factored into
   `src/components/stone/AnnaWindow.astro` (no behaviour change on the homepage) and reused on
   /projects (beside her lead) and on `/projects/AnnaAssistant` (opening the side, her levels as
   rows under it, then the sticky block). `anna-window.js` binds the one window on each page;
   `?chat=` and `?speed=` work on both routes. *Why:* "One per page" is how the script is written;
   no page has two.

8. **The levels are rows.** `annaLevels` keeps its ids and texts; its names become "Identity",
   "Claude", "MCP connectors", "Operations" (approved). `AnnaLevels.astro` renders them as
   `.stone-rows` (name | text, one column at 760 px and below). On /projects they sit under her
   text; on her page under her window.

9. **/projects is I2e, as sketched, with the three fixes.** `ProjectGlassCard.astro` is
   `RibFull.astro` made real: one link per project, five ribbed panes through `panes.js` (desktop:
   two half panes of 37 ribs each plus the light half masked in over its left 40%; phone: a wash
   pane over the card and the light pane pinned to the bottom, 300 px tall, masked upward), text as
   HTML over it. Fixes: (a) Finance Bot gets its own light in `projectLights` (a new tuning, its
   deep colour at least 30° of hue from every other project's and from the benched mist); the
   other cardless lights (bible-tui amber, pytaiga-mcp teal, Encrypted Chat TUI violet, This site
   warm) move from the sketch's `hues.ts` into `projectLights` as tuned; the hero's three projects
   use their card's light. (b) This site's intro is `ResumePage.mdx`'s `hook`, joined by
   `buildProjects` (register entries gain `text` from their page's hook only where the listing
   asks, `introFromHook: true`). (c) The text column is 60% of the card on a desktop (sketch:
   52%), the light half's mask unchanged. `panes.js` skips panes with no size (the breakpoint's
   hidden panes), so they cost nothing. *Why:* FINAL-PICKS row "/projects".

10. **Page lights are config.** `pageLights` in `glass.ts`: `projects` flame, `blog` tide,
    `resume` sunset, `contact` moss, each a near and a deep colour, from the sketches
    (`r2-bar-hover`, `r2-blog-light`, `r2-resume-light`; /blog takes the tide for both). The bar's
    `::before` per link and the head light (`.page-light`, two radial gradients, 36 px blur,
    `aria-hidden`, `pointer-events: none`, `z-index: -1` in an isolated head) both read them, so a
    page's light is one entry. /blog's per-title hover light uses `projectLights` of the post's
    project. *Why:* FINAL-PICKS "Bar hover colours": "the same light is the page light".

11. **Diagrams: "View larger" by measurement.** `DiagramView.astro` (one native `<dialog>` per
    page with a diagram, a frosted panel, `data-glass-moment="diagram"`) and a small script: for
    each `.henk-flow` and `.sbx` figure it compares the rendered `svg` width with its `viewBox`
    width, and adds the "View larger" button (and makes the diagram itself clickable) only when
    the rendered width is smaller by more than 1 px; it re-measures on resize. The dialog clones
    the svg, opens with `showModal()`, closes on "Close", Escape and a click on the backdrop, and
    returns focus to the button. The dialog is named by the diagram it shows
    (`aria-labelledby` pointing at its copy of the diagram), so it adds no words; its panel sits over the blurred page and is the one
    frosted panel without a `[data-glow]`. The fade is off under reduced motion. The diagrams stay
    line drawings in stone ink with their labels in Archivo. *Why:* FINAL-PICKS "Diagrams"; measuring
    beats a breakpoint because the column width differs per page and width.

12. **Copy single-source on inner pages.** The homepage's covering checker runs on every inner
    route, over `main` and the footer, excluding the MDX prose (`.prose`, which is a content file
    by definition), the two Overzicht drawings' SVG (`.dwg`), the dialog's diagram copy and
    Turnstile's iframe. Landmarks are named by their visible labels (`aria-labelledby`), never by
    a new `aria-label` (the sketches' "About this page", "Contents" and "Diagram" do not ship).
    /resume's joining "at" lives in `pageWords`; because the checker ignores values under three
    letters, the corpus also holds the derived `site.role` plus "at". The corpus gains `pageWords` (new
    `src/config/pages.ts`: the article labels, "On this page", "Other writing", "View larger",
    "Close", "Case study", "Made for fun", the résumé's labels and actions, the contact form's
    labels, "New message", the date and reading formats' words), `resume.ts`, `projectWindows`
    and what `src/lib/article.ts` derives. *Why:* the homepage's rule, on the pages that typed the
    most words into markup.

13. **The drawing-sheet look leaves by deletion, and the files the sketches hold go last.** Each
    page chunk stops using what it replaces and adds a test that no page outside
    `src/pages/sketches/` imports it. The sketches import the drawings index, `DrawingPane` with
    every drawing id, `AnnaPlate`'s config and the overzicht chrome, and Astro builds every route,
    so deleting those files while the sketches exist breaks the build. The final chunk therefore
    removes `src/pages/sketches/` first, then deletes the retired files, then runs every suite and
    stops. Deleted then: the five drawings, `AnnaPlate.astro`, `plate.js`, `scene.js`,
    `depth.js` (with `tests/depth.test.mjs`), `scripts/og-image.mjs` (it imports `scene.js`; the
    PNG it drew stays), `StatStrip.astro`, `DetailCard.astro`,
    `ProjectCard.astro` (overzicht), `scripts/overzicht/pointer.js`, and the drawing-sheet body
    rules in `overzicht.css` (title block, dims ticks, revisions, schedules, stamp, transmittal,
    plate, detail and register cards, crosshair, pencil, hatch). `overzicht.css` keeps the bar,
    menu, footer, skip link, print rules and the two drawings' line styles. *Why:* nothing deploys
    before Ezra's review, and a build that fails mid-way hides real failures.

14. **Tests wait on state, never on time** (as the homepage's): `__glassReady`, `data-play`
    lines landed, ANNA's `done`, `document.fonts.ready`, frame counts. Light-sensitive checks
    freeze it with `?t=`; loop tests load `?guard=off`; ANNA's window is held with `?chat=`; plays
    run at `?speed=10` where only the end state matters.

## Risks / Trade-offs

- **The text column at 1000–1200 px.** The sketch's first grid (`minmax(0, 42rem) minmax(20rem, 36rem)`,
  space-between) left 305 px of text at 1000 px. Fixed in the sketch before the spec review as a build
  decision: proportional tracks 7fr/5fr give text 514 px and side 367 px at 1000, 672 px (capped) and
  ~537 px at 1440.
- **Ribbed panes on /projects** (eight cards, five panes each: 24 drawn on a desktop, 16 on a
  phone) → one context, off-screen pause, the slow-device guard, panes hidden by the breakpoint
  skipped; frame time on a mid Android phone stays a follow-up.
- **Henk's chat, the sandbox's report and bible-tui's reader now show three times** (homepage,
  project page, post) → Ezra's pick; the texts are one config entry each.
- **The Finance Bot window's numbers are invented** (the sketch says so; the wording is the bot's
  own) → approved as written by Ezra; no real financial data is used anywhere.
- **The Homelab window's numbers are a snapshot** of a real run (IPs left out) → approved as
  written; it does not update.
- **Glass on a drawing** (pytaiga-mcp, the henk-exactly-once post, the diagram dialog) edges
  against "glass never explains" → named as the only exceptions in `glass-material`.
- **The sticky block on long pages** may sit beside unrelated text for many screens → it holds
  only small type, never the window.
- **Archive order:** the `MODIFIED` deltas need `stone-glass-homepage` archived first.

## Migration Plan

All on `feat/glass-hero`; nothing ships until Ezra has reviewed the real pages and the drafted
texts, and the branch is merged and deployed with his OK. Rollback is the previous deploy. The
drawings, the plate and the sketches live on in the history (the sketches also in the handoff
folder).

## Open Questions

None block the build. For Ezra at the review stop: the three This site sections and its
description (drafted at build) and Finance Bot's hue (proposal, "Still yours"). The 1000–1200 px
text column is settled (Risks, first item); the review screenshots at 1000 and 1200 only show it.
