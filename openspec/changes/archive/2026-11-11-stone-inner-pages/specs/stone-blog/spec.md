## ADDED Requirements

### Requirement: A post opens with its title and its description
A post's head SHALL show its `title` as the `h1` in Archivo 900 at full width and its `description` as the lead (Ezra, 2026-11-10, B1). Its facts SHALL be, in the article's sticky block: "Date" with the `date` as day, month and year in British English ("9 October 2026"), "Updated" with the `updated` date where the post has one, and "Reading" with its reading time in whole minutes ("4 min", from `readingMinutes`). There SHALL be no title block and no hanging heads.

#### Scenario: The head
- **GIVEN** `/blog/henk-watchdog` loaded at 1440x900
- **WHEN** the head is read
- **THEN** the `h1` reads "Is he asleep?", the lead equals the post's `description`, and no `table` exists in the article

#### Scenario: The facts
- **GIVEN** `/blog/spec-factory` loaded at 1440x900
- **WHEN** the facts are read
- **THEN** they are "Date" / "6 July 2026", "Updated" / "15 July 2026" and "Reading" / the post's `readingMinutes` followed by " min", in that order, each `time` carrying its ISO date

### Requirement: A post holds its project's window
A post SHALL show, at the top of the article's right column, the window `innerGlass` names for it: a post whose `project` is Henk shows Henk's Signal chat, except the henk-exactly-once post, which shows its own drawing (`PostHenkDrawing`) in a frosted pane instead (Ezra, 2026-11-10); the bible-tui post shows bible-tui's reader. Posts without a project (spec-factory, successor-scoreboard) have no window. The henk-exactly-once pane SHALL carry window dots and no title, glow in Henk's tide (`windowGlows.henk`), carry its own hatch and arrow definitions, plot in when in view, arrive drawn under reduced motion, and fit at every width.

#### Scenario: The window per post
- **GIVEN** each published post loaded at 1440x900
- **WHEN** the right column is read
- **THEN** henk-watchdog's opens with a frosted window titled `projectWindows.henk.title`, henk-exactly-once's with a frosted pane holding one `svg.dwg` and no `.post-dwg` beside the title, bible-tui's with a window titled `projectWindows.bible.title`, and spec-factory's and successor-scoreboard's hold no `[data-glass]`

#### Scenario: The post drawing fits
- **GIVEN** `/blog/henk-exactly-once` at 390x844
- **WHEN** the pane and its drawing are measured
- **THEN** the drawing lies inside its pane, the pane within 0..390 px, and the page has no sideways scroll

### Requirement: Fenced code sits in a frosted window
Every fenced code block in a post SHALL be shown in a frosted window with three dots and no title, over a glow of the post's project's light (`windowGlows.henk` for a Henk post; `windowGlows.cards` for a post without a project), its text in monospace in the opaque artefact ink (`#3a3632`), wrapping rather than scrolling the page sideways. Inline code SHALL stay on stone.

#### Scenario: henk-watchdog's log line
- **GIVEN** `/blog/henk-watchdog` loaded at 1440x900
- **WHEN** its fenced code is inspected
- **THEN** each `pre` sits inside a `data-glass="frosted"` window with three dots and an empty title, inside a moment `data-glass-moment="code"`, its glow uses Henk's tide colours, its text equals the MDX block's text, and no inline `code` outside a `pre` has an ancestor with `data-glass`

#### Scenario: Code on a phone
- **GIVEN** `/blog/henk-watchdog` at 390x844
- **WHEN** the code windows are measured
- **THEN** each lies within 0..390 px and the page has no sideways scroll

### Requirement: A post's project stands beside it
A post with a `project` SHALL end its sticky block with that project: its hero card's index in its hue ink where it has one, its listing's title as a link to its page, its `what` line and its `status`; and its numbers list SHALL hold that project's first `dims` entry. On a phone the project comes after the prose.

#### Scenario: Henk beside the watchdog post
- **GIVEN** `/blog/henk-watchdog` loaded at 1440x900
- **WHEN** the block's project is read
- **THEN** it shows "02" in Henk's hue ink, a link to `/projects/Henk` reading Henk's listing title, Henk's `what` and `status`, and the number "4" with "egress ports, zero inbound"

