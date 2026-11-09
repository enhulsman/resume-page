## ADDED Requirements

### Requirement: Glass touches only the light
A glass pane SHALL render the [04] mirrored-strip refraction over its light, and SHALL leave the pane's own ground colour unshaded wherever no light falls, including at the rib seams.

#### Scenario: An unlit pane is its own colour
- **WHEN** a pane with no light layers is rendered on any ground colour
- **THEN** every pixel equals the ground colour, at rib centres and at seams alike

#### Scenario: A lit seam still reads
- **WHEN** a light crosses a rib seam
- **THEN** the seam pixel is darker than the rib centre beside it by more than 5 levels

### Requirement: Text is never drawn into the canvas
Every word and number on a glass pane (title, index, readout) SHALL be real HTML over the canvas, and the canvas SHALL be hidden from assistive technology.

#### Scenario: Screen reader reads the card
- **WHEN** the hero's ANNA card is read by assistive technology
- **THEN** its accessible name contains "ANNA" and "In production", and no canvas is announced

### Requirement: Each pane has its own distance
Each pane SHALL carry a distance between 0 (the light pressed to the glass, hard edges) and 1.5 (softer than the study), and a layer MAY scale its card's distance (`dist`). The shipped distances SHALL be Ezra's picks: ANNA 0.35, Henk 0.8, Homelab 0.5 with its sun at 0.45 of that, Claude Sandbox 0.45.

#### Scenario: Distance 1 is the study's softness
- **WHEN** a retuned layer is drawn at distance 1
- **THEN** its edge softness equals the study's fitted softness for that layer

#### Scenario: The shipped picks
- **WHEN** the hero's cards are read from config
- **THEN** their distances are 0.35, 0.8, 0.5 and 0.45 in card order

### Requirement: One shared loop, still on request
All panes on a page SHALL run on one shared 10 s loop. With reduced motion requested, every pane SHALL hold one still frame.

#### Scenario: Reduced motion
- **WHEN** the homepage loads with `prefers-reduced-motion: reduce`
- **THEN** two captures of any pane 600 ms apart are identical

#### Scenario: The loop closes
- **WHEN** a pane is evaluated at time t and at t + 10 s
- **THEN** both frames are the same

### Requirement: Light pauses when nobody can see it or the device struggles
A pane SHALL stop redrawing while it is off screen or the tab is hidden, and the page SHALL switch every pane to its still frame when frames run slow (an average above 20 ms over 2 s).

#### Scenario: Off screen
- **WHEN** a pane is scrolled out of view
- **THEN** its canvas is not redrawn until it returns

#### Scenario: A slow device
- **WHEN** frame times average above 20 ms over 2 s
- **THEN** every pane holds its still frame for the rest of the visit

### Requirement: Without WebGL the page still works
Without WebGL a pane SHALL show its ground with a static CSS approximation of its light, and all its text and its link SHALL work unchanged.

#### Scenario: WebGL unavailable
- **WHEN** the homepage loads in a browser where `getContext('webgl2')` returns null
- **THEN** no error is thrown, every card link works, and every card shows a non-flat background

### Requirement: The readout stays legible
Behind each pane's readout band the light SHALL fade toward the ground, so the readout text keeps a contrast of at least 4.5:1 at every moment of the loop.

#### Scenario: Readout contrast across the loop
- **WHEN** a card is sampled behind its readout at 20 moments of the loop
- **THEN** the contrast between the readout text and the sampled pixels is at least 4.5:1 at each
