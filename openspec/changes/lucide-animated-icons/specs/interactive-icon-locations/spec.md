## ADDED Requirements

### Requirement: Info strip animated icons
The info strip quick links (Resume, Email, GitHub, LinkedIn) SHALL be rendered by a single `InfoStripIcons.tsx` React island (`client:idle`) containing 4 animated icons with hover trigger at `md` size (20px).

#### Scenario: Info strip hover animation
- **WHEN** user hovers over the "Email" link in the info strip
- **THEN** the `mailbox` animated icon plays its animation
- **WHEN** user stops hovering
- **THEN** the icon returns to its idle state

#### Scenario: Info strip icon mapping
- **WHEN** the info strip renders
- **THEN** Resume uses `file-text`, Email uses `mailbox`, GitHub uses `github`, LinkedIn uses `linkedin`

### Requirement: Contact CTA animated icons
The Contact CTA social links (Email, GitHub, LinkedIn) SHALL be rendered by a single `ContactCTAIcons.tsx` React island (`client:visible`) containing 3 animated icons with hover trigger at `lg` size (24px).

#### Scenario: Contact CTA hover
- **WHEN** user hovers over the GitHub link in the Contact CTA section
- **THEN** the `github` animated icon plays its animation at 24px size

### Requirement: Header professional link icons
The resume page header links (Email, GitHub, LinkedIn, Resume PDF) SHALL be rendered by `HeaderIcons.tsx` React islands (`client:idle`) — one for the desktop layout, one for the mobile layout — containing 4 animated icons each with hover trigger at `lg` size (24px).

#### Scenario: Header icon animation
- **WHEN** user hovers over any professional link in the header
- **THEN** the corresponding animated icon plays its animation

#### Scenario: Desktop and mobile consistency
- **WHEN** the page renders at desktop and mobile breakpoints
- **THEN** both layouts show the same animated icons with identical behavior

### Requirement: Project card link icons
Project card external links SHALL use animated icons: `github` for repository links and `arrow-right` for "View project" links, both with hover trigger at `md` size (20px). Icons SHALL be batched into one React island per project card (`client:visible`).

#### Scenario: Project card GitHub hover
- **WHEN** user hovers over a project card's GitHub link
- **THEN** the `github` animated icon plays its animation

#### Scenario: Project card arrow hover
- **WHEN** user hovers over a project card's "View project" link
- **THEN** the `arrow-right` animated icon plays its animation

### Requirement: Section header accent icons
Each main section header SHALL display a small animated icon that plays once on scroll-triggered reveal at `sm` size (16px). These MAY be individual `<AnimatedIcon client:visible />` islands (5 total).

#### Scenario: Section icon mapping
- **WHEN** sections render
- **THEN** About uses `user`, Projects uses `folder-open`, Experience uses `briefcase-business`, Skills uses `layers`, Contact uses `mailbox`

#### Scenario: Section icon scroll animation
- **WHEN** the "Projects" section header scrolls into view
- **THEN** the `folder-open` icon's `startAnimation()` is called, playing the animation once

### Requirement: Footer social icons
The footer social links SHALL be rendered by a single `FooterIcons.tsx` React island (`client:visible`) containing 2 animated icons with hover trigger at `md` size (20px), displayed alongside or replacing the current text labels.

#### Scenario: Footer GitHub hover
- **WHEN** user hovers over the GitHub link in the footer
- **THEN** the `github` animated icon plays its animation

### Requirement: Theme toggle icons
Each theme option in the dropdown SHALL display an animated icon: `sun` for Light, `moon` for Dark, `monitor-check` for System, with hover trigger at `sm` size (16px). These SHALL be imported directly into the existing `ThemeToggle.tsx` React component (no new islands needed).

#### Scenario: Theme option icon
- **WHEN** the theme dropdown opens
- **THEN** each option shows its respective animated icon next to the label

#### Scenario: Theme icon hover
- **WHEN** user hovers over the "Dark" option
- **THEN** the `moon` animated icon plays its animation

### Requirement: Existing icon deprecation
The 5 existing custom SVG icon components (`IconArrowRight.astro`, `IconEmail.astro`, `IconGitHub.astro`, `IconLinkedIn.astro`, `IconDocument.astro`) SHALL be retained but marked as deprecated with a comment. They MUST NOT be deleted in this change.

#### Scenario: Deprecated icons still importable
- **WHEN** any component imports a deprecated icon (e.g., `IconEmail.astro`)
- **THEN** it still renders correctly — no build errors or runtime failures

#### Scenario: Deprecation notice
- **WHEN** a developer opens any of the 5 deprecated icon files
- **THEN** a comment at the top indicates the icon is deprecated in favor of AnimatedIcon
