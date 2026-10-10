<div align="center">

<img src="public/favicon-h.svg" alt="EH" width="64" height="64" />

# hulsman.dev

**Portfolio & Resume for Ezra Hulsman**

[![Astro](https://img.shields.io/badge/Astro-7-ff5d01?logo=astro&logoColor=white)](https://astro.build) [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript&logoColor=white)](https://typescriptlang.org) [![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-f38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)

*The site as a drawing set · Archivo + B612 Mono · An orthographic renderer on canvas · Interactive terminal*

[Live Site](https://hulsman.dev) · [Resume](https://hulsman.dev/resume) · [Projects](https://hulsman.dev/projects)

</div>

---

Personal portfolio and resume site, drawn as an architect's drawing set ("Overzicht"). Static-first with Astro, no UI framework, deployed on Cloudflare Workers with a server-side contact form.

## Stack

| Layer | Tool |
| --- | --- |
| Framework | [Astro](https://astro.build) 7, static output, no client framework |
| Styling | One stylesheet, `src/styles/overzicht.css`, with the design tokens as CSS custom properties |
| Drawing | `src/scripts/overzicht/scene.js`, a small orthographic renderer on canvas 2D; SVG for the detail drawings |
| Content | MDX with auto-discovery for project case studies and blog posts |
| Deployment | Cloudflare Workers (server-side contact form via Resend) |
| Fonts | Archivo variable (lettering), B612 Mono (dimensions, title blocks, data) |

## Getting Started

```bash
npm install
npm run dev        # Astro dev server at localhost:4321
npm run build      # Production build to ./dist
npm run preview    # Preview production build locally
```

For the contact form locally:

```bash
npx wrangler dev   # Runs the Cloudflare Worker locally
```

## Features

* **Two themes**, whiteprint (light) and light table (dark), following the system until you choose one
* **ANNA drawn as a section** through one real request, that turns into an exploded axonometric as you scroll; the page only reads the scroll position, it never takes it over
* **Every page a sheet in the set**: the same frame, bar and title blocks; projects as a drawing register, experience as a revision table, contact as a transmittal
* **Interactive terminal** in the About section: 42 commands, pipes, tab completion, history
* **MDX project pages and posts** with auto-discovery and frontmatter-driven routing
* **Contact form** powered by Cloudflare Workers + Resend, with Turnstile and a honeypot
* **Print-ready résumé**: `/resume` prints on white without the sheet's chrome; `scripts/generate-pdf.js` makes the PDF in CI
* **Reduced motion respected**: drawings arrive drawn, nothing plots or types itself

## Project Structure

```tree
src/
├── components/overzicht/  # The sheets: bar, foot, ANNA section and plate, details, register, terminal
│   └── drawings/          # The four detail drawings (SVG)
├── components/diagrams/   # Case-study diagrams, drawn in the same tokens
├── scripts/overzicht/     # chrome.js (every page), main.js (homepage), plate.js (ANNA plate), scene.js
├── scripts/               # Interactive terminal engine (vanilla TS)
├── config/                # site.ts, resume.ts, home.ts (homepage and /projects copy)
├── layouts/               # OverzichtLayout (every page), ProjectLayout and BlogLayout for MDX
├── pages/                 # Homepage, /projects, /blog, /resume, /contact, rss.xml
├── lib/                   # Theme and frontmatter helpers
├── styles/overzicht.css   # Tokens, sheets, phone layout, print
└── worker.ts              # Cloudflare Worker for the contact form (Resend API)
scripts/
└── generate-pdf.js        # Playwright-based resume PDF generation (CI-ready)
tests/                     # node:test unit tests; *.e2e.mjs need a dev server on :4321
```

## Configuration

All personal content lives in three config files:

* **`src/config/site.ts`** — name, role, company, location, skills, social links, projects, employment status, SEO metadata
* **`src/config/resume.ts`** — experience timeline, education, certifications, skill categories, spoken languages
* **`src/config/home.ts`** — homepage copy, the drawn projects and their dimensions (every number must match its case study), the register

To update content, edit these files. The rest of the site reads from them.

## MDX Projects

Project case studies live in `src/pages/projects/*.mdx`. Each file is auto-discovered and routed. Frontmatter controls display:

```yaml
---
title: "Project Name"
description: "Description for SEO and project cards"
date: 2025-01-01
tech: ["Python", "Docker", "Rust"]
github: "repo-name"           # or full URL
preview: "https://demo.com"   # optional live link
layout: "../../layouts/ProjectLayout.astro"
showcase: true                # appears on homepage
---
```

Projects with `showcase: true` appear on the homepage. All projects appear in the `/projects` gallery.

## The Terminal

The About section contains an interactive terminal disguised as a decorative element. After the typing animation plays (or is skipped by clicking), visitors can type real commands:

* `help` — full command list
* `cat resume`, `cat skills`, `cat education` — browse content
* `ls projects/`, `cat projects/<name>` — explore projects
* `cd resume`, `open contact` — navigate to pages
* `neofetch` — ASCII art info card
* `sudo hire-me`, `cowsay`, `fortune`, `sl`, `matrix` — easter eggs
* Tab completion and command history (arrow keys)

## Contact Form

The contact form runs on Cloudflare Workers with the Resend API. Environment variables needed:

```env
TO_EMAIL=your-email@example.com
FROM_EMAIL=contact@your-domain.com
FROM_NAME=Your Contact Form
RESEND_API_KEY=re_your_api_key_here
TURNSTILE_SECRET_KEY=0x4AAAAAA_your_turnstile_secret
```

For local development, add these to `.dev.vars`. For production, set them as Worker secrets
(dashboard: Worker → Settings → Variables and Secrets, or `npx wrangler secret put <KEY>`).

Spam protection is layered: a [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
widget (site key in `src/config/site.ts`, verified server-side in `src/worker.ts`), a honeypot
field, and a minimum fill time. The worker fails closed when `TURNSTILE_SECRET_KEY` is missing.
For the dev server the always-passing Turnstile test key is used automatically.

Run the unit tests with `npm test`, and the end-to-end checks with `npm run test:e2e` against a running dev server.

## PDF Generation

The CI pipeline generates a PDF of the `/resume` page using Playwright:

```bash
npm run build
npx http-server ./dist -p 8180 &
node scripts/generate-pdf.js    # outputs dist/resume.pdf
```

The GitHub Actions workflow (`.github/workflows/build.yml`) runs this automatically on push to main and uploads the PDF as an artifact.

## Deployment

**Main is the deploy cycle.** Every push to `main` triggers Cloudflare Workers Builds, which
builds and deploys the Worker automatically — there is no manual deploy step, ever. Verify a
deploy by checking the live site a minute or two after pushing, not by running wrangler.

The `wrangler.toml` is configured with the build command and asset directory; it exists for
the Workers Builds pipeline (and local `wrangler dev`), not for hand-run deploys.
