# anna-section Specification

## Purpose
TBD - created by archiving change stone-glass-homepage. Update Purpose after archive.
## Requirements
### Requirement: ANNA's copy is what she may do, and for whom
The homepage's ANNA section SHALL show, in this order and as real text: the heading "ANNA" (`annaLead.title`) with the index `01`, the lead line `annaLead.text` followed by a full stop, the heading `annaCalls.heading` ("What she may do, and for whom."), the three rules from `annaCalls.rules` each with its rule, why and how, the onboarding line `annaCalls.closing`, and a link labelled `annaCalls.more.label` to `annaCalls.more.href` (https://anna-site.anamata.ai). Every string MUST come from `src/config/home.ts`.

#### Scenario: The copy, in order
- **GIVEN** the homepage loaded at 1440x900
- **WHEN** the ANNA section's text is read top to bottom
- **THEN** it contains, in order, "ANNA", `annaLead.text + '.'`, "What she may do, and for whom.", the three `rule` strings each followed by its `why` and `how`, `annaCalls.closing`, and `annaCalls.more.label`

#### Scenario: The link to anna-site
- **GIVEN** the ANNA section
- **WHEN** its link is read
- **THEN** its `href` is `https://anna-site.anamata.ai` and its text is `annaCalls.more.label`

#### Scenario: Written in config only
- **GIVEN** the homepage loaded with the conversation at `done`
- **WHEN** the copy check runs over the ANNA section
- **THEN** for every text in it, the message names "ANNA" and "Joris" included, removing the `annaLead`, `annaCalls` and `annaDemo` values it contains as whole words (three letters or more, longest first) leaves no letters

### Requirement: Dropped ANNA stagings stay dropped
The ANNA section SHALL NOT include a production-facts line (versions, release counts, test counts), the four levels, the turned card, the journey, the exploded stack or any glass other than its one Teams window.

#### Scenario: No run line, no levels
- **GIVEN** the homepage loaded
- **WHEN** the ANNA section's text is read
- **THEN** it matches none of `/\bv\d+\.\d+/`, `/\breleases?\b/i`, `/\btests\b/i`, and contains none of the four `annaLevels` names

#### Scenario: One glass object in the section
- **GIVEN** the homepage loaded
- **WHEN** the ANNA section's glass objects are counted
- **THEN** there is exactly one `[data-glass]` element, a frosted window, and no element with class `anna-turn`, `anna-journey`, `anna-x` or `slab`

