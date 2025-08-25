# Astro Resume Starter

Opinionated starter for a multi-page resume built with Astro + TypeScript + Tailwind + MDX + React islands.

## Features
- Astro (static-first)
- MDX for project case studies
- React islands for interactive demos
- Tailwind CSS
- Cloudflare-ready (static `dist` can be deployed to Cloudflare Pages or served via Workers)

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
- The `.github/workflows/build.yml` will build the site and upload the `dist` folder as a workflow artifact (useful as a simple CI step).
