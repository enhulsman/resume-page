## ADDED Requirements

### Requirement: Glass only where something is behind it
The site SHALL use glass only on objects listed in `glassMoments` in `src/config/glass.ts`, which on this change MUST be exactly `hero`, `anna` and `terminal`, in that order. Each moment's root element SHALL carry `data-glass-moment="<id>"` and every glass object SHALL carry `data-glass="ribbed"` (it holds a light) or `data-glass="frosted"` (it holds a window's content). Every canvas and every element with a `backdrop-filter` inside `main` MUST sit inside a `[data-glass-moment]` element. Each frosted window MUST have a glow element (`[data-glow]`, `aria-hidden="true"`) painted beneath it, and each ribbed pane MUST have its light drawn in its canvas. Glass SHALL NOT be used to explain anything: no staging, diagram or level structure is drawn in glass.

#### Scenario: The list in config
- **GIVEN** `src/config/glass.ts`
- **WHEN** a unit test imports `glassMoments`
- **THEN** it equals `['hero', 'anna', 'terminal']`

#### Scenario: The page matches the list
- **GIVEN** the homepage loaded at 1440x900
- **WHEN** the `data-glass-moment` values are read top to bottom
- **THEN** they equal `glassMoments`, and every `canvas` and every element whose computed `backdrop-filter` is not `none` inside `main` has an ancestor (or itself) with `data-glass-moment`

#### Scenario: The kinds
- **GIVEN** the homepage loaded
- **WHEN** the glass objects are read
- **THEN** the hero moment holds exactly four `data-glass="ribbed"` cards, the anna moment exactly one `data-glass="frosted"` window, and the terminal moment exactly one `data-glass="frosted"` window (its reflection minis are ribbed and `aria-hidden`)

#### Scenario: Something behind every window
- **GIVEN** the homepage loaded with `?t=2.4`
- **WHEN** each frosted window is hidden and the area it covered is captured
- **THEN** a `[data-glow]` element sits beneath it, and the captured pixels vary by more than 20 levels (the glow is there, not flat stone)

#### Scenario: No glass anywhere else
- **GIVEN** the homepage loaded
- **WHEN** the Projects, Experience, Writing and Contact sections and the top bar are inspected
- **THEN** none contains a `canvas`, a `[data-glass]` element or an element with a `backdrop-filter`

### Requirement: At most one glass moment per screen
At no scroll position SHALL two glass moments be on screen together, where a moment is on screen when at least one third of its root element's height lies inside the viewport.

#### Scenario: Scrolling the whole page on desktop
- **GIVEN** the homepage loaded at 1440x900 and at 1280x720, with fonts ready and `__glassReady`
- **WHEN** the page is scrolled from top to bottom in steps of one tenth of the viewport height, and at each step the visible share of each `[data-glass-moment]` root is measured
- **THEN** at every step at most one moment has a visible share of one third or more

#### Scenario: Scrolling the whole page on a phone
- **GIVEN** the homepage loaded at 390x844
- **WHEN** the same scroll walk is made
- **THEN** at every step at most one moment has a visible share of one third or more

### Requirement: Ribbed glass touches only the light
A ribbed pane SHALL render the [04] mirrored-strip refraction over its light, and SHALL leave the pane's own ground colour unshaded wherever no light falls, including at the rib seams.

#### Scenario: An unlit pane is its own colour
- **GIVEN** a pane with no light layers on any ground colour
- **WHEN** the model renders it
- **THEN** every pixel equals the ground colour, at rib centres and at seams alike

#### Scenario: A lit seam still reads
- **GIVEN** a light crossing a rib seam
- **WHEN** the model renders it
- **THEN** the seam pixel is darker than the rib centre beside it by more than 5 levels

### Requirement: Text is never drawn into the canvas
Every word and number on a glass object SHALL be real HTML over the glass, and every canvas SHALL carry `aria-hidden="true"`.

#### Scenario: Screen reader reads the card
- **GIVEN** the homepage loaded
- **WHEN** the accessible name of the hero's first card is computed
- **THEN** it contains "ANNA" and "In production", and every canvas on the page has `aria-hidden="true"`

### Requirement: Each pane has its own distance
Each ribbed pane SHALL carry a distance between 0 (the light pressed to the glass) and 1.5, and a layer MAY scale its card's distance (`dist`). The shipped distances SHALL be Ezra's picks: ANNA 0.35, Henk 0.8, Homelab 0.5 with its sun at 0.45 of that, Claude Sandbox 0.45.

#### Scenario: Distance 1 is the study's softness
- **GIVEN** a retuned layer
- **WHEN** it is drawn at distance 1
- **THEN** its edge softness equals the study's fitted softness for that layer

#### Scenario: The shipped picks
- **GIVEN** `glassCards` in `src/config/glass.ts`
- **WHEN** their distances are read in card order
- **THEN** they are 0.35, 0.8, 0.5 and 0.45, and Homelab's sun layer has `dist` 0.45

