## MODIFIED Requirements

### Requirement: Diagrams stay on stone, with "View larger" where they shrink
The two diagrams in the prose (Henk's trust boundary on Henk's page, `SandboxArchitecture` on Claude Sandbox's) SHALL be line drawings in stone ink, their labels and captions in Archivo. Claude Sandbox's SHALL have no glass; Henk's is drawn in front of one frosted pane that is its trust boundary (`stone-project-pages`, Ezra, 2026-11-12), its ink still stone ink in front of the glass, and gets "View larger" by the same rule as before. Under a diagram a "View larger" button (approved) SHALL appear only where the diagram is rendered smaller than its natural size (its rendered `svg` width is more than 1 px under its `viewBox` width), re-measured when the viewport is resized; only then is the diagram itself also clickable. The button SHALL be the keyboard path (the clickable diagram is not a tab stop of its own). It SHALL open a native modal dialog (`<dialog>`, `showModal`) holding the diagram large in a frosted panel over a blurred page, with a "Close" button (approved); the dialog is named by the diagram it shows (`aria-labelledby` pointing at its copy of the diagram, which carries the diagram's own `<title>` or `aria-label`), so it adds no words. Escape, "Close" and a click outside the panel SHALL close it, and focus SHALL return to the button; when a resize took the button away while the dialog was open, focus SHALL go to the diagram it showed instead, which stays no tab stop (Codex review, 2026-11-12: focus was otherwise lost). The panel's "behind" is the blurred page, so it is the one frosted panel without a `[data-glow]`. Under reduced motion the dialog SHALL open without a fade. The two drawings in frosted panes (pytaiga-mcp's on its page, the henk-exactly-once post's) SHALL get the same "View larger" by the same rule (Ezra, 2026-11-10: wherever a diagram is shrunk): the button under the pane, only while the drawing is rendered more than 1 px under its `viewBox` width, re-measured on resize; the dialog shows the copy whole at once (every line and label drawn, no plot-in) and is named by the drawing's own `<title>`.

#### Scenario: Only where it shrinks
- **GIVEN** `/projects/Henk` and `/projects/ClaudeSandbox` loaded at 1440x900, then at 390x844
- **WHEN** the "View larger" buttons are counted and each diagram's rendered width is compared with its `viewBox` width
- **THEN** at 1440 neither page has a button (Henk's diagram is drawn at or above 440 px, the sandbox's at or above 640 px) and clicking a diagram opens nothing; at 390 each page has exactly one, under its diagram

#### Scenario: Resizing across the natural width
- **GIVEN** `/projects/Henk` loaded at 1440x900 with no button
- **WHEN** the viewport is resized to 390x844 (the diagram drawn about 343 px wide) and back to 1440x900
- **THEN** the button appears at 390 and is gone again at 1440

#### Scenario: Open and close
- **GIVEN** `/projects/Henk` at 390x844
- **WHEN** "View larger" is reached with Tab and opened with Enter, then Escape is pressed; then it is clicked and "Close" is clicked; then it is clicked and the backdrop outside the panel is clicked
- **THEN** each time the dialog opens modal (`open`, focus inside it) holding a copy of the diagram wider than the one in the prose, the panel is `data-glass="frosted"`, the dialog's accessible name equals the prose diagram's accessible name, the diagram itself has no `tabindex`, and after each close the dialog is closed and the "View larger" button has focus

#### Scenario: Widened while open
- **GIVEN** `/projects/Henk` at 390x844 with the dialog opened from "View larger"
- **WHEN** the viewport is resized to 1440x900 and Escape is pressed
- **THEN** the dialog is closed, there is no "View larger" button, focus is on the diagram in the prose, and once focus leaves it the diagram has no `tabindex`

#### Scenario: Reduced motion
- **GIVEN** `/projects/ClaudeSandbox` at 390x844 with reduced motion
- **WHEN** "View larger" is pressed
- **THEN** `dialog.getAnimations()` is empty and the panel is fully opaque in the first frame

#### Scenario: The diagram itself has no glass
- **GIVEN** `/projects/ClaudeSandbox` loaded
- **WHEN** the diagram in the prose is inspected
- **THEN** neither it nor any ancestor inside `main` has `data-glass` or a `backdrop-filter`, and its text elements' computed `font-family` starts with "Archivo"

#### Scenario: Drawings in panes
- **GIVEN** `/projects/PytaigaMcp` and `/blog/henk-exactly-once` loaded at 1440x900, then at 390x844 in the same page
- **WHEN** the "View larger" buttons are counted and each pane drawing's rendered width is compared with its `viewBox` width
- **THEN** at each width a page has one button, under its pane, exactly while its drawing is drawn more than 1 px under its `viewBox` width (at 390 both are), and none otherwise; pressing it opens the dialog holding a copy of the drawing wider than the pane's, named by the drawing's own title, every path and label drawn; "Close" closes it and focus returns to the button

#### Scenario: Henk's diagram is ink in front of its pane
- **GIVEN** `/projects/Henk` loaded
- **WHEN** the diagram in the prose is inspected
- **THEN** the only glass between its `svg` and `main` is its one frosted pane (moment `henk-boundary`), its text elements' computed `font-family` starts with "Archivo", and every label and the caption take an opaque stone ink or the glass red
