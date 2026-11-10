## For Ezra

**Your decisions (made 2026-11-10), binding on this change:**

- Glass only on an object with something behind it, never to explain anything.
- At most one glass moment on any screen; the list of glass objects stays open for a new object that passes that test.
- Ribbed glass holds a light (the hero's four cards, H3); frosted glass holds a window's content (the ANNA Teams window, the terminal). Everything else is type on stone.
- ANNA's section: the lead line, "What she may do, and for whom." with the three rules, the onboarding line, a link to anna-site.anamata.ai, and the frosted Teams window playing anna-site's "Close my week".
- ANNA's four levels leave the homepage and stay on /projects.
- Dropped: the glare on the name, the contact glass strip, the "run" facts line, every ANNA layer staging (turn, journey, stack) and the "words" staging.
- Peter and Bas have OK'd all ANNA material on the portfolio; everything anna-site says is live.
- Copy comes only from config files, checked by the single-source test.
- Every text on glass reaches 4.5:1 contrast, through one shared fix.
- No data-dot boards, hard or literal shapes, or colour panels; soft far-behind-glass lights.
- The lab page and the rejected stagings are removed last, once the homepage carries everything.

**Still standing from 2026-11-09:** the stone top bar, footer, colours and type go on every page
(inner page bodies keep their layout); dark mode is dropped until after the light redesign; the
drawing-sheet look leaves the homepage (no arrival, title block, stamp or 3D scene).

**Skipped:** the grey-box wireframe of the whole page was skipped so the night run could build the
real page; you judge the real page instead.

**Calls made overnight that you may want to reverse:**

1. **Henk, Homelab and Claude Sandbox show twice:** as hero cards and again as rows in Projects,
   numbered 02 to 04 like their cards. The inventory's example numbers (`4` egress ports) and its
   "index numbers carry into the sections" line point that way. To reverse: drop them from the list.
2. **Left off the homepage because the inventory does not list them:** the side pieces (flag,
   sleep, wordle), the skills and education lines, and the contact message. They stay in config
   and on /resume and /contact.
3. **The terminal keeps the lab's faint upside-down reflection of the four cards** along its top edge.
4. **With reduced motion the terminal shows its intro at once** instead of typing it (new).
5. **New copy, in config:** the section headings "Projects", "Experience", "Writing", "About",
   "Contact", the links "See all projects", "Full résumé", "All writing", "now" for a current
   job's end year, and the photo's alt text "Ezra Hulsman, photographed from below" (the current
   alt, moved). The hero's role and intro lines move from the lab page into config unchanged.
6. **"One glass moment per screen" is tested as:** never two glass objects with a third or more of
   their height on screen together. That leaves a deliberate stretch of stone between the cards and
   ANNA's window.
7. **Writing shows the five newest posts** and a link to /blog.

**What a visitor of the homepage sees change:**

- The page arrives at once: no drawing being plotted, no title block. Warm stone, black type.
- At the top: the name as plain type, the intro line, and four ribbed glass cards (ANNA, Henk,
  Homelab, Claude Sandbox) with slow soft lights behind them, each a link to its project page.
- Then ANNA: who she is in one line, what she may do and for whom in three rules, how new
  connectors arrive, a link to anna-site, and beside it a frosted Teams window where a real
  conversation ("Close my week") plays once as it comes into view, with a Replay button.
- Then the other projects as quiet rows of type, each with its strongest number set large;
  experience as years, role and company; the newest writing; About with the notes, the photo and
  the live terminal in a frosted window; contact as the e-mail address set large.
- ANNA's four levels are no longer on the homepage; they stay on /projects.
- Glass appears in three places only, never two on one screen. Anyone who asks for reduced motion
  gets a still page: still lights, the conversation finished, the terminal's intro already there.
- On a phone the cards scroll in their own row, ANNA's window sits under her copy, and the page
  never scrolls sideways.
- Every page gets the stone bar and footer; the theme button and dark theme go.
- `/hero-lab` stops existing.

## Why

Card run 7 and the 2026-11-10 page rethink settled the direction: the H3 hero (four ribbed glass
cards, prototyped and tuned in `/hero-lab` on `feat/glass-hero`), a page of type on stone under it,
and glass only where an object really has something behind it. The ANNA Teams window and the
terminal window are proven in the lab. The homepage today is the drawing-sheet design, so the
hero cannot ship on its own: the page under it has to speak the same language.

## What Changes

- **New homepage** in stone and glass, in this order: hero, ANNA, Projects, Experience, Writing,
  About, Contact. Every word and number comes from `src/config/home.ts`, `site.ts`, `resume.ts`,
  `anna-demo.ts`, `glass.ts`, project frontmatter or blog frontmatter.
- **Three glass moments, listed in config** (`glassMoments` in `src/config/glass.ts`): the hero
  cards (ribbed), ANNA's Teams window (frosted), the terminal window (frosted). A new glass object
  is added to that list and passes the same tests.
- **The glass leaves the lab:** `glass.ts`, `scripts/glass/*` (model, shader, the shared-context
  pane driver), the ANNA window and the terminal window become site components.
- **One shared contrast fix:** a single opaque quiet-ink colour for every secondary text on glass,
  replacing the alpha-blended inks (the terminal title's 0.55 and the window's 0.66).
- **ANNA's section** is the window staging from the lab; `annaLevels` is used on /projects only.
- **Shared chrome** on every page: stone colours, Archivo, the new top bar and footer; no theme
  button, no dark theme. **BREAKING** for the drawing-sheet look of inner pages' chrome.
- **Retired:** the arrival (`intro.js`), the 3D scene (`scene.js`, the homepage `main.js`), the
  homepage sheets (`YouSheet`, `AnnaSection`, `DetailsSheet`, `RegisterSheet`, `RevisionsSheet`,
  `NotesSheet`, `ContactSheet`), and last `/hero-lab` with the H2 variant, the glare and the
  turn, journey and stack stagings.

## Capabilities

### New Capabilities

- `glass-material`: what may be glass, the two kinds (ribbed, frosted), the one-moment rule, the
  light's loop, still frame, pausing and fallbacks, and text contrast on glass.
- `stone-homepage`: the homepage's sections, order, sources and layout, the hero's fit, phone
  width, reduced motion for the whole page, the single-source copy rule, the shared chrome, and the
  retirement of the drawing-sheet homepage and the lab.
- `anna-section`: ANNA's copy, her Teams window and its conversation, and the four levels living
  on /projects instead of the homepage.

### Modified Capabilities

(none: `openspec/specs/` is empty; the drawing-sheet pages were never specified)

## Impact

- **Files:** `src/pages/index.astro`; new `src/components/stone/*` (hero, ANNA section and window,
  projects, experience, writing, about with the terminal window, contact); new
  `src/styles/stone.css`; `src/scripts/glass/panes.js` (from `hero.js`); `src/config/glass.ts`
  (moments list, lab-only exports removed); `src/config/home.ts` (section headings, photo alt);
  `src/layouts/OverzichtLayout.astro`, `Bar.astro`, `Foot.astro` (chrome); deletions listed above.
- **Tests:** new `tests/glass-home.test.mjs`, `tests/glass-home.e2e.mjs`,
  `tests/glass-chrome.e2e.mjs`, `tests/glass-retired.test.mjs`, `tests/glass-retired.e2e.mjs`;
  `tests/glass-hero.e2e.mjs`, `glass-anna-window.e2e.mjs` and `glass-terminal.e2e.mjs` move from
  `/hero-lab` to `/`; `tests/single-source.test.ts` gains the homepage copy scan; the lab-only and
  drawing-sheet homepage tests go; `package.json` runs the glass suites.
- **Performance:** every pane draws through one shared WebGL context (already so in the lab), so
  four cards plus four reflection minis cost one context. Device pixel ratio capped at 2; light
  pauses off screen and holds still on slow devices.
- **No new dependencies.** No change to the Worker, the contact form or the PDF résumé.
