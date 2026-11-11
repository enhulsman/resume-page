## MODIFIED Requirements

### Requirement: The four levels live on /projects, not on the homepage
`annaLevels` SHALL be rendered as four rows of type on stone, each its name and its text, in two places: on /projects under ANNA's lead text, and on her project page under her Teams window (Ezra, 2026-11-10: they replace the plate's exploded building). Their names SHALL carry no minus numbers: "Identity", "Claude", "MCP connectors", "Operations" (approved). They SHALL NOT be rendered on the homepage, and no homepage component and no homepage-only config SHALL import `annaLevels`.

#### Scenario: Not on the homepage
- **GIVEN** the homepage loaded
- **WHEN** its text is read
- **THEN** none of the four `annaLevels` texts appears anywhere in it, and none of the four names is the whole text of any element (the names are plain words since 2026-11-10, and "Claude" and "MCP connectors" also occur inside other homepage text, so a name counts as a level only where it is set alone)

#### Scenario: On /projects
- **GIVEN** /projects loaded
- **WHEN** ANNA's lead is read
- **THEN** it shows four rows, their names "Identity", "Claude", "MCP connectors", "Operations" in order, each with its `annaLevels` text, with no glass, canvas or plate around them

#### Scenario: On her page
- **GIVEN** `/projects/AnnaAssistant` loaded
- **WHEN** the right column is read
- **THEN** the same four rows stand under her window

#### Scenario: No minus numbers
- **GIVEN** `annaLevels` in a unit test
- **WHEN** its names are read
- **THEN** they equal `['Identity', 'Claude', 'MCP connectors', 'Operations']` and none matches `/[−-]\d/`

#### Scenario: Nothing on the homepage imports them
- **GIVEN** `src/pages/index.astro`, the homepage's components in `src/components/stone/` (`Hero`, `AnnaSection`, `Projects`, `Experience`, `Writing`, `About`, `Contact`) and `src/config/glass.ts`
- **WHEN** a unit test reads their source
- **THEN** none contains `annaLevels`
