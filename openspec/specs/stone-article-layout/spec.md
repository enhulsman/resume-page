# stone-article-layout Specification

## Purpose
TBD - created by archiving change stone-inner-pages. Update Purpose after archive.
## Requirements
### Requirement: Project pages and posts share one layout, ac
Every project page and every published post SHALL render through one stone article (Ezra, 2026-11-10, layout "ac"): a head (the index where the project has one, the title as an `h1`, the lead), a right column (`aside`) and the prose in one column. At 1000 px wide and wider the article SHALL be a two-column grid, `grid-template-columns: minmax(0, 7fr) minmax(18rem, 5fr)`, the head and prose in the first column (at most 42rem wide) and the `aside` in the second, spanning the article's length. Below 1000 px it SHALL be one column. The prose SHALL be set in Archivo on stone, its `h2`s in Archivo 700 at the h3 scale (`--stone-t-h3`). No title block (`table.titleblock`), no hanging-head grid and no drawing beside the title SHALL remain.

#### Scenario: Two columns at 1440
- **GIVEN** `/projects/Henk` loaded at 1440x900 after `document.fonts.ready`
- **WHEN** the head, the prose and the `aside` are measured
- **THEN** the prose column is 672 px wide or less and starts at the page's left gutter, the `aside` is between 320 and 576 px wide (about 538 at this width), its right edge sits at the page's right gutter, and the prose and the `aside` do not overlap horizontally

#### Scenario: The 1000 px boundary
- **GIVEN** `/projects/Henk` loaded at 1000x900 and again at 999x900
- **WHEN** the `aside` and the prose are measured
- **THEN** at 1000 the `aside` stands to the right of the prose (its left edge greater than the prose's right edge) and is at least 320 px wide, and the prose is at least 480 px wide; at 999 the `aside`'s pieces stand under or over the prose in one column and every box lies within the viewport's width

#### Scenario: The same layout on a post
- **GIVEN** `/blog/bible-tui` and `/blog/spec-factory` loaded at 1440x900
- **WHEN** the article is measured
- **THEN** each has the same two columns as a project page, with an `aside` in the second column

#### Scenario: No drawing-sheet head
- **GIVEN** every project page and every published post loaded at 1440x900
- **WHEN** the head is inspected
- **THEN** there is no `table.titleblock`, no `.post-dwg`, no `.sheet-head`, the `h1` is set in Archivo at weight 900, and every prose `h2` has computed weight 700

### Requirement: The window opens the right column and scrolls away
A page with a window (`innerGlass` names one for its route) SHALL show it at the top of the `aside` on a desktop, beside the head, at most 600 px wide. The window SHALL scroll away with the page; it is never sticky. A page without a window SHALL still have the `aside`, starting with the sticky block.

#### Scenario: Beside the head
- **GIVEN** `/projects/Henk` loaded at 1440x900
- **WHEN** the window and the `h1` are measured
- **THEN** the window's top is within the first viewport, it is in the `aside`, at most 600 px wide, and its top is no more than 64 px below the `h1`'s top

#### Scenario: It scrolls away
- **GIVEN** `/projects/Henk` loaded at 1440x900
- **WHEN** the page is scrolled so the prose's second `h2` is at the viewport's middle
- **THEN** the window's bottom is above the bar's bottom (it has left the screen), and its computed `position` is not `sticky` or `fixed`

#### Scenario: No window, same column
- **GIVEN** `/projects/EncryptedChatTUI` and `/blog/spec-factory` loaded at 1440x900
- **WHEN** the `aside` is read
- **THEN** it holds no `[data-glass]` element and its first child is the sticky block

### Requirement: The sticky block beside the reading
Under the window (or at the top of the `aside` without one) the `aside` SHALL hold one sticky block, in this order: the contents list ("On this page", approved), the facts in two columns, the numbers in two columns (where the page has numbers), and for a post its project (where it has one) or "Other writing" (where it has neither window nor project). On a desktop the block SHALL stick at the bar's height plus 32 px while the article scrolls, starting 56 px under the window, and SHALL never pass the article's end. Its labels come from `pageWords`. No landmark or control SHALL carry a name that is not shown: the contents `nav` and the "Other writing" `nav` are named by their visible labels (`aria-labelledby`), and the `aside` carries no `aria-label` of its own.

#### Scenario: It sticks while reading
- **GIVEN** `/projects/Henk` loaded at 1440x900
- **WHEN** the page is scrolled to the middle of the prose and the block is measured
- **THEN** the block's top equals the bar's bottom plus 32 px (within 2 px) and its computed `position` is `sticky`

#### Scenario: It stops at the article's end
- **GIVEN** `/blog/successor-scoreboard` loaded at 1440x900
- **WHEN** the page is scrolled to the bottom
- **THEN** the block's bottom is at or above the article's bottom and does not overlap the footer

#### Scenario: Facts and numbers in two columns
- **GIVEN** `/projects/HomelabInfrastructure` loaded at 1440x900
- **WHEN** the facts list and the numbers list are measured
- **THEN** each lays its items out in two columns (the second item's top equals the first's, within 2 px, and its left is greater), and every number is set at weight 800 or more in tabular figures with its label beside or under it

#### Scenario: The order of the block
- **GIVEN** `/blog/henk-watchdog` loaded at 1440x900
- **WHEN** the block's children are read top to bottom
- **THEN** they are the contents list, the facts, the number, and the post's project, in that order; the contents `nav`'s accessible name is "On this page" through `aria-labelledby`, and the `aside` has no `aria-label`

### Requirement: "On this page" marks where you are
The contents list SHALL be labelled "On this page" (approved) and list every `h2` of the prose in order, each a link to its heading's `id`. While the page scrolls, the link of the section being read (the last `h2` whose top is above half the viewport's height) SHALL carry `aria-current="true"`, be set at weight 700 or more, and show a small dot before it; before the first `h2` reaches that line no link is current. Following a link SHALL bring its heading into view below the bar. A page whose prose has no `h2` SHALL have no contents list.

