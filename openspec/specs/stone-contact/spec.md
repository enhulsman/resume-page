# stone-contact Specification

## Purpose
TBD - created by archiving change stone-inner-pages. Update Purpose after archive.
## Requirements
### Requirement: The message is written in a frosted window
/contact SHALL show (Ezra, 2026-11-10, C2 wide): on the left the `h1` "Get in touch", `site.contactMessage` as the lead, and under it the address `site.social.email` set large as a `mailto:` link with "LinkedIn" and "GitHub" (`homeSections.contact` labels, `site.social` hrefs) under it; on the right the form inside a frosted window titled "New message" (approved), over the moss's glow (`windowGlows.moss`, built from `pageLights.contact`, the bar's Contact light: Ezra, 2026-11-10, "the bar mapping carries into the pages"), in the moment `data-glass-moment="compose"`. From 980 px the two columns SHALL be `0.78fr` and `1.22fr` and the window as wide as its column up to 820 px. Below 980 px the page SHALL read: heading and lead, the window, then the address and its links.

#### Scenario: Wide
- **GIVEN** /contact loaded at 1440x900
- **WHEN** the columns are measured
- **THEN** the window stands right of the heading, its width is at most 820 px and at least 1.4 times the left column's width, its title reads "New message", a `[data-glow]` sits beneath it whose lights are only `pageLights.contact`'s near and deep colours (the moss), and the address link (href `mailto:` + `site.social.email`) stands in the left column under the lead

#### Scenario: The 980 px boundary
- **GIVEN** /contact loaded at 980x900 and at 979x900
- **WHEN** the window and the heading are measured
- **THEN** at 980 the window stands right of the heading; at 979 the window's top is below the lead's bottom and the address's top below the window's bottom

#### Scenario: On a phone
- **GIVEN** /contact at 390x844
- **WHEN** the page is measured
- **THEN** the order is heading, lead, window, address; the window lies within 0..390 px; the page has no sideways scroll

### Requirement: The form works as before
The form inside the window SHALL keep its fields, names and behaviour: "Name", "Email" and "Message" (labelled, required), the hidden honeypot (`website`, `tabindex="-1"`, `aria-hidden`), the `elapsed` field, the Cloudflare Turnstile widget rendered explicitly in its light theme, the "Send Message" button with its "Sending..." state, the `role="status"` line, and the POST to `/api/contact` with the same body. Its words come from `pageWords`; no word changes. The Worker is not changed.

#### Scenario: The fields
- **GIVEN** /contact loaded
- **WHEN** the form is read
- **THEN** it has labelled required inputs `name`, `email` (type email) and `message` (a textarea), a honeypot input `website` that is not visible and has `tabindex="-1"`, a hidden `elapsed` input, a `#turnstile-container`, a submit button reading "Send Message", and a `#statusMessage` with `role="status"`, all inside the `data-glass="frosted"` window

#### Scenario: A send, mocked
- **GIVEN** /contact loaded with `/api/contact` and the Turnstile script intercepted (the request answered `{ "success": true }`, Turnstile replaced by a stub that yields a token)
- **WHEN** the three fields are filled and the button is pressed
- **THEN** one POST reaches `/api/contact` with the name, email, message, `elapsed` and the Turnstile token, the button shows "Sending..." while it waits, and the status line shows the success text

#### Scenario: A failed send
- **GIVEN** the same page with `/api/contact` answered with status 500 and an error message
- **WHEN** the form is sent
- **THEN** the status line shows the error, carries `data-kind="error"`, and its colour is `--glass-ink-red`

### Requirement: The form on glass reads clearly
Every text inside the window (title, labels, typed text, button, status line, success and error) SHALL reach 4.5:1 against the pixels behind it; the inputs' outlines SHALL reach 3:1 against what is around them; the labels use the opaque artefact ink (`#3a3632`) and the error the opaque `--glass-ink-red`. A focused input SHALL show a 2 px ink ring.

#### Scenario: Measured
- **GIVEN** /contact at 1440x900 and at 390x844 (one page, resized), Turnstile's script stubbed, the fields filled and, separately, the status line showing the success and the error text
- **WHEN** each text's colour is read, all the window's text is made transparent at once, and the pixels behind each box are sampled from one screenshot per state and width; and each input's outline colour is compared with the pixels just outside it
- **THEN** every text reaches 4.5:1 and every outline 3:1

#### Scenario: Focus
- **GIVEN** /contact loaded
- **WHEN** the Name input is focused with Tab
- **THEN** its computed `box-shadow` or `outline` draws a 2 px ring in the ink colour

### Requirement: The transmittal leaves
/contact SHALL NOT show the stamp ("Issued for conversation"), the transmittal sheet, or the line "Prefer your own mail app? Write to …": the address set large beside the form takes its place.

#### Scenario: Gone
- **GIVEN** /contact loaded
- **WHEN** the page is read
- **THEN** there is no `.stamp`, no `.transmittal`, no `.tm-mail`, and the text contains neither "Issued for" nor "Prefer your own mail app"

