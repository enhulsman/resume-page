## ADDED Requirements

### Requirement: /projects in order
/projects SHALL show, top to bottom (Ezra, 2026-11-10, I2e): the `h1` "Projects" and the line "Detailed write-ups for selected work."; ANNA's lead; the groups "Running", "Paused" and "Done" (`groups` in `home.ts`) as `h2`s, each with one card per project in it (`details` then `register`, in `home.ts` order), every project except ANNA exactly once, This site included; and the side pieces under the heading "Made for fun" (approved), each its address without `https://` as a link and its line from `site.sidePieces`. The heading "Other sheets, drawn for fun" SHALL be gone.

#### Scenario: The order
- **GIVEN** /projects loaded at 1440x900
- **WHEN** its `h1` and `h2`s are read top to bottom
- **THEN** they are "Projects", "ANNA", "Running", "Paused", "Done", "Made for fun"

#### Scenario: Every project once, in its group
- **GIVEN** /projects loaded
- **WHEN** the cards under each group are read
- **THEN** Running holds Henk, Finance Bot, Homelab and This site; Paused bible-tui and Encrypted Chat TUI; Done pytaiga-mcp and Claude Sandbox (by their listing titles, in `home.ts` order); each card links to its project page; ANNA has no card

#### Scenario: Made for fun
- **GIVEN** /projects loaded
- **WHEN** the last section is read
- **THEN** its heading is "Made for fun", it lists every `site.sidePieces` entry as a link to its `url` reading the address without `https://` beside its `line`, and the page does not contain "Other sheets, drawn for fun"

### Requirement: ANNA leads in her window
ANNA's lead SHALL show, on the left: her index "01" in her card's hue ink, her name as an `h2` link to her page, `annaLead.text` as the lead, her `status`, a "Case study" link to her page, and under her text her four levels as rows (`annaLevels`, names without minus numbers); on the right, her Teams window playing "Close my week" as on the homepage (once at about 40% in view, Replay, `?chat=`, `?speed=`, finished under reduced motion). Above 860 px the text and the window stand side by side; at 860 px and below the window comes after the levels. There SHALL be no `AnnaPlate`, no 3D canvas and no plate buttons.

#### Scenario: The lead
- **GIVEN** /projects loaded at 1440x900 with `?chat=` at the timeline's end
- **WHEN** ANNA's lead is read
- **THEN** it shows "01", a link "ANNA" to `/projects/AnnaAssistant`, `annaLead.text`, her status, a "Case study" link, four rows named "Identity", "Claude", "MCP connectors", "Operations" with their texts, and to their right one frosted window titled `annaCalls.window` showing every beat; there is no `.plate`, `.plate-stage` or `canvas` in the lead

#### Scenario: On a phone
- **GIVEN** /projects at 390x844
- **WHEN** the lead is measured
- **THEN** the window's top is below the levels' bottom, it lies within 0..390 px, and the page has no sideways scroll

### Requirement: Each project is one piece of ribbed glass holding its light
Each project SHALL be a card of ribbed glass (Ezra, 2026-11-10, I2e) that is one link to its page: its title as an `h3`, its card index where it has one, its `status`, its intro (`text` for a project in `details`; for This site the hook of `ResumePage.mdx`, approved: "A static-first portfolio at hulsman.dev, built with Astro: plain stone, glass only where something sits behind it, and a fully interactive terminal on the homepage."; for Encrypted Chat TUI its `what`), and its first two `dims` as figures (none for a register entry). The ribs SHALL run across the whole card. Wider than 760 px the card SHALL be two equal ribbed panes side by side (37 ribs each, so the ribs join without a break), the text on the left over a faint wash, the light in the right half fading in over its left 40%, and the text column 60% of the card's width (the sketch's 52%, made a bit wider: Ezra's fix). At 760 px and below a wash pane SHALL span the card and the light pane, as wide as the card, be pinned to its bottom at 300 px tall and masked upward, the text keeping 84 px clear above the bottom edge. Every pane SHALL be drawn through the one shared WebGL context by `panes.js`; a pane hidden at the current width SHALL NOT be drawn. Every word on a card is HTML; every canvas is `aria-hidden`. On hover or focus a card rises 3 px; not under reduced motion.

