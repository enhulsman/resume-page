# stone-project-pages Specification

## Purpose
TBD - created by archiving change stone-inner-pages. Update Purpose after archive.
## Requirements
### Requirement: A project page opens like its chapter
Each project page's head SHALL show, in order: its hero card's index in that card's hue ink (`hueInk`: ANNA 01, Henk 02, Homelab 03, Claude Sandbox 04; other projects have none), the title (`title` frontmatter) as the `h1` in Archivo 900, and the `hook` as the lead (Ezra, 2026-11-10, P1).

#### Scenario: Henk's head
- **GIVEN** `/projects/Henk` loaded at 1440x900
- **WHEN** the head is read
- **THEN** it shows "02" in the colour `hueInk` gives Henk's card, then the `h1` reading Henk.mdx's `title`, then its `hook` verbatim

#### Scenario: A project without a card
- **GIVEN** `/projects/FinanceBot` and `/projects/EncryptedChatTUI` loaded
- **WHEN** the head is read
- **THEN** there is no index before the `h1`, and the lead is the page's `hook`

### Requirement: The facts are plain type from frontmatter
A project's facts SHALL be, each a label above its value, in this order and only where the frontmatter has them: `dateLabel` with the `date` as month and year in English ("July 2026"), "Stack" with `tech` joined by ", ", "Code" with the `github` link shown without its scheme, "Preview" with the `preview` link shown without its scheme. The labels come from `pageWords`. They sit in the article's sticky block.

#### Scenario: bible-tui's facts
- **GIVEN** `/projects/BibleTui` loaded at 1440x900
- **WHEN** the facts are read
- **THEN** they are "Online since" / "April 2026", "Stack" / "Rust, ratatui, crossterm, ratzilla, WebAssembly, postcard", "Code" / a link to `https://github.com/enhulsman/bible-tui` reading "github.com/enhulsman/bible-tui", and "Preview" / a link to `https://bible.hulsman.dev` reading "bible.hulsman.dev"

#### Scenario: Built from frontmatter
- **GIVEN** `factsOf` from `src/lib/article.ts` in a unit test, with a frontmatter lacking `github` and `preview`
- **WHEN** it builds the facts
- **THEN** it returns only the date and Stack facts, with labels equal to `pageWords`' values

### Requirement: The numbers are the page's own
A project page's numbers SHALL be its `stats` frontmatter (moved verbatim from the `StatStrip` that Henk.mdx and BibleTui.mdx carried in their text), or else its listing's first three `dims` in `home.ts`, or none (ANNA, Encrypted Chat TUI, This site). They SHALL be set as the homepage's figures (a large tabular number with its label), never as dimension lines with ticks. `StatStrip` SHALL no longer appear in any MDX body.

#### Scenario: Henk's numbers
- **GIVEN** `/projects/Henk` loaded
- **WHEN** the numbers are read
- **THEN** they are, as value and label pairs in this order: ("3,660", "tests, SDK mocked out"), ("1", "owner; everyone else is dropped"), ("4", "egress ports, zero inbound"), ("exactly once", "event replay across restarts"); and no prose `dl.dims` remains

#### Scenario: Numbers from the listing
- **GIVEN** `/projects/HomelabInfrastructure` loaded
- **WHEN** the numbers are read
- **THEN** they are "4" machines, one mesh; "7" scrape targets; "19" alert rules, in Grafana

#### Scenario: No ticks, no numbers where there are none
- **GIVEN** every project page loaded
- **WHEN** each number's `::before` and `::after` are inspected, and `/projects/AnnaAssistant`, `/projects/EncryptedChatTUI` and `/projects/ResumePage` are read
- **THEN** no number has a pseudo-element with content (no dimension ticks), the three pages show no numbers list, and no file under `src/pages/` contains `<StatStrip`

### Requirement: Each project page holds its own window
Each project page SHALL show the window `innerGlass` names for its route, at the top of the article's right column (Ezra, 2026-11-10, "glass holds something real"): Henk the Signal chat (`projectWindows.henk`), Claude Sandbox the session report (`projectWindows.sandbox`), bible-tui the reader (`projectWindows.bible`), Homelab the `homelab-health` terminal (`projectWindows.homelab`), Finance Bot the Discord `/upload` reply (`projectWindows.finance`), pytaiga-mcp its Overzicht drawing in a frosted pane, ANNA her Teams window. Encrypted Chat TUI and This site SHALL have no window. Each window SHALL be a `GlassWindow` (frosted, with its glow beneath and the frost's grain), and its lines SHALL land once, when it is half in view, through `artefacts.js` (`?speed=` applies); with reduced motion, or without JavaScript, they show finished.

