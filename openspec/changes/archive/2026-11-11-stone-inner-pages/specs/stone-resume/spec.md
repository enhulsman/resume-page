## ADDED Requirements

### Requirement: The résumé's head
/resume SHALL open with `site.name` as the `h1` in Archivo 900, the role line (`site.role`, the joining word "at" from `pageWords`, a link to `site.social.employer` reading `site.company`, " · ", `site.location` without its flag emoji), `site.summary` as the lead, and four actions: "Request my full CV" as the one filled pill (ink ground, stone text) linking to /contact, "Email me" (`mailto:` `site.social.email`), "LinkedIn" and "GitHub" (`site.social`). The labels come from `pageWords`. The résumé's page light (`pageLights.resume`, the sunset) SHALL sit far behind the name, as `stone-inner-pages` requires of page lights (Ezra, 2026-11-10).

#### Scenario: The head
- **GIVEN** /resume loaded at 1440x900
- **WHEN** the head is read
- **THEN** the `h1` reads `site.name`, the role line reads "Forward Deployed Engineer at Anamata · Utrecht, NL" with no flag, the lead equals `site.summary`, and the actions are "Request my full CV" (href `/contact`, background the ink colour), "Email me" (href `mailto:` + `site.social.email`), "LinkedIn" and "GitHub" with `site.social`'s hrefs

#### Scenario: The sunset behind the name
- **GIVEN** /resume loaded at 1440x900
- **WHEN** the head's light is read
- **THEN** there is one `[data-page-light]` element behind the `h1`, `aria-hidden="true"`, whose background holds only `pageLights.resume`'s colours

### Requirement: Years as the spine
The heading "Experience" SHALL be followed by the two groups, each under its small heading: "Consultant via Anamata (2023 – present)" (with "Anamata" a link to https://anamata.nl) and "Prior Experience"; in each group every `experience` entry of that group in `resume.ts` order, as a row: on the left its `startDate` set large (a figure in Archivo 800 or more, tabular) with "– " and its `endDate` or "– present" under it; on the right its `role` with its `client` beside it in a lighter weight, and its `summary` under them (Ezra, 2026-11-10, R3). There SHALL be no revision letters. At 760 px and below the years sit on one line above the role.

#### Scenario: The rows
- **GIVEN** /resume loaded at 1440x900
- **WHEN** the Experience rows are read
- **THEN** there is one row per `experience` entry in `resume.ts` order, the first group's five rows under "Consultant via Anamata (2023 – present)" and the last two under "Prior Experience"; the first row's large year reads "2025" with "– present" under it beside "Forward Deployed Engineer" and "Anamata"; the large years' computed weight is at least 800; and no element has class `rev` or text matching `/^[A-G]$/` in a row's first cell

#### Scenario: On a phone
- **GIVEN** /resume at 390x844
- **WHEN** a row is measured
- **THEN** its years stand on one line above the role, every row lies within 0..390 px, and the page has no sideways scroll

### Requirement: Skills, education and certifications as rows
After Experience the page SHALL show "Skills" (first "Languages" with `spokenLanguages` as "name (level)" joined by " · ", then each `skillCategories` label with its items joined by " · "), "Education" (each `education` entry as "startYear – endYear" | "degree — institution", with its result and GPA under it where it has them) and "Certifications" (each as "year" | "name — institution", with its credential under it), as hairline rows of type: two columns side by side wider than 760 px (Skills left, Education and Certifications right), one column at 760 px and below.

#### Scenario: The rows from config
- **GIVEN** /resume loaded at 1440x900
- **WHEN** the three sections are read
- **THEN** their headings are "Skills", "Education", "Certifications"; Skills' first row is "Languages" with every spoken language; each `skillCategories`, `education` and `certifications` entry has one row with its values from `resume.ts`; Skills stands left of Education

#### Scenario: One column on a phone
- **GIVEN** /resume at 390x844
- **WHEN** the sections are measured
- **THEN** Education's top is below Skills' bottom and each row's label stands above its value

#### Scenario: Headings a screen reader can jump to
- **GIVEN** /resume loaded
- **WHEN** its headings are read
- **THEN** "Experience", "Skills", "Education" and "Certifications" are `h2`s and the two group headings are `h3`s

### Requirement: It still prints on white
Printed, /resume SHALL be black type on white: no bar, footer, skip link, actions or page light, and no colour ground.

#### Scenario: Print
- **GIVEN** /resume emulated for print (`page.emulateMedia({ media: 'print' })`)
- **WHEN** the page is read
- **THEN** the body's background is white, the bar, footer, actions and `[data-page-light]` have `display: none`, and every role and every certification is present
