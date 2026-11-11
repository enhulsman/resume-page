## ADDED Requirements

### Requirement: The side pieces
`site.sidePieces` SHALL list, in order (each its address and its line, verbatim): `https://flag.hulsman.dev` "781 one-minute chess games, drawn as time"; `https://sleep.hulsman.dev` "One night of sleep, drawn"; `https://licht.hulsman.dev` "Genesis 1, lit only by its own letters" (Ezra, 2026-11-12, OK'd verbatim); `https://wordle.hulsman.dev` "A word game". Wherever the side pieces render ("Made for fun" on /projects), licht SHALL show directly after sleep.

#### Scenario: In config
- **GIVEN** `site.sidePieces` in a unit test
- **WHEN** its entries are read
- **THEN** they are flag, sleep, licht and wordle in that order, licht's `line` exactly "Genesis 1, lit only by its own letters"

#### Scenario: On /projects
- **GIVEN** /projects loaded
- **WHEN** the rows under "Made for fun" are read
- **THEN** the row after sleep.hulsman.dev is a link to `https://licht.hulsman.dev` reading "licht.hulsman.dev" beside "Genesis 1, lit only by its own letters"
