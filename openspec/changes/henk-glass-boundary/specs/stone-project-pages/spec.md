## ADDED Requirements

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
