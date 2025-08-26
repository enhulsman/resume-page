# Resume Page

Opinionated starter for a multi-page resume built with Astro + TypeScript + Tailwind + MDX + React islands.

## Features
- Astro (static-first)
- MDX for project case studies
- React islands for interactive demos
- Tailwind CSS
- Cloudflare-ready (`wrangler.toml` can be used to deployed to Cloudflare Workers)

## Quick start

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Notes

- Put a `resume.pdf` file in `public/` to make it available at `/resume.pdf`.
- There's an example `CodeDemo` React island under `src/components` used in `src/pages/projects/project-foo.mdx`.
- There's a `generate-pdf.js` script in `scripts/`, that uses Playwright to scrape your live server and generate PDFs from the relevant pages.
- The `.github/workflows/build.yml` will build the site, run the `generate-pdf.js` script, and upload both those generated resumes + the one you put in `/public/resume.pdf` and the `dist` folder as a workflow artifact.
