## ADDED Requirements

### Requirement: ANNA's copy is what she may do, and for whom
The homepage's ANNA section SHALL show, in this order and as real text: the heading "ANNA" (`annaLead.title`) with the index `01`, the lead line `annaLead.text` followed by a full stop, the heading `annaCalls.heading` ("What she may do, and for whom."), the three rules from `annaCalls.rules` each with its rule, why and how, the onboarding line `annaCalls.closing`, and a link labelled `annaCalls.more.label` to `annaCalls.more.href` (https://anna-site.anamata.ai). Every string MUST come from `src/config/home.ts`.

#### Scenario: The copy, in order
- **GIVEN** the homepage loaded at 1440x900
- **WHEN** the ANNA section's text is read top to bottom
- **THEN** it contains, in order, "ANNA", `annaLead.text + '.'`, "What she may do, and for whom.", the three `rule` strings each followed by its `why` and `how`, `annaCalls.closing`, and `annaCalls.more.label`

#### Scenario: The link to anna-site
- **GIVEN** the ANNA section
- **WHEN** its link is read
- **THEN** its `href` is `https://anna-site.anamata.ai` and its text is `annaCalls.more.label`

#### Scenario: Written in config only
- **GIVEN** the ANNA section's component source
- **WHEN** the single-source scan reads it
- **THEN** it holds no literal words, and every text in the section comes from `annaLead`, `annaCalls` or `annaDemo`

### Requirement: Dropped ANNA stagings stay dropped
The ANNA section SHALL NOT include a production-facts line (versions, release counts, test counts), the four levels, the turned card, the journey, the exploded stack or any glass other than its one Teams window.

#### Scenario: No run line, no levels
- **GIVEN** the homepage loaded
- **WHEN** the ANNA section's text is read
- **THEN** it matches none of `/\bv\d+\.\d+/`, `/\breleases?\b/i`, `/\btests\b/i`, and contains none of the four `annaLevels` names

#### Scenario: One glass object in the section
- **GIVEN** the homepage loaded
- **WHEN** the ANNA section's glass objects are counted
- **THEN** there is exactly one `[data-glass]` element, a frosted window, and no element with class `anna-turn`, `anna-journey`, `anna-x` or `slab`

### Requirement: The Teams window plays "Close my week"
Beside (desktop) or below (phone) the copy, a frosted window titled `annaCalls.window` SHALL hold anna-site's "Close my week" conversation from `src/config/anna-demo.ts`: Joris's request, ANNA's answer, the sources she read after `annaCalls.read`, her steps, her question, Joris's reply typed into the compose box and sent, her result, and the record under `annaDemo.recordHeading`. Every beat MUST be in the markup from the start, hidden until it lands. The conversation SHALL play once when about 40% of the window is in view, keep the newest beat in view unless the reader has scrolled the chat, and play again from the start on Replay (`annaCalls.replay`).

#### Scenario: The words are anna-site's
- **GIVEN** `src/config/anna-demo.ts` and an anna-site checkout
- **WHEN** the unit test compares each string with anna-site's `week` scenario
- **THEN** every string matches word for word (the test skips when anna-site is not checked out)

#### Scenario: All there before it plays
- **GIVEN** the homepage loaded with the window out of view
- **WHEN** the window's beats are read
- **THEN** every beat from `person` to `record` is in the DOM in timeline order, none is shown, and the hidden beats are not announced

#### Scenario: Plays once to the end
- **GIVEN** the homepage loaded
- **WHEN** the window is scrolled into view and the test waits for the window's `done` state
- **THEN** every beat was shown in timeline order, the compose box held the reply typed out before it was sent, the newest beat is inside the chat's visible area, and no beat is replayed without Replay

#### Scenario: Replay
- **GIVEN** the conversation finished
- **WHEN** Replay is pressed
- **THEN** the beats hide and play again from `person` to `record`

#### Scenario: The reader scrolls back
- **GIVEN** the conversation playing
- **WHEN** the reader scrolls the chat up
- **THEN** later beats do not pull the chat back down until the reader scrolls back to the newest beat

#### Scenario: Reduced motion
- **GIVEN** the homepage loaded with `prefers-reduced-motion: reduce`, or with reduced motion switched on after load, before or during play
- **WHEN** the window comes into view, or is in view
- **THEN** the finished conversation shows at once with every beat visible, nothing is typed into the compose box, and Replay is not shown

#### Scenario: No focus trap
- **GIVEN** the homepage loaded
- **WHEN** the reader tabs through the ANNA section
- **THEN** focus moves into the window (Replay) and out to the next section's first link

#### Scenario: Phone
- **GIVEN** the homepage loaded at 390x844
- **WHEN** the ANNA section is laid out and the conversation has played to its `done` state
- **THEN** the window's top is below the copy's bottom, the window lies within 0..390 px horizontally, and the page has no sideways scroll at the section's top, middle and bottom

### Requirement: The four levels live on /projects, not on the homepage
`annaLevels` SHALL be rendered on /projects (ANNA's plate, each level's name and text) and SHALL NOT be rendered on the homepage. No homepage component and no homepage-only config SHALL import `annaLevels`.

#### Scenario: Not on the homepage
- **GIVEN** the homepage loaded
- **WHEN** its text is read
- **THEN** none of the four `annaLevels` names or texts appears

#### Scenario: On /projects
- **GIVEN** /projects loaded
- **WHEN** ANNA's plate is read
- **THEN** it shows the four `annaLevels` names in order, each with its text

#### Scenario: Nothing on the homepage imports them
- **GIVEN** `src/pages/index.astro`, `src/components/stone/*` and `src/config/glass.ts`
- **WHEN** a unit test reads their source
- **THEN** none contains `annaLevels`