#### Scenario: A project without a card
- **GIVEN** `/blog/bible-tui` loaded
- **WHEN** the block's project is read
- **THEN** it has no index, links to `/projects/BibleTui`, and shows bible-tui's `what` and `status`

### Requirement: "Other writing" for a post on its own
A post with neither a window nor a project SHALL end its sticky block with "Other writing" (approved): the three newest other published posts (drafts, whose file starts with `_`, never), newest first, each its title as a link and its date. A post with a window or a project SHALL NOT show it. The choice and the list are made by `otherWriting(posts, self)` in `src/lib/article.ts`. On a phone it comes after the prose.

#### Scenario: On spec-factory
- **GIVEN** `/blog/spec-factory` loaded at 1440x900
- **WHEN** the block is read
- **THEN** it ends with "Other writing" and three links, in order to `/blog/henk-watchdog`, `/blog/bible-tui` and `/blog/henk-exactly-once`, each with its title and its date ("9 October 2026", "16 September 2026", "28 August 2026")

#### Scenario: Not where there is a window or a project
- **GIVEN** `/blog/henk-watchdog`, `/blog/henk-exactly-once` and `/blog/bible-tui` loaded
- **WHEN** their blocks are read
- **THEN** none contains "Other writing"

#### Scenario: The function
- **GIVEN** `otherWriting` in a unit test with five published posts, one draft dated after all of them, and the post itself among the newest
- **WHEN** it is called for a post without a project or window, and for one with a project
- **THEN** the first call returns three posts, newest first, without the post itself or the draft; the second returns none

### Requirement: /blog is the titles, large
/blog SHALL show the heading "Blog" as the `h1`, the line "Notes on infrastructure, tooling, and the occasional detour.", then every published post newest first, from `diaryEntries`: its date small above, its title as an `h2` link in Archivo 900 set large (between 36 and 64 px), and its `description` as the lead under it, each post between hairlines with generous space (Ezra, 2026-11-10, BI2).

#### Scenario: Every post, newest first
- **GIVEN** `/blog` loaded at 1440x900
- **WHEN** the list is read
- **THEN** it has one entry per published post (five), in date order newest first (henk-watchdog, bible-tui, henk-exactly-once, successor-scoreboard, spec-factory), each with a `time` carrying its ISO date, an `h2` link to the post whose computed weight is 900 and size between 36 and 64 px, and the post's `description`

#### Scenario: On a phone
- **GIVEN** `/blog` at 390x844
- **WHEN** the entries are measured
- **THEN** each lies within 0..390 px, titles wrap rather than overflow, and the page has no sideways scroll

### Requirement: /blog's lights
/blog SHALL carry the blog's page light (`pageLights.blog`, the tide) far behind its heading, as `stone-inner-pages` requires of page lights. A post title SHALL light up on hover or keyboard focus with a soft glow of its project's light (`projectLights`; Henk's posts the tide, the bible-tui post its amber) far behind the words, fading in; a post without a project SHALL have no such glow. Under reduced motion the glow appears without a transition.

#### Scenario: The head light is the tide
- **GIVEN** `/blog` loaded at 1440x900
- **WHEN** the head's light is read
- **THEN** there is one `[data-page-light]` element behind the `h1`, `aria-hidden="true"`, whose background holds only `pageLights.blog`'s colours

#### Scenario: A title's light on hover
- **GIVEN** `/blog` loaded at 1440x900
- **WHEN** the mouse rests on "Is he asleep?", then on "The successor scoreboard", then leaves
- **THEN** on the first the title's glow reaches an opacity above 0.5 and its background holds `projectLights.henk`'s near colour; on the second (no project) no glow shows; after leaving every glow is back at opacity 0 (the test waits on the computed opacity, never on a fixed time)

#### Scenario: By keyboard, and still
- **GIVEN** `/blog` at 1440x900, then with reduced motion
- **WHEN** the bible-tui post's title is focused with Tab
- **THEN** its glow shows, its background holding `projectLights.bible`'s near colour (the amber); with reduced motion its `transition-duration` is 0s