### Requirement: Soft lights, no panels
The light behind any glass SHALL be soft: a ribbed pane's wash and a window's glow have no hard edge, and outside glass objects no element SHALL have a background colour other than the stone ground, transparent or ink, unless it is smaller than 32 px in both dimensions.

#### Scenario: A window's glow has no edge
- **GIVEN** the homepage loaded with both windows hidden
- **WHEN** a horizontal line of pixels through the centre of each `[data-glow]` element is captured
- **THEN** no two neighbouring pixels on it differ by more than 6 levels in any channel

#### Scenario: No colour panels
- **GIVEN** the homepage loaded at 1440x900
- **WHEN** every element outside `[data-glass-moment]` and `[data-glow]` is inspected
- **THEN** each one's computed background colour is transparent, `#EEEAE3`, or the ink colour, or the element is under 32 px wide or under 32 px tall

### Requirement: One shared loop, still on request
All ribbed panes on a page SHALL run on one shared 10 s loop drawn through one WebGL context. With reduced motion requested, every pane SHALL hold one still frame, also when reduced motion is switched on after load.

#### Scenario: The loop closes
- **GIVEN** a card's light
- **WHEN** the model evaluates it at time t and at t + 10 s
- **THEN** both frames are the same

#### Scenario: Reduced motion
- **GIVEN** the homepage loaded with `prefers-reduced-motion: reduce` and `__glassReady`
- **WHEN** a card's canvas is captured twice, the second capture after `requestAnimationFrame` has run at least 30 times
- **THEN** both captures are identical

#### Scenario: One context for every pane
- **GIVEN** the homepage loaded at 390x844
- **WHEN** the page's WebGL contexts are counted and every ribbed pane's canvas is sampled
- **THEN** there is exactly one WebGL context and every pane, reflection minis included, is lit (its pixels vary by more than 40 levels)

### Requirement: Light pauses when nobody can see it or the device struggles
A ribbed pane SHALL stop redrawing while it is off screen, and the page SHALL switch every pane to its still frame for the rest of the visit when frame times average above 20 ms over 2 s.

#### Scenario: Off screen
- **GIVEN** the homepage loaded with the hero cards drawing
- **WHEN** the page is scrolled so the hero is out of view and the draw count of each card is read before and after 30 animation frames
- **THEN** the hero cards' draw counts do not change until they return into view

#### Scenario: A slow device
- **GIVEN** the homepage loaded with frame times made to exceed 20 ms (a busy loop injected into `requestAnimationFrame`)
- **WHEN** the page reports that the slow-device guard has tripped
- **THEN** every pane shows the still frame and two captures after 30 further frames are identical

### Requirement: Without WebGL the page still works
Without WebGL a ribbed pane SHALL show its ground with a static soft CSS gradient of its light's colour, and all its text and its link SHALL work unchanged.

#### Scenario: WebGL unavailable
- **GIVEN** a browser where `getContext('webgl2')` and `getContext('webgl')` return null
- **WHEN** the homepage loads
- **THEN** no error is thrown, every card link has its `/projects/` href, every card's background varies by more than 10 levels, and both windows still show their content

### Requirement: Every text on glass reads at 4.5:1
Every text on a glass object SHALL have a contrast of at least 4.5:1 against the pixels behind it at every moment of the light's loop. Secondary text on frosted glass (window titles, the Replay button, message names, sources, steps, the record heading and items, the terminal's dim text) SHALL use one shared opaque colour, `--glass-ink-quiet`, defined once in `src/styles/stone.css`; no text on glass SHALL use an alpha-blended colour.

#### Scenario: The token is one opaque colour
- **GIVEN** `src/styles/stone.css` and every stylesheet and `<style>` block used by the homepage
- **WHEN** a unit test reads them
- **THEN** `--glass-ink-quiet` is defined exactly once, as an opaque colour with at least 4.5:1 against `#FFFFFF` and against `#EEEAE3`, and no rule for `.glass-title`, `.msg .who`, `.rec-head`, `.sources`, `.steps`, `.record`, the Replay button or `.terminal-dim` sets a colour with an alpha below 1

#### Scenario: Window text, measured
- **GIVEN** the homepage at 1440x900 with `?t=2.4`, ANNA's conversation finished and the terminal having answered `ls`
- **WHEN** each text element inside both frosted windows has its colour read, the text is made transparent, and the pixels behind each box are sampled from a screenshot
- **THEN** the lowest contrast for every element is at least 4.5:1, the terminal title included

#### Scenario: Card text across the loop
- **GIVEN** the homepage at 1440x900
- **WHEN** the light is drawn at 20 evenly spaced moments of the loop with `__glass.at(t)` and each card's title, index and readout boxes are sampled behind the text
- **THEN** the contrast is at least 4.5:1 at every moment for every card
