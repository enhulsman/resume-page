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
At no scroll position SHALL two glass moments be on screen together. A moment's glass box is the union of the boxes of its `[data-glass]` elements (the hero: its four cards; ANNA: her window; the terminal: its window, which contains the reflection minis); the section around it does not count. A moment is on screen when at least one third of its glass box's height lies inside the viewport. For two moments A above B with glass boxes [a0, a1] and [b0, b1] in page coordinates and heights hA and hB, both can be on screen at once exactly when (b0 + hB/3) - (a1 - hA/3) <= the viewport height, so the page SHALL keep b0 - a1 greater than the viewport height - hA/3 - hB/3 for every pair of neighbouring moments. Meeting this SHALL be done with space and placement only, never by fading or hiding glass.

#### Scenario: The overlap check itself
- **GIVEN** the pure function that takes two glass boxes and a viewport height
- **WHEN** a unit test gives it a hero box [200, 530] and a window box [630, 1230] at a viewport height of 900
- **THEN** it reports an overlap, and with the window box moved to [1150, 1750] it reports none

#### Scenario: Computed from the layout
- **GIVEN** the homepage loaded at 1440x900, at 1280x720 and at 390x844, with fonts ready and `__glassReady`
- **WHEN** each moment's glass box is read from the element offsets, once on load and again after ANNA's conversation reached `done` and the terminal's intro finished
- **THEN** the overlap check reports no overlap for any pair of neighbouring moments at any of the three sizes

#### Scenario: Scrolling the whole page
- **GIVEN** the homepage loaded at 1440x900, at 1280x720 and at 390x844
- **WHEN** the page is scrolled from top to bottom in steps of one tenth of the viewport height and at each step the visible share of each moment's glass box is measured
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
- **WHEN** a horizontal line of pixels through the vertical centre of each window's box, clipped to that box, is captured
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
A ribbed pane SHALL stop redrawing while it is off screen. The page SHALL switch every pane to its still frame for the rest of the visit when drawing is slow. The decision SHALL be a pure function, `slowFrom(samples)` in `src/scripts/glass/guard.js`, over per-frame samples `{ t, interval, draw }` (`t` seconds since `__glassReady`, `interval` the time since the previous frame, `draw` the time spent in the frame's draw calls, all in ms except `t`): it ignores samples with `t` below 1 s, returns false until the eligible samples span at least 2 s (so never before `t` = 3 s), and then returns true when the mean `draw` over the samples of the last 2 s exceeds 20 ms; `interval` never counts. `panes.js` only collects the samples and calls it, and does not sample a frame in which no pane was drawn (every pane off screen), so idle frames do not dilute the average. The guard SHALL have a test switch (`?guard=off` and `window.__glass.guard(false)`), and every e2e test that needs the loop running SHALL switch it off.

#### Scenario: A capped frame rate is not a slow device
- **GIVEN** `slowFrom` in a unit test
- **WHEN** it is given 3 s of samples with 33 ms intervals and 5 ms draws
- **THEN** it returns false

#### Scenario: Expensive drawing is a slow device
- **GIVEN** `slowFrom` in a unit test
- **WHEN** it is given 3 s of samples with 16 ms intervals and 30 ms draws
- **THEN** it returns true

#### Scenario: The first second and the window
- **GIVEN** `slowFrom` in a unit test
- **WHEN** it is given 40 ms draws only before `t` = 1 s followed by 2 s of 5 ms draws, and separately 30 ms draws only more than 2 s before the last sample followed by 2 s of 5 ms draws
- **THEN** it returns false in both cases

#### Scenario: No verdict before a full window
- **GIVEN** `slowFrom` in a unit test
- **WHEN** it is given samples from `t` = 1 s to `t` = 1.2 s with 60 ms draws
- **THEN** it returns false, and with the same draws continued to `t` = 3.1 s it returns true

#### Scenario: Off screen
- **GIVEN** the homepage loaded with `?guard=off` and the hero in view
- **WHEN** each card's draw count (`window.__glass.draws`) is read before and after 30 animation frames, then the hero is scrolled out of view and the counts are read again before and after 30 more frames
- **THEN** the counts rose while in view and did not change while out of view

#### Scenario: The guard is wired
- **GIVEN** the homepage loaded with the guard on and a test hook that adds 30 ms of busy work to every frame's draw
- **WHEN** the test waits until `window.__glass.slow` is true
- **THEN** every pane shows the still frame and two captures after 30 further frames are identical; and with `?guard=off` and the same hook, `__glass.slow` stays false after 4 s of frames and the cards keep changing

### Requirement: Without WebGL the page still works
Without WebGL a ribbed pane SHALL show its ground with a static soft CSS gradient of its light's colour, and all its text and its link SHALL work unchanged.

#### Scenario: WebGL unavailable
- **GIVEN** a browser where `getContext('webgl2')` and `getContext('webgl')` return null
- **WHEN** the homepage loads
- **THEN** no error is thrown, every card link has its `/projects/` href, every card's background varies by more than 10 levels, and both windows still show their content

### Requirement: Every text on glass reads at 4.5:1
Every text on a glass object SHALL have a contrast of at least 4.5:1 against the pixels behind it at every moment of the light's loop. Every text that the lab coloured with an alpha-blended ink (the window titles `.glass-title`, the Replay button, the message names `.msg .who`, `.sources`, the record heading `.rec-head`) and the terminal's dim text (`.terminal-dim`, `#8a8278` today) SHALL use one shared opaque colour, `--glass-ink-quiet`, defined once in `src/styles/stone.css`. Texts that already use a darker opaque ink (`.steps` `#4a453f`, `.record` items `#3a3632`, body text in ink) SHALL keep it. The terminal's red prompt and error text SHALL use one opaque `--glass-ink-red`, defined once in the same file. No text on glass SHALL use an alpha-blended colour.

#### Scenario: The tokens are opaque and defined once
- **GIVEN** `src/styles/stone.css` and every stylesheet and `<style>` block used by the homepage
- **WHEN** a unit test reads them
- **THEN** `--glass-ink-quiet` and `--glass-ink-red` are each defined exactly once as opaque colours with at least 4.5:1 against `#FFFFFF` and `#EEEAE3`, the listed alpha selectors and `.terminal-dim` use `--glass-ink-quiet`, the prompt and error use `--glass-ink-red`, and no colour with an alpha below 1 is set on any text selector inside a glass object

#### Scenario: Window text, measured
- **GIVEN** the homepage at 1440x900 with `?t=2.4`, ANNA's conversation at `done` and the terminal having answered `ls`
- **WHEN** each text element inside both frosted windows has its colour read, the text is made transparent, and the pixels behind each box are sampled from a screenshot
- **THEN** the lowest contrast for every element is at least 4.5:1, the window titles, steps, record items, terminal prompt and terminal dim text included

#### Scenario: Card text across the loop
- **GIVEN** the homepage at 1440x900
- **WHEN** the light is drawn at 20 evenly spaced moments of the loop with `__glass.at(t)` and each card's title, index and readout boxes are sampled behind the text
- **THEN** the contrast is at least 4.5:1 at every moment for every card
