## ADDED Requirements

### Requirement: The hero is the name and four lights
The homepage hero SHALL show the name as a real `h1`, the role and intro line ("I build ANNA, an AI assistant in Microsoft Teams that does the admin no one should spend their day on."), and four glass cards in this order: ANNA, Henk, Homelab, Claude Sandbox, each linking to its project page.

#### Scenario: Hero content
- **WHEN** the homepage loads
- **THEN** the `h1` reads "Ezra Hulsman", the intro line is present verbatim, and the four card titles appear in order, each linking under `/projects/`

#### Scenario: Hero fits the first screen
- **WHEN** the homepage loads at 1280x720, 1440x900 or 1920x1080
- **THEN** the bottom of the card row is inside the viewport

#### Scenario: Phone
- **WHEN** the homepage loads at 390x844
- **THEN** the page has no sideways scroll and the cards scroll in their own row

### Requirement: Card readouts come from the project data
Each hero card's readout number SHALL be one of that project's dimensions in `src/config/home.ts`; ANNA's readout SHALL be "In production".

#### Scenario: A number changes at its source
- **WHEN** Henk's egress-port dimension in `home.ts` changes
- **THEN** Henk's card readout shows the new number with no other edit

### Requirement: Sections in order
Below the hero the homepage SHALL show, in order: ANNA, Projects, Experience, Writing, About, Contact.

#### Scenario: Section order
- **WHEN** the homepage's section headings are read top to bottom
- **THEN** they are ANNA, Projects, Experience, Writing, About, Contact

### Requirement: ANNA's section
The ANNA section SHALL show what ANNA is and its four levels from `annaLevels` (Identity, Claude, MCP connectors, Operations), each level's name and description as real text. Its visual treatment is settled in a brainstorm with Ezra before it is built.

#### Scenario: Four levels
- **WHEN** the ANNA section renders
- **THEN** it shows the four level names from `annaLevels`, in order, and their descriptions

### Requirement: Other projects as type
The Projects section SHALL list every project that is not a hero card and not `hideOnHome`, as plain type on stone (name, one line, status), with a link to `/projects`. It SHALL NOT use glass.

#### Scenario: No project shown twice
- **WHEN** the homepage renders
- **THEN** no project appears both as a hero card and in the Projects list

### Requirement: Experience, writing, About and contact keep their sources
Experience SHALL come from `resume.ts`, Writing from the published blog posts' frontmatter (newest first), About from `notes` in `home.ts` with the site photo and the live terminal, and Contact from `site.ts` (message, contact page, e-mail, LinkedIn, GitHub).

#### Scenario: A new post
- **WHEN** a new published post is added under `src/pages/blog/`
- **THEN** it appears first under Writing with no homepage edit

#### Scenario: The terminal in the new look
- **WHEN** the About section renders
- **THEN** the terminal sits on the stone page in the new visual approach, with none of the drawing-sheet styling

#### Scenario: The terminal still runs
- **WHEN** a visitor types `ls` into the About terminal
- **THEN** it lists the project directories as it does today

### Requirement: Shared chrome on every page
Every page SHALL use the stone ground (#EEEAE3), the Archivo type and the new top bar (the "EH." mark, Projects, Blog, Résumé, Contact, and "Get in touch") and footer. There SHALL be no theme button and no dark theme.

#### Scenario: Inner pages carry the chrome
- **WHEN** `/projects`, `/blog`, `/resume` or `/contact` loads
- **THEN** the page ground is #EEEAE3 and the top bar shows the five links and the "EH." mark

#### Scenario: Dark system theme
- **WHEN** any page loads with `prefers-color-scheme: dark`
- **THEN** the page ground is still #EEEAE3

### Requirement: The drawing-sheet homepage retires
The homepage SHALL NOT play an arrival animation, and SHALL NOT render the title block, the revision letters, the stamp or the ANNA 3D scene.

#### Scenario: Arrival
- **WHEN** the homepage loads for the first time in a session
- **THEN** the hero is fully visible in the first painted frame, with no `intro` class on the document
