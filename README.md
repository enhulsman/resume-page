<div align="center">

<img src="public/favicon-h.svg" alt="EH" width="64" height="64" />

# hulsman.dev

**Portfolio & Resume for Ezra Hulsman**

[![Astro](https://img.shields.io/badge/Astro-5.16-ff5d01?logo=astro&logoColor=white)](https://astro.build) [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript&logoColor=white)](https://typescriptlang.org) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com) [![GSAP](https://img.shields.io/badge/GSAP-3.14-88ce02?logo=greensock&logoColor=white)](https://gsap.com) [![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-f38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)

*Warm amber palette · Syne + Outfit typography · Interactive terminal · Scroll animations*

[Live Site](https://hulsman.dev) · [Resume](https://hulsman.dev/resume) · [Projects](https://hulsman.dev/projects)

</div>

---

Personal portfolio and resume site. Static-first with Astro, animated with GSAP, deployed on Cloudflare Workers with a server-side contact form.

## Stack

| Layer | Tool |
| --- | --- |
| Framework | [Astro](https://astro.build) 5 — static-first, islands architecture |
| Styling | Tailwind CSS 3 with CSS custom properties for theming |
| Animation | GSAP ScrollTrigger, CSS keyframes |
| Content | MDX with auto-discovery for project case studies |
| Deployment | Cloudflare Workers (server-side contact form via Resend) |
| Fonts | Syne (display), Outfit (body), JetBrains Mono (code) |

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

* **Dark / Light themes** with system preference detection and manual toggle
* **Scroll-triggered animations** via GSAP ScrollTrigger
* **Interactive terminal** hidden in the About section — 25+ commands, tab completion, command history, easter eggs
* **MDX project pages** with auto-discovery and frontmatter-driven routing
* **Contact form** powered by Cloudflare Workers + Resend email API
* **Resume PDF generation** via Playwright (CI-ready)
* **Print-optimized styles** — `/resume` page generates a clean PDF without UI chrome
* **SEO** — Open Graph, Twitter Cards, structured metadata per page

## Project Structure

```tree
src/
├── components/          # Astro section components, icons/, ThemeToggle (React island)
├── scripts/             # Interactive terminal engine (vanilla TS, ~1100 lines)
├── config/              # site.ts (personal info, projects) + resume.ts (experience, education)
├── layouts/             # BaseLayout + ProjectLayout for MDX
├── pages/               # File-based routing — homepage, /resume, /contact, /projects/*.mdx
├── lib/                 # Theme utilities, Gravatar integration
├── styles/global.css    # Theme system, keyframes, print styles
└── worker.ts            # Cloudflare Worker for contact form (Resend API)
scripts/
└── generate-pdf.js      # Playwright-based resume PDF generation (CI-ready)
```

## Configuration

All personal content lives in two config files:

* **`src/config/site.ts`** — name, role, company, location, skills, social links, projects, employment status, SEO metadata
* **`src/config/resume.ts`** — experience timeline, education, certifications, skill categories, spoken languages

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
```

For local development, add these to `.dev.vars`. For production, use `npx wrangler secret put <KEY>`.

## PDF Generation

The CI pipeline generates a PDF of the `/resume` page using Playwright:

```bash
npm run build
npx http-server ./dist -p 8180 &
node scripts/generate-pdf.js    # outputs dist/resume.pdf
```

The GitHub Actions workflow (`.github/workflows/build.yml`) runs this automatically on push to main and uploads the PDF as an artifact.

## Deployment

```bash
npx wrangler deploy
```

Deploys to Cloudflare Workers. The `wrangler.toml` is configured with the build command and asset directory.