#### Scenario: The window per page
- **GIVEN** each project page loaded at 1440x900
- **WHEN** the article's right column is read
- **THEN** Henk's holds one frosted window titled `projectWindows.henk.title`, Claude Sandbox's `projectWindows.sandbox.title`, bible-tui's `projectWindows.bible.title`, Homelab's "ezra@workstation: ~", Finance Bot's "Discord · #finance", pytaiga-mcp's a frosted pane holding a `.dwg` drawing, ANNA's `annaCalls.window`; Encrypted Chat TUI's and This site's hold no `[data-glass]`

#### Scenario: The lines land once
- **GIVEN** `/projects/FinanceBot` loaded at 390x844 with the window out of view
- **WHEN** the window's lines are read, then the window is scrolled half into view and the test waits until every line is shown
- **THEN** before, the lines are hidden; after, every line is shown, and scrolling away and back hides none of them

#### Scenario: Still and without JavaScript
- **GIVEN** `/projects/HomelabInfrastructure` loaded with reduced motion, and again with JavaScript off
- **WHEN** the window is read on arrival
- **THEN** every line shows at once

#### Scenario: Henk's chat, as on the homepage
- **GIVEN** `/projects/Henk` loaded with `?speed=10` and the window landed
- **WHEN** its text is read
- **THEN** it holds `projectWindows.henk`'s alert and messages verbatim, the same text as the homepage's Henk window

### Requirement: Homelab's window is its own health check
Homelab's window SHALL be `homelab-health` in a terminal (Ezra, 2026-11-10, H1, text approved as written): title "ezra@workstation: ~", three window dots, the glow of the homelab card's sunset (`windowGlows.dusk`), monospace from 12 px down to 10 px as the window narrows, so a row stays one line wherever 10 px allows, the text in `projectWindows.homelab`, verbatim, line by line (marker | host | text; spacing inside the text kept):

| Marker | Host | Text |
|---|---|---|
| `$` | | `homelab-health` |
| | | `=== Homelab Health ===` |
| `[+]` | `workstation` | `load:0.82  mem:8975/15994MB disk: 41% docker:NA  (this machine)` |
| `[+]` | `rp5` | `load:1.28  mem:3508/8063MB  disk: 46% docker:19  dns:ok` |
| `[!]` | | `hygiene: journal 3686MB` |
| `[+]` | `vps` | `load:0.43  mem:2039/3819MB  disk: 73% docker:19  dns:ok` |
| | | `hygiene: ok` |
| `[+]` | `rp2` | `load:0.37  mem:422/921MB    disk: 73% docker:NA  dns:ok` |
| | | `hygiene: ok` |
| `[+]` | | `Prometheus: all targets up` |

The window SHALL hold no IP address, token, key or internal path, and no host names beyond workstation, rp5, vps and rp2. At 760 px and below its lines MAY wrap (`pre-wrap`) and the empty host column folds away; the window never scrolls the page sideways.

#### Scenario: The output, verbatim
- **GIVEN** `projectWindows.homelab` in a unit test, and `/projects/HomelabInfrastructure` loaded with `?speed=10`
- **WHEN** its rows are read
- **THEN** they equal the table above in order, the rendered window shows each row's text, its body's computed `font-size` lies between 10px and 12px in a monospace family, and at 1440 every row's text sits on one line

#### Scenario: Nothing private
- **GIVEN** `projectWindows.homelab` and the rendered window's text
- **WHEN** they are matched against `/\b\d{1,3}(\.\d{1,3}){3}\b/`, `/[0-9a-f]{0,4}(:[0-9a-f]{0,4}){2,}/i`, `/(token|key|secret|password)/i` and `/\/(etc|home|var|root)\//`
- **THEN** nothing matches, and the only host names are workstation, rp5, vps and rp2

#### Scenario: On a phone
- **GIVEN** `/projects/HomelabInfrastructure` at 390x844 with the window landed
- **WHEN** the window is measured
- **THEN** it lies within 0..390 px, its body has no horizontal scroll (`scrollWidth` at most `clientWidth`), and the page has no sideways scroll

### Requirement: Finance Bot's window is its reply to an upload
Finance Bot's window SHALL replace its drawing (Ezra, 2026-11-10, text approved as written; its numbers, date, upload id and merchants are invented, the wording is the bot's own): title "Discord · #finance", no dots, the glow of Finance Bot's own light (`windowGlows.finance`, from its entry in `projectLights`), the text in `projectWindows.finance`, verbatim:

