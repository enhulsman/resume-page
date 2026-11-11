## MODIFIED Requirements

### Requirement: Glass only where something is behind it
The site SHALL use glass only on objects listed in config: on the homepage the moments in `glassMoments` in `src/config/glass.ts`, which on this change MUST be exactly `hero`, `anna`, `henk`, `sandbox`, `bible` and `terminal`, in that order (top to bottom in the page); on every inner page the moments its route lists in `innerGlass` in the same file (`stone-inner-pages`). Each moment's root element SHALL carry `data-glass-moment="<id>"` and every glass object SHALL carry `data-glass="ribbed"` (it holds a light) or `data-glass="frosted"` (it holds a window's content). Every canvas and every element with a `backdrop-filter` inside `main` MUST sit inside a `[data-glass-moment]` element. Each frosted window MUST have a glow element (`[data-glow]`, `aria-hidden="true"`) painted beneath it (the one exception is the "View larger" dialog's panel, whose "behind" is the blurred page), and each ribbed pane MUST have its light drawn in its canvas. Glass SHALL NOT be used to explain anything: no staging, diagram or level structure is drawn in glass, with four exceptions Ezra chose: pytaiga-mcp's Overzicht drawing and the henk-exactly-once post's drawing, each shown as an exhibit in a frosted pane (`pytaiga`, `post-drawing`; 2026-11-10); a diagram, or one of those two drawings, shown enlarged in the "View larger" dialog's frosted panel (`diagram`; 2026-11-10); and Henk's trust-boundary diagram, whose boundary is one frosted pane with Henk's light behind it and the drawing's ink in front (`henk-boundary`; 2026-11-12, `stone-project-pages`). Claude Sandbox's diagram in the prose and ANNA's levels stay type and line on stone.

#### Scenario: The list in config
- **GIVEN** `src/config/glass.ts`
- **WHEN** a unit test imports `glassMoments`
- **THEN** it equals `['hero', 'anna', 'henk', 'sandbox', 'bible', 'terminal']`

#### Scenario: The page matches the list
- **GIVEN** the homepage loaded at 1440x900
- **WHEN** the `data-glass-moment` values are read top to bottom
- **THEN** they equal `glassMoments`, and every `canvas` and every element whose computed `backdrop-filter` is not `none` inside `main` has an ancestor (or itself) with `data-glass-moment`

#### Scenario: The kinds
- **GIVEN** the homepage loaded
- **WHEN** the glass objects are read
- **THEN** the hero moment holds exactly four `data-glass="ribbed"` cards, the anna, henk, sandbox and bible moments exactly one `data-glass="frosted"` window each, and the terminal moment exactly one `data-glass="frosted"` window (its reflection minis are ribbed and `aria-hidden`)

#### Scenario: Something behind every window
- **GIVEN** the homepage loaded with `?t=2.4`
- **WHEN** each frosted window is hidden and the area it covered is captured
- **THEN** a `[data-glow]` element sits beneath it, and the captured pixels vary by more than 20 levels (the glow is there, not flat stone)

#### Scenario: No glass anywhere else
- **GIVEN** the homepage loaded
- **WHEN** the Projects section's rows (everything in Projects outside its three project moments), the Experience, Writing and Contact sections and the top bar are inspected
- **THEN** none contains a `canvas`, a `[data-glass]` element or an element with a `backdrop-filter`

#### Scenario: Only the four exceptions hold a drawing
- **GIVEN** every inner route loaded at 390x844, the diagram dialog opened through "View larger" where a page has one
- **WHEN** every `svg` inside a `[data-glass]` element is listed
- **THEN** each is pytaiga-mcp's drawing (moment `pytaiga`), the henk-exactly-once post's drawing (moment `post-drawing`), Henk's trust-boundary diagram (moment `henk-boundary`) or a copy of a page's diagram or pane drawing inside its open dialog (moment `diagram`), apart from the window dots and icons; no other diagram in the prose and none of ANNA's levels has a `[data-glass]` ancestor