### Requirement: The Teams window plays "Close my week"
Beside (desktop) or below (phone) the copy, a frosted window titled `annaCalls.window` SHALL hold anna-site's "Close my week" conversation from `src/config/anna-demo.ts`: Joris's request, ANNA's answer, one line of her work (below), her question, Joris's reply typed into the compose box and sent, and her result. Her steps list and the record SHALL NOT be shown, in the window or under it: her result says what she did (Ezra, 2026-11-11). Every beat MUST be in the markup from the start, hidden until it lands. The window SHALL be as tall as the finished conversation from the first frame: nothing in it scrolls, and its size never changes while the conversation plays. The conversation SHALL play once when about 40% of the window is in view (where the window is taller than the screen, as on a short, narrow or zoomed one, when the part in view is about 40% of the screen's height: 40% of a window over 2.5 screens tall never fits at once; Codex review, 2026-11-12), and play again from the start on Replay (`annaCalls.replay`). The `?chat=<seconds>` hold stays on `/` as a test hook. Pacing (Ezra, 2026-11-11: about 8 s to her question was too fast, 22 s too slow): her question SHALL land between 13 and 15 s after the play starts, and the whole play SHALL take at most 23 s.

#### Scenario: The words are anna-site's
- **GIVEN** `src/config/anna-demo.ts` and an anna-site checkout
- **WHEN** the unit test compares each string with anna-site's `week` scenario
- **THEN** every string matches word for word (the test skips when anna-site is not checked out)

#### Scenario: All there before it plays
- **GIVEN** the homepage loaded with the window out of view
- **WHEN** the window's beats are read
- **THEN** every beat from `person` to `result` is in the DOM in timeline order (the work line as the `sources` beat), none is shown, the hidden beats are not announced, and there is no steps list, no record and no `record` beat

#### Scenario: Plays once to the end
- **GIVEN** the homepage loaded
- **WHEN** the window is scrolled into view and the test waits for the window's `done` state
- **THEN** every beat was shown in timeline order, the compose box held the reply typed out before it was sent, every beat lies inside the window's box, the page did not scroll, and no beat is replayed without Replay

#### Scenario: A window taller than 2.5 screens
- **GIVEN** the homepage at 390x260, where the window is more than 2.5 times the viewport's height
- **WHEN** the window is scrolled into view
- **THEN** the conversation starts playing

#### Scenario: The pacing
- **GIVEN** the timeline in a unit test, built from `annaCalls.work.lines` and `annaDemo.reply`
- **WHEN** its beats are read
- **THEN** her question lands between 13 and 15 s, every line of work stays up at least 1.9 s, the whole play takes at most 23 s, and every beat comes at least 0.4 s after the one before

#### Scenario: The window never changes size
- **GIVEN** the homepage at 1440x900, 1280x720 and 390x844
- **WHEN** the conversation is held (`?chat=`) at its start, at each line of work, at her question, while the reply is typed, and at its end
- **THEN** the window's width and height are the same at every moment, and nothing inside it scrolls

#### Scenario: Replay
- **GIVEN** the conversation finished
- **WHEN** Replay is pressed
- **THEN** the beats hide and play again from `person` to `result`

#### Scenario: Reduced motion
- **GIVEN** the homepage loaded with `prefers-reduced-motion: reduce`, or with reduced motion switched on after load, before or during play
- **WHEN** the window comes into view, or is in view
- **THEN** the finished conversation shows at once with every beat visible and the work line settled, nothing is typed into the compose box, and Replay is not shown

#### Scenario: Without JavaScript
- **GIVEN** the homepage loaded with JavaScript off, or with its window script failing to load
- **WHEN** the window is read
- **THEN** every beat shows, the work line reads its settled summary, and there is no Replay

#### Scenario: No focus trap
- **GIVEN** the homepage loaded
- **WHEN** the reader tabs through the ANNA section
- **THEN** focus moves into the window (Replay) and out to the next section's first link; the transcript is a region named `annaCalls.chat`

#### Scenario: Phone
- **GIVEN** the homepage loaded at 390x844
- **WHEN** the ANNA section is laid out and the conversation has played to its `done` state
- **THEN** the window's top is below the copy's bottom, the window lies within 0..390 px horizontally, and the page has no sideways scroll at the section's top, middle and bottom

### Requirement: One line of her work
Under her answer the window SHALL show one line of her work: a small dot that pulses while she works, then text that starts with what she read (`annaCalls.work.lines[0]`: `annaCalls.read` and the sources) and is replaced by each step in turn (`annaCalls.work.lines[1..]`, each short enough for one line on a phone), each line crossfading into the next and staying up for 1.1 s plus 25 ms a character; when her question lands it settles into `annaCalls.work.done` ("4 steps, from 3 sources", the counts taken from `annaDemo`), and the dot stops. The line SHALL be exactly one line at a fixed height at every width: it never wraps, and should a line ever be too long it ends in an ellipsis instead; the shipped copy fits without one at 1440, 1280 and 390 px. Every word comes from config.

#### Scenario: The line of work, in order
- **GIVEN** the homepage loaded with `?chat=` held at the moment each work line is up, and at her question
- **WHEN** the work line is read
- **THEN** it reads `annaCalls.work.lines` in order, then `annaCalls.work.done` once the question has landed

#### Scenario: One line at every width
- **GIVEN** the homepage at 1440x900, 1280x720 and 390x844
- **WHEN** the work line is held at each of its texts
- **THEN** its height is one line and the same for every text, and each text fits its box without an ellipsis

#### Scenario: Settled when still
- **GIVEN** the homepage with reduced motion, or the conversation finished
- **WHEN** the work line is read
- **THEN** it reads `annaCalls.work.done` and its dot does not pulse

### Requirement: ANNA's window stands level with her heading
On a desktop, ANNA's section SHALL keep today's stone above it (its top padding `clamp(120px, 22svh, 220px)`), and her window's top SHALL stand level with the top of her index "01", beside her heading, so the window and the copy balance.

#### Scenario: Level with the heading
- **GIVEN** the homepage at 1440x900 and 1280x720
- **WHEN** the ANNA section is measured
- **THEN** the window's top is within 4 px of the index's top, and the window starts less than 320 px below the bottom of the hero's cards (no stone kept for a one-moment rule)

### Requirement: The four levels live on /projects, not on the homepage
`annaLevels` SHALL be rendered as four rows of type on stone, each its name and its text, in two places: on /projects under ANNA's lead text, and on her project page under her Teams window (Ezra, 2026-11-10: they replace the plate's exploded building). Their names SHALL carry no minus numbers: "Identity", "Claude", "MCP connectors", "Operations" (approved). They SHALL NOT be rendered on the homepage, and no homepage component and no homepage-only config SHALL import `annaLevels`.

#### Scenario: Not on the homepage
- **GIVEN** the homepage loaded
- **WHEN** its text is read
- **THEN** none of the four `annaLevels` texts appears anywhere in it, and none of the four names is the whole text of any element (the names are plain words since 2026-11-10, and "Claude" and "MCP connectors" also occur inside other homepage text, so a name counts as a level only where it is set alone)

#### Scenario: On /projects
- **GIVEN** /projects loaded
- **WHEN** ANNA's lead is read
- **THEN** it shows four rows, their names "Identity", "Claude", "MCP connectors", "Operations" in order, each with its `annaLevels` text, with no glass, canvas or plate around them

#### Scenario: On her page
- **GIVEN** `/projects/AnnaAssistant` loaded
- **WHEN** the right column is read
- **THEN** the same four rows stand under her window

#### Scenario: No minus numbers
- **GIVEN** `annaLevels` in a unit test
- **WHEN** its names are read
- **THEN** they equal `['Identity', 'Claude', 'MCP connectors', 'Operations']` and none matches `/[−-]\d/`

#### Scenario: Nothing on the homepage imports them
- **GIVEN** `src/pages/index.astro`, the homepage's components in `src/components/stone/` (`Hero`, `AnnaSection`, `Projects`, `Experience`, `Writing`, `About`, `Contact`) and `src/config/glass.ts`
- **WHEN** a unit test reads their source
- **THEN** none contains `annaLevels`