1. "Ezra" "used" "/upload" "asn-export.csv"
2. "Finance Bot" with the tag "APP", then "Processing 1 file(s) as upload 20261124-201508-3fa1; progress and the summary follow in your thread" and the mention "#Approvals-Ezra"
3. "11/2026: 164 rows written, 2 flagged"
4. the summary, titled "Upload 20261124-201508-3fa1: complete", its lines: "164 rows read from 1 file; 164 new."; "Periods:"; (indented) "11/2026: written, 164 rows (151 expenses, 13 income), sheet created, 2 flagged, 0 marked"; "Flagged rows (the AI guess that was not used):"; (indented) "06-11-2026  18.95  Kruidvat  -> Persoonlijke verzorging (0.61)"; (indented) "13-11-2026  42.50  Bol.com  -> Huishouden (0.68)"

The summary SHALL carry a green bar along its left edge, and an indented line that wraps keeps its indent.

#### Scenario: The reply, verbatim
- **GIVEN** `projectWindows.finance` in a unit test, and `/projects/FinanceBot` loaded with `?speed=10`
- **WHEN** the window's lines are read in order
- **THEN** they equal the list above, word for word

#### Scenario: Its own light
- **GIVEN** `windowGlows.finance` and `projectLights.finance` in a unit test
- **WHEN** their colours are compared
- **THEN** the glow's lights are `projectLights.finance`'s near and deep colours, and none equals the benched mist's (`benched` Finance Bot card)

#### Scenario: The drawing is gone
- **GIVEN** `/projects/FinanceBot` loaded
- **WHEN** the page is inspected
- **THEN** it has no `.dwg`, no `.plate` and no `.dwg-wrap`

### Requirement: pytaiga-mcp's drawing in a frosted pane
pytaiga-mcp's page SHALL show its Overzicht drawing (`PytaigaDrawing`) inside a frosted pane opening the right column (Ezra, 2026-11-10, D1), window dots, titled with the page's `title`, over the warm glow (`windowGlows.cards`). The drawing SHALL carry its own hatch and arrow definitions, plot itself in when it comes into view, arrive drawn under reduced motion, keep its labels legible on the glass (no paper halo), and fit its pane at every width.

#### Scenario: The pane
- **GIVEN** `/projects/PytaigaMcp` loaded at 1440x900
- **WHEN** the right column is read
- **THEN** it opens with one `data-glass="frosted"` window titled "pytaiga-mcp" holding one `svg.dwg`, with a `[data-glow]` beneath, and the `svg` resolves `url(#hatch)` and `url(#arrow)` to definitions inside the pane

#### Scenario: Plotted, and still on request
- **GIVEN** `/projects/PytaigaMcp` loaded, and again with reduced motion
- **WHEN** the pane is scrolled into view and the test waits on the drawing's `drawn` class
- **THEN** every path's `stroke-dashoffset` ends at 0; with reduced motion it is 0 on arrival and no transition runs

#### Scenario: It fits
- **GIVEN** `/projects/PytaigaMcp` at 390x844 and at 1000x900
- **WHEN** the drawing and its pane are measured
- **THEN** the drawing lies inside its pane and the pane within the viewport, with no sideways scroll

### Requirement: ANNA's page holds her conversation and her levels
ANNA's project page SHALL show, at the top of the right column, her Teams window (`annaCalls.window`, flame glow) playing `annaDemo`'s "Close my week" exactly as on the homepage (plays once when about 40% in view, Replay, `?chat=` holds it, `?speed=` plays it faster, reduced motion shows it finished), and under the window her four levels as rows of type (`annaLevels`: "Identity", "Claude", "MCP connectors", "Operations", each with its text). This replaces `AnnaPlate`'s 3D building. On a phone the window and then the levels come after the lead.

#### Scenario: Window and levels
- **GIVEN** `/projects/AnnaAssistant` loaded at 1440x900 with `?chat=` at the timeline's end
- **WHEN** the right column is read
- **THEN** it holds one frosted window titled `annaCalls.window` showing every beat, then four rows whose names read "Identity", "Claude", "MCP connectors", "Operations", each followed by its `annaLevels` text, and there is no `canvas` in `main` and no `.plate`

