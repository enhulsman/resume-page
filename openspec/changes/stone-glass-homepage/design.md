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
   `glassMoments = ['hero', 'anna', 'terminal']`. Each moment's root element carries
   `data-glass-moment="<id>"`; each glass object carries `data-glass="ribbed"` or
   `data-glass="frosted"`. Tests compare the page against the list, so a new object is one config
   line plus the same tests. *Why:* Ezra keeps the list open; the test is the gate, not memory.

2. **One moment per screen, made measurable.** A moment is on screen when at least a third of its
   root's height is inside the viewport. At no scroll position may two moments be on screen. The
   layout earns this with space, not by hiding anything: the ANNA section opens with its copy
   (heading, lead, rules) and its window sits beside the rules, low enough that the hero cards are
   under a third visible before the window passes a third. The terminal sits after the notes.
   *Alternative rejected:* fading glass in and out on scroll; that is motion used to explain.

3. **Ribbed panes: one driver, from the lab.** `hero.js` is copied to `panes.js`, which mounts
   every `[data-glass="ribbed"]` on the page through the one shared WebGL context, keeps the 10 s
   loop, the still frame at 2.4 s for reduced motion, the off-screen pause, `?t=` and
   `window.__glass`/`__glassReady` for tests. Dropped from the copy: the distance dial, the
   `look=before` path and the `paneFor`/`redrawPane` hooks (only the stagings used them). Added: the
   slow-device guard (rolling frame time above 20 ms over 2 s draws the still frame and stops the
   loop for the visit) and the no-WebGL fallback (each pane's CSS ground plus a soft radial gradient
   of its light's colour, computed at build time from `glassCards`). Model features only the
   stagings used (ink, eight layers, slide and turn) stay in `model.js`/`shader.js` with their unit
   tests; they cost nothing at runtime.

4. **Frosted windows: one component, two contents.** `GlassWindow.astro` renders the frosted body
   (translucent ground, backdrop blur, light rim, title bar) and a glow beneath it (`data-glow`,
   `aria-hidden`), a few soft radial gradients with no hard edge. ANNA's window glows in the flame's
   colours; the terminal's in the four card colours, as in the lab. The terminal keeps the lab's
   faint upside-down reflection of the four cards along its inside top edge (four mini ribbed panes,
   decoration, `aria-hidden`, inside the terminal moment).

5. **One shared contrast fix: an opaque quiet ink.** `stone.css` defines `--glass-ink-quiet`, an
   opaque warm grey (start at `#5C5650`, about 7:1 on white), used by every secondary text on glass:
   window titles, the Replay button, message names, sources, steps, the record heading and items,
   the terminal's dim text. The hero cards' title, index and readout stay full ink. No text on glass uses an
   alpha-blended ink, because its contrast then depends on whatever glows behind it. If the measured
   contrast test fails anywhere, the token darkens; nothing else changes. The terminal's red prompt
   (`#B4432B`) also has to pass over the glow; if it does not, it takes the token too.

6. **ANNA's section is the lab's window staging, minus the lab.** Left: `h2` "ANNA",
   `annaLead.text`, `annaCalls.heading`, the three rules (rule, why, how), `annaCalls.closing`, and
   `annaCalls.more` linking to https://anna-site.anamata.ai. Right: the window, titled
   `annaCalls.window`, playing `annaDemo` once when about 40% in view, with Replay. `anna-window.js`
   and `anna-window-model.js` are reused as they are; the conversation's beats are all in the markup
   from the start. The section shows `01`, the ANNA card's index, beside its heading.

7. **Projects as rows of type.** Every project except ANNA and `hideOnHome` ones, hero-card
   projects first in card order carrying their card index (02 Henk, 03 Homelab, 04 Claude Sandbox),
   then the rest in `home.ts` order (Finance Bot, bible-tui, pytaiga-mcp, then the register). A row:
   index if any, title, `what`, status from frontmatter, and its first dimension's value set large in
   tabular figures with its label beside it (the register's entries have no number). Index numbers
   may take the hue of their card's light: colour only as that small mark.

8. **Experience, Writing, About, Contact.** Experience: each `resume.ts` entry as years
   (`startDate`–`endDate`, or `startDate`–now), role and company, hairline rules, link to /resume.
   Writing: the five newest published posts (no leading underscore), title, date, description, link
   to /blog. About: `notes`, the site photo plain (alt from config), and the terminal window.
   Contact: `site.social.email` set large as a mailto link, then the contact page, LinkedIn and
   GitHub as type. Section headings and link labels live in `home.ts` (`homeSections`).

9. **Copy single-source, enforced by a scan.** `tests/single-source.test.ts` gains a test that reads
   `src/pages/index.astro` and every `src/components/stone/*.astro`, removes frontmatter, comments,
   `<style>`, `<script>` and `{...}` expressions, and finds no letters left between tags or in
   `alt`, `title` and `aria-label` values. The existing project-fact tests stay as they are.

10. **Reduced motion is a still page.** Lights hold the still frame; the conversation shows
    finished with no Replay; the terminal prints its intro at once with a steady caret; no CSS
    transition moves anything. Switching reduced motion on after load does the same at once.

11. **Chrome.** `OverzichtLayout` stays the one layout. Its bar ("EH." mark, Projects, Blog,
    Résumé, Contact, "Get in touch") and footer move to stone and Archivo; the theme script, button
    and dark rules go; inner page bodies keep their `overzicht.css` layout with colour variables
    mapped to stone.

12. **Order of work: homepage first, lab last.** New code lives in new files while the lab still
    runs, so the lab's tests stay green until the last chunk removes the lab, its scripts, its
    tests and the lab-only exports of `glass.ts` (`h2Card`, `annaExploded`, `AnnaPane`,
    `AnnaVariant`, the `before` look). Retired drawing-sheet homepage code is deleted, not parked;
    `AnnaPlate`/`plate.js` stay for /projects.

13. **Tests wait on state, never on time.** swiftshader renders slowly: e2e tests wait on
    `__glassReady`, on the window's `done` state, on terminal output, on `fonts.ready`, never on a
    fixed sleep. Frame-sensitive checks freeze the light with `?t=` or `__glass.at(t)`.

## Risks / Trade-offs

- **The one-moment rule costs space** between the hero and ANNA's window; on a 1280x720 screen the
  stretch may look empty → the copy column fills it; Ezra judges it on the real page.
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

None block the build. For Ezra's morning look: the space the one-moment rule leaves under the hero,
whether the three hero projects should also be rows, and whether the terminal's reflection stays.
