<div align="center">

<img src="public/favicon.svg" alt="E." width="64" height="64" />

# hulsman.dev

**Portfolio and résumé of Ezra Hulsman**

[![Astro](https://img.shields.io/badge/Astro-7-ff5d01?logo=astro&logoColor=white)](https://astro.build) [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript&logoColor=white)](https://typescriptlang.org) [![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-f38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)

*Stone, ink and glass · Archivo · One WebGL shader · A real shell in the page*

[Live site](https://hulsman.dev) · [Résumé](https://hulsman.dev/resume) · [Projects](https://hulsman.dev/projects)

</div>

---

My personal site: what I build (ANNA, Henk, the homelab and a few side projects), what I write, and my résumé. Static-first with Astro and no UI framework, deployed on Cloudflare Workers with a server-side contact form.

## Stack

| Layer | Tool |
| --- | --- |
| Framework | [Astro](https://astro.build) 7, static output, no client framework |
| Styling | One stylesheet, `src/styles/stone.css`, with the design tokens as CSS custom properties |
| Glass | `src/scripts/glass/`: one WebGL shader that draws the ribbed and frosted panes and the soft lights behind them |
| Content | MDX with auto-discovery for project pages and blog posts |
| Deployment | Cloudflare Workers (static assets, plus the contact form via Resend) |
| Fonts | Archivo variable; the system monospace for code and the terminal |

## Getting started

```bash
npm install
npm run dev        # Astro dev server at localhost:4321
npm run build      # Production build to ./dist
npm run preview    # Preview the production build
```

For the contact form locally:

```bash
npx wrangler dev   # Runs the Cloudflare Worker locally
```

## Features

* **Glass project cards** on the homepage: four ribbed panes with soft lights behind them, on a 10 s loop that leans toward the pointer. Their colours settle as a faint tint in the name above them; on a phone the tint follows the swipe through the cards
* **Real conversations**: a frosted Teams window plays an actual ANNA exchange once when it scrolls into view; project pages each have a window of their own (Henk, Homelab, Finance Bot and others)
* **Interactive terminal** in the About section: a real shell parser with pipes, environment variables, a small virtual filesystem, tab completion and history
* **MDX project pages and posts** with auto-discovery and frontmatter-driven routing
* **Contact form** on Cloudflare Workers + Resend, with Turnstile and a honeypot
* **Print-ready résumé**: `/resume` prints clean; `scripts/generate-pdf.js` makes the PDF in CI
* **Reduced motion respected**: with it on, or on a device too slow for the glass, every pane holds still and every conversation shows finished

## Project structure

```tree
src/
├── components/stone/      # The pages' parts: hero, glass cards and windows, project and article layout
├── components/overzicht/  # The bar, the footer and the terminal (named after the previous design)
├── components/diagrams/   # Diagrams on the project pages
├── scripts/glass/         # The WebGL glass, the arrival, the pointer light, the ANNA window, the slow-device guard
├── scripts/               # The interactive terminal (vanilla TS)
├── config/                # site.ts, resume.ts, home.ts, glass.ts, pages.ts: the copy and the numbers
├── layouts/               # The page layout, ProjectLayout and BlogLayout for MDX
├── pages/                 # Homepage, /projects, /blog, /resume, /contact, rss.xml
├── lib/                   # Frontmatter, projects and posts helpers
├── styles/stone.css       # Tokens, pages, phone layout, print
└── worker.ts              # Cloudflare Worker for the contact form (Resend API)
scripts/
└── generate-pdf.js        # Playwright-based résumé PDF (CI)
tests/                     # node:test unit tests and Playwright browser tests (*.e2e.mjs)
```

## Configuration

The personal content lives in config files:

* **`src/config/site.ts`**: name, role, company, location, skills, social links, projects, SEO metadata
* **`src/config/resume.ts`**: experience, education, certifications, skill categories, languages
* **`src/config/home.ts`**: homepage copy, and the numbers on the project cards (each must match its project page)
* **`src/config/glass.ts`**: the cards' and pages' lights and colours

The rest of the site reads from them.

## MDX projects

Project pages live in `src/pages/projects/*.mdx`. Each file is auto-discovered and routed. Frontmatter controls display:

```yaml
---
title: "Project Name"
description: "Description for SEO and project cards"
date: 2025-01-01
tech: ["Python", "Docker", "Rust"]
github: "repo-name"           # or full URL
preview: "https://demo.com"   # optional live link
layout: "../../layouts/ProjectLayout.astro"
---
```

## The terminal

The About section holds a terminal window. After its intro types itself (or you click to skip it), you can type real commands:

* `help`: the full command list
* `cat resume`, `cat skills`, `cat education`: browse the content
* `ls projects/`, `cat projects/<name>`: explore the projects
* `cd resume`, `open contact`: go to a page
* `neofetch`, and a few easter eggs
* Tab completion and command history (arrow keys)

## Contact form

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

## Tests

```bash
npm test                                       # unit tests
npm run build && npx astro preview             # then, in another terminal:
BASE=http://localhost:4321 npm run test:e2e    # browser tests against the build (~5 min)
```

The browser tests run in two lanes. Most hold the glass light still (`?t=2.4`) and run four files at a time; the tests that need the light moving (the loop, the arrival, the pointer light, the slow-device guard) are in `*.live.e2e.mjs` and run one at a time. In CI each lane is split over several runners.

## PDF generation

The CI pipeline makes a PDF of the `/resume` page with Playwright:

```bash
npm run build
npx http-server ./dist -p 8180 &
node scripts/generate-pdf.js    # outputs dist/resume.pdf
```

The GitHub Actions workflow (`.github/workflows/build.yml`) runs this on every push to main and uploads the PDF as an artifact.

## Deployment

**Main is the deploy cycle.** Every push to `main` triggers Cloudflare Workers Builds, which
builds and deploys the Worker automatically; there is no manual deploy step. Verify a deploy
by checking the live site a minute or two after pushing, not by running wrangler.

The `wrangler.toml` holds the build command and asset directory; it exists for the Workers
Builds pipeline (and local `wrangler dev`), not for hand-run deploys.