#### Scenario: It plays once
- **GIVEN** `/projects/AnnaAssistant` loaded with `?speed=10`
- **WHEN** the window is scrolled into view and the test waits for the window's `done` state
- **THEN** every beat was shown in timeline order and Replay is shown; pressing Replay plays it again from the start

#### Scenario: Still on request
- **GIVEN** `/projects/AnnaAssistant` loaded with reduced motion
- **WHEN** the window comes into view
- **THEN** the finished conversation shows at once and Replay is not shown

#### Scenario: On a phone
- **GIVEN** `/projects/AnnaAssistant` at 390x844
- **WHEN** the head, the window and the levels are measured
- **THEN** the window's top is below the lead, the levels' top below the window, each level's name above its text in one column, and nothing scrolls sideways

### Requirement: The Homelab page's approved texts
`HomelabInfrastructure.mdx` SHALL carry these texts verbatim (Ezra, 2026-11-10, "Homelab glass: H1 picked", approved):

- `description`: "Three servers and the workstation that runs them: automated cross-device backups, Prometheus monitoring and alerting, recursive DNSSEC resolution, and Cloudflare Zero Trust networking"
- `hook`: "A homelab of a Raspberry Pi 5, a Hetzner VPS and a Raspberry Pi 2, run from my workstation: joined by a Tailscale mesh, fronted by Cloudflare tunnels, monitored by Prometheus, and backed up cross-device every night."
- in "Compute and networking", in place of the sentence that begins "My workstation, a Ryzen 7 PC running WSL2": "My workstation, a PC I built myself around a Ryzen 7 7800X3D on AM5 with 32 GB of DDR5-6000 and an RTX 2080 Ti, running WSL2, is the fourth machine on the mesh and the one I use most: where I build, and the admin seat that reaches every host and runs the orchestration, from deploys to the scripts and agents I run the lab with."
- a new paragraph directly after "Monitoring and alerting": "**One command for the whole lab.** `homelab-health`, a script I wrote, checks every machine from the workstation at once: load, memory, disk, containers and DNS, plus slow-burn problems such as a service stuck in a restart loop, and any Prometheus target that is down. An offline host shows as unreachable within ten seconds instead of hanging the check. The restart-loop check exists because a sync service once crash-looped 472,000 times over 110 days without a single alert."

#### Scenario: The texts, verbatim
- **GIVEN** `/projects/HomelabInfrastructure` loaded
- **WHEN** the meta description, the lead and the prose are read
- **THEN** the description and the lead equal the approved texts, the prose contains the workstation sentence and no longer contains "a Ryzen 7 PC running WSL2, is the fourth machine", and the paragraph starting "One command for the whole lab." is the paragraph right after the one starting "Monitoring and alerting."

### Requirement: This site's page speaks stone
`ResumePage.mdx` SHALL carry these approved texts verbatim (Ezra, 2026-11-10, "use them as written, add the git history line"):

- `hook`: "A static-first portfolio at hulsman.dev, built with Astro: plain stone, glass only where something sits behind it, and a fully interactive terminal on the homepage."
- "The Idea": "Most résumé sites look like résumé sites: a photo, a headline, a grid of skills. I wanted this one to stray from that and still hold everything a résumé should. The page is stone: warm grey, heavy type, nothing decorative. Glass only appears where something is really behind it: ANNA's conversation in Teams, Henk's chat in Signal, the homelab's own health check. Each project shows its own output instead of a screenshot, with a few soft lights far behind the glass. It started as a set of technical drawings; that version lives on in the git history."
- "Built Like It Matters" opens with: "A site like this only works if it's exact, so it's tested like something in production. Over a hundred browser tests check what a visitor would notice: that nothing scrolls sideways on a phone, that every window stays readable at every width, that the motion stops when your system asks for less of it."

"Stack Choices", "The Terminal" and "Two Things You Might Have Missed", the `description` and the `tech` list SHALL be rewritten at build with measured numbers and SHALL ship only in the wording Ezra approves. Apart from the git-history line of "The Idea", the page SHALL hold no drawing-sheet wording, and SHALL still leave Claude out.

#### Scenario: The approved texts
- **GIVEN** `/projects/ResumePage` loaded
- **WHEN** the lead and the prose are read
- **THEN** the lead equals the approved hook, the paragraph under "The Idea" equals the approved text, and the first paragraph under "Built Like It Matters" equals the approved opening