#### Scenario: A card's contents
- **GIVEN** /projects loaded at 1440x900
- **WHEN** Henk's card and This site's card are read
- **THEN** Henk's is one link to `/projects/Henk` holding "Henk, homelab agent" (its listing title), "02", its status, its `text` and the figures "4" and "3,660" with their labels; This site's holds "This site", its status and the approved hook as its intro, and no figures

#### Scenario: Two per row, then one
- **GIVEN** /projects at 1440x900, at 999x900 and at 390x844
- **WHEN** the cards are measured
- **THEN** at 1440 and 999 two cards share each row; at 390 each row has one card, as wide as the content column, within 0..390 px

#### Scenario: The text column
- **GIVEN** /projects at 1440x900
- **WHEN** each card's text column and the card are measured
- **THEN** the text column's width is 60% of the card's (within 1%), and the light's pane starts at the card's middle

#### Scenario: The light keeps its band on a phone
- **GIVEN** /projects at 390x844
- **WHEN** each card's text and its light pane are measured
- **THEN** the light pane is as wide as the card, 300 px tall, its bottom at the card's bottom, and the lowest text (the figures, or the intro where there are none) ends at least 84 px above the card's bottom

#### Scenario: One context, and only what shows
- **GIVEN** /projects loaded at 1440x900 with `?guard=off`, and again at 390x844
- **WHEN** the page's WebGL contexts are counted and each pane's draw count (`__glass.draws`) is read before and after 30 frames with every card scrolled into view in turn
- **THEN** there is exactly one context; panes visible at that width are lit and drawn; panes hidden at that width (`display: none`) are never drawn

#### Scenario: Still on request
- **GIVEN** /projects loaded with reduced motion and `__glassReady`
- **WHEN** a card is captured twice, 30 frames apart, and a card is hovered
- **THEN** the captures are identical and the hovered card does not move

### Requirement: Each project has its own light; Finance Bot has its own hue
The cards' lights SHALL come from `projectLights` in `src/config/glass.ts`, one per project: the hero's three projects (Henk, Homelab, Claude Sandbox) their card's light; bible-tui amber, pytaiga-mcp teal, Encrypted Chat TUI violet and This site a warm light (as tuned in the sketches); and Finance Bot a light of its own (Ezra's fix), no longer the benched grey-blue mist: its deep colour at least 30 degrees of hue away from every other project light's deep colour and from the mist, and saturated (HSL saturation at least 0.25). Without WebGL each card SHALL show its ground with a soft gradient of its light's colour.

#### Scenario: Lights in config
- **GIVEN** `projectLights` and `glassCards` in a unit test
- **WHEN** they are read
- **THEN** there is one light per project except ANNA (eight), Henk's, Homelab's and Claude Sandbox's are their hero card's, and no two projects share a light

#### Scenario: Finance Bot's own hue
- **GIVEN** `projectLights.finance`, the other project lights and the benched mist card in a unit test
- **WHEN** their deep colours are converted to HSL
- **THEN** Finance Bot's hue differs from each of the others' and the mist's by at least 30 degrees, and its saturation is at least 0.25

#### Scenario: Without WebGL
- **GIVEN** /projects in a browser where `getContext('webgl2')` and `getContext('webgl')` return null
- **WHEN** the page loads
- **THEN** no error is thrown, every card links to its page, and every card's background varies by more than 10 levels

### Requirement: Every word on a card reads at 4.5:1
Every text on a ribbed card (title, index, status, intro, figures and their labels) SHALL have at least 4.5:1 contrast against the pixels behind it at every moment of the light's loop, at 1440 and at 390 px.

#### Scenario: Measured across the loop
- **GIVEN** /projects at 1440x900 and at 390x844
- **WHEN** every card's text is made transparent, the light is drawn at t = 0, 1.5, 3, 4.5, 6, 7.5 and 9 s (`__glass.at(t)`) with one screenshot of the page per moment, and the pixels behind each text box are sampled from those screenshots
- **THEN** the lowest contrast of every text element is at least 4.5:1 at every moment
