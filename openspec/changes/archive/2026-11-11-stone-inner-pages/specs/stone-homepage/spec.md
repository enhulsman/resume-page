## MODIFIED Requirements

### Requirement: The current page is set in weight, and a link glows under the pointer
In the bar, the link of the page you are on SHALL be set in the name's heavy weight (`font-weight` 700 or more) with no underline, keeping `aria-current="page"`; the other links stay in their regular weight (500 or less). Hovering any of the four page links SHALL light a small soft glow behind the word (a radial gradient that fades to nothing, no hard edge), which is gone when the pointer leaves. Each link's glow SHALL be its own page's light from `pageLights` in `src/config/glass.ts`, the hero's four lights in card order (Ezra, 2026-11-10): Projects the flame, Blog the tide, Résumé the sunset, Contact the moss. The glow is for a desktop only: at 860 px and below it is not drawn, as now. On the homepage no link is current. (Ezra, 2026-11-11, sketch B3 b with c on hover; B3 a, the travelling full stop, is parked.)

#### Scenario: The current page in weight
- **GIVEN** `/projects`, `/blog`, `/resume` and `/contact` loaded at 1440x900
- **WHEN** the bar's four links are read
- **THEN** exactly one has `aria-current="page"`, the one for that page; its computed weight is at least 700 and it has no underline; the others weigh 500 or less

#### Scenario: A glow under the pointer
- **GIVEN** `/projects` loaded at 1440x900
- **WHEN** the mouse rests on the "Blog" link, then moves away
- **THEN** while it rests there the link's `::before` shows a radial-gradient glow (opacity above 0.5) and no other link's does; after it moves away the glow is gone (opacity 0)

#### Scenario: Each link its own light
- **GIVEN** `/resume` loaded at 1440x900
- **WHEN** the mouse rests on Projects, Blog, Résumé and Contact in turn and each link's `::before` background is read
- **THEN** each holds its own page's near colour from `pageLights` (Projects the flame, Blog the tide, Résumé the sunset, Contact the moss), and no two links share a colour

#### Scenario: Not on a phone
- **GIVEN** `/blog` loaded at 860x900 and at 390x844 with the menu open
- **WHEN** a link's `::before` is read
- **THEN** its computed `display` is `none`

### Requirement: The drawing-sheet homepage retires
The homepage SHALL NOT play an arrival animation (the layout's head block that sets `html.intro`, the `html.intro` CSS, `intro.js` and the terminal's wait for `ovz:arrived` all go) and SHALL NOT render the title block, the revision letters, the stamp, the drawings, the ANNA 3D scene or ANNA's section with its levels. The retired homepage code (`intro.js`, the homepage `main.js`, `YouSheet`, `AnnaSection`, `DetailsSheet`, `RegisterSheet`, `RevisionsSheet`, `NotesSheet`, `ContactSheet`) SHALL be deleted. `AnnaPlate`, `plate.js`, `scene.js` and `depth.js`, kept by this requirement for /projects until the inner pages changed, SHALL now be deleted too (`stone-inner-pages`: /projects shows ANNA's window and her levels as rows instead).

#### Scenario: Arrival
- **GIVEN** a new browser session
- **WHEN** the homepage loads
- **THEN** the hero is fully visible in the first painted frame, the document never gets an `intro` class, and the body is not clipped to one screen

#### Scenario: Retired files are gone
- **GIVEN** the repository
- **WHEN** a unit test checks the retired files
- **THEN** none of them exists, and neither do `AnnaPlate.astro`, `plate.js`, `scene.js` or `depth.js`