#### Scenario: The list is the page's headings
- **GIVEN** `/projects/Henk` loaded at 1440x900
- **WHEN** the contents list is read
- **THEN** its label reads "On this page" and its links' texts and `href`s equal the prose's `h2` texts and `#` ids, in order ("What I Built", "Key Decisions", "Outcome")

#### Scenario: The current section
- **GIVEN** `/blog/henk-exactly-once` loaded at 1440x900
- **WHEN** the page is at the top, then scrolled so the third `h2`'s top is 100 px above the viewport's middle
- **THEN** at the top no link has `aria-current`; after the scroll exactly the third link has it, its weight is at least 700, its `::before` is a dot (content present, `border-radius` 50%), and the other links weigh 500 or less

#### Scenario: Following a link
- **GIVEN** `/projects/Henk` loaded at 1440x900
- **WHEN** "Outcome" in the contents list is clicked
- **THEN** the "Outcome" heading's top is below the bar's bottom and inside the viewport, and its link becomes current

### Requirement: The phone order
Below 1000 px the article SHALL read, top to bottom: the head (index, title, lead), the window (with ANNA's levels under hers), the prose, then the block's facts, numbers, the post's project or "Other writing". The contents list SHALL be hidden (`display: none`). Nothing SHALL scroll sideways.

#### Scenario: Order at 390
- **GIVEN** `/projects/Henk` and `/blog/henk-watchdog` loaded at 390x844
- **WHEN** the head, the window, the prose and the facts are measured
- **THEN** the window's top is below the lead's bottom, the prose's top below the window's bottom, the facts' top below the prose's bottom, no contents list is visible, and `document.documentElement.scrollWidth` is at most 390

#### Scenario: Order at 999
- **GIVEN** `/projects/HomelabInfrastructure` loaded at 999x900
- **WHEN** the same boxes are measured
- **THEN** the same order holds and the contents list's computed `display` is `none`

### Requirement: Diagrams stay on stone, with "View larger" where they shrink
The two diagrams (`HenkFlow` on Henk's page, `SandboxArchitecture` on Claude Sandbox's) SHALL stay line drawings in stone ink in the prose, their labels and captions in Archivo, with no glass. Under a diagram a "View larger" button (approved) SHALL appear only where the diagram is rendered smaller than its natural size (its rendered `svg` width is more than 1 px under its `viewBox` width), re-measured when the viewport is resized; only then is the diagram itself also clickable. The button SHALL be the keyboard path (the clickable diagram is not a tab stop of its own). It SHALL open a native modal dialog (`<dialog>`, `showModal`) holding the diagram large in a frosted panel over a blurred page, with a "Close" button (approved); the dialog is named by the diagram it shows (`aria-labelledby` pointing at its copy of the diagram, which carries the diagram's own `<title>` or `aria-label`), so it adds no words. Escape, "Close" and a click outside the panel SHALL close it, and focus SHALL return to the button; when a resize took the button away while the dialog was open, focus SHALL go to the diagram it showed instead, which stays no tab stop (Codex review, 2026-11-12: focus was otherwise lost). The panel's "behind" is the blurred page, so it is the one frosted panel without a `[data-glow]`. Under reduced motion the dialog SHALL open without a fade. The two drawings in frosted panes (pytaiga-mcp's on its page, the henk-exactly-once post's) SHALL get the same "View larger" by the same rule (Ezra, 2026-11-10: wherever a diagram is shrunk): the button under the pane, only while the drawing is rendered more than 1 px under its `viewBox` width, re-measured on resize; the dialog shows the copy whole at once (every line and label drawn, no plot-in) and is named by the drawing's own `<title>`.

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
- **GIVEN** `/projects/Henk` loaded
- **WHEN** the diagram in the prose is inspected
- **THEN** neither it nor any ancestor inside `main` has `data-glass` or a `backdrop-filter`, and its text elements' computed `font-family` starts with "Archivo"

#### Scenario: Drawings in panes
- **GIVEN** `/projects/PytaigaMcp` and `/blog/henk-exactly-once` loaded at 1440x900, then at 390x844 in the same page
- **WHEN** the "View larger" buttons are counted and each pane drawing's rendered width is compared with its `viewBox` width
- **THEN** at each width a page has one button, under its pane, exactly while its drawing is drawn more than 1 px under its `viewBox` width (at 390 both are), and none otherwise; pressing it opens the dialog holding a copy of the drawing wider than the pane's, named by the drawing's own title, every path and label drawn; "Close" closes it and focus returns to the button