#### Scenario: No drawing sheet left
- **GIVEN** `/projects/ResumePage` loaded, and `ResumePage.mdx`'s frontmatter
- **WHEN** the description, `tech` and the prose without the sentence "It started as a set of technical drawings; that version lives on in the git history." are matched against `/\b(drawn|drawing|drawings|sheet|sheets|title block|revision table|schedule|perspective|Canvas 2D)\b/i`
- **THEN** nothing matches, and the prose does not match `/Claude|prompt/i`

#### Scenario: The claim holds
- **GIVEN** the repository at build, in a unit test
- **WHEN** the `test(` calls written in `tests/*.e2e.mjs` are counted in the source (a call inside a loop counts once)
- **THEN** there are more than a hundred, as "Built Like It Matters" says

### Requirement: Henk's trust boundary is one frosted pane
Henk's page SHALL show his trust-boundary diagram in the prose (`HenkBoundary.astro`, Ezra, 2026-11-12, sketch variant D) with the same facts, labels, title, description and caption as the line drawing it replaces, and no new claim. The boundary SHALL be one frosted pane in the site's frosted-glass material (a `.glass-window`, `data-glass="frosted"`, with the frost's grain), in a glass moment of its own (`henk-boundary`), behind the drawing's part inside Henk: the header "Henk · rp5 · tailnet tag:henk · zero inbound", the intake, the allowlist, the cadence gate, the serial agent core, the choke point and the three tools. The untrusted lanes (the sensors, ntfy, the owner, the signal-cli bridge) and the zone captions SHALL stand above the pane on plain stone. The pane SHALL have real-glass edges: a thin bright rim top and left, a slightly darker one bottom and right, a faint hairline and a soft lift shadow. Beneath it a `[data-glow]` SHALL hold Henk's blue (`projectLights.henk`) soft and far back behind the lower half (the choke point and the tools) and a cool pale wash above; that light SHALL stay inside the pane's own box, so no blue reaches the stone beside or below it. The boxes on the pane SHALL be faintly translucent tiles, so the light shows through them, and still read as boxes. All ink (boxes, arrows, labels) SHALL be drawn in front of the glass, crisp, and every label and the caption SHALL read at 4.5:1 or more against the rendered pixels behind it, at 1440 and at 390 wide. The pane SHALL hold still: it has no loop and no WebGL, so with reduced motion, under the slow-device guard and in a browser without WebGL it shows the same frosted CSS pane with the diagram fully readable. In print the light SHALL go and the pane SHALL be plain, with every label readable.

#### Scenario: One frosted pane holds the diagram
- **GIVEN** `/projects/Henk` loaded at 1440x900 with `?t=2.4`
- **WHEN** the diagram in the prose is read
- **THEN** its figure is the moment `henk-boundary`, holding exactly one `data-glass="frosted"` window with a computed `backdrop-filter` that blurs and a `[data-glow]` (`aria-hidden`) beneath it; the labels inside Henk lie within the pane's box and the untrusted lanes and zone captions above its top; and the caption reads "Two ways in, one way through: every tool call passes the default-deny choke point, every outcome lands in the audit log."

#### Scenario: Every label at 4.5:1
- **GIVEN** `/projects/Henk` at 1440x900 and at 390x844 with `?t=2.4`
- **WHEN** every label of the diagram and its caption are made transparent and the pixels behind each are sampled from a screenshot
- **THEN** every label of the line drawing is present and each one's lowest contrast against its ink is at least 4.5:1

#### Scenario: The light stays inside the pane
- **GIVEN** `/projects/Henk` at 1440x900 and at 390x844 with `?t=2.4`
- **WHEN** pixels a few px outside the pane's left and right sides, down its height, are sampled from a screenshot
- **THEN** none is blue (its blue channel not above its red one), and each is within 24 levels of the stone

#### Scenario: No sideways scroll
- **GIVEN** `/projects/Henk` at 1440x900 and at 390x844
- **WHEN** the page and the figure are measured
- **THEN** the page does not scroll sideways and the figure, its pane and its `svg` lie within the viewport's width

#### Scenario: Still on request, and without WebGL
- **GIVEN** `/projects/Henk` loaded with reduced motion, and separately in a browser where `getContext('webgl2')` and `getContext('webgl')` return null
- **WHEN** the mouse moves over the pane and the figure is captured twice 30 frames apart; and the labels are measured without WebGL
- **THEN** both captures are identical and no animation runs in the figure; without WebGL there is no error, the pane is the same frosted pane and every label reads at 4.5:1

#### Scenario: Print
- **GIVEN** `/projects/Henk` with print media emulated
- **WHEN** the figure is captured and its labels measured
- **THEN** the glow is not shown and every label reads at 4.5:1

