# Resume Page

Opinionated starter for a multi-page resume built with Astro + TypeScript + Tailwind + MDX + React islands.

## Features
- Astro (static-first) with TypeScript
- MDX for project case studies with auto-discovery
- React islands for interactive components
- Tailwind CSS with custom theme system
- Contact form with Resend email integration
- Dark/light/Gruvbox themes to pick from
- Gravatar integration with fallback avatar
- Responsive design with mobile-first approach
- Cloudflare Workers deployment (`wrangler.toml` included)

## Quick start

```bash
npm install
npm run dev
```

For contact form development:

```bash
npx wrangler dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Contact Form

The contact form is powered by Cloudflare Workers and Resend. To set it up:

1. Create a [Resend](https://resend.com) account and get an API key
2. Add environment variables to `.dev.vars`:
   ```
   TO_EMAIL=your-email@example.com
   FROM_EMAIL=contact@your-domain.com
   FROM_NAME=Your Contact Form
   RESEND_API_KEY=re_your_api_key_here
   ```
3. For production, use Wrangler secrets:
   ```bash
   npx wrangler secret put TO_EMAIL
   npx wrangler secret put FROM_EMAIL
   npx wrangler secret put FROM_NAME
   npx wrangler secret put RESEND_API_KEY
   ```

## Project Structure

```
src/
├── components/          # Reusable Astro and React components
│   ├── CodeDemo.tsx    # Interactive React demo component
│   ├── ThemeToggle.tsx # Theme switcher (React island)
│   └── ...
├── layouts/            # Page layouts
│   ├── BaseLayout.astro     # Main layout with nav/footer
│   └── ProjectLayout.astro  # MDX project case study layout
├── pages/              # File-based routing
│   ├── contact.astro   # Contact form with worker integration
│   ├── projects/       # Auto-discovered MDX case studies
│   └── ...
├── config/             # Site configuration
│   └── site.ts        # Personal info, skills, social links
└── worker.ts          # Cloudflare Worker for contact form
```

## Configuration

Edit `src/config/site.ts` to update your personal information, skills, and social links. This file controls:
- Name, role, and location in the header
- Skills badges on the homepage  
- Social links in footer
- Email address for contact form
- Employment status indicator with theme-aware colors

### Employment Status

The site includes a dynamic employment status indicator that changes text and color based on your employment status, and also adapts to each theme:

```typescript
employment: {
  status: 'employed-open', // 'available' | 'employed-open'
  // ...
}
```

- **`'available'`**: Green across all themes - "Available for new opportunities"
- **`'employed-open'`**: Blue (light/dark) or Yellow (gruvbox) - "Currently employed • Open to connect"

## Deploy

```bash
npx wrangler deploy
```

## Notes

- Put a `resume.pdf` file in `public/` to make it available at `/resume.pdf`.
- There's an example `CodeDemo` React island under `src/components` used in `src/pages/projects/project-foo.mdx`.
- There's a `generate-pdf.js` script in `scripts/`, that uses Playwright to scrape your live server and generate PDFs from the relevant pages.
- The `.github/workflows/build.yml` will build the site, run the `generate-pdf.js` script, and upload both those generated resumes + the one you put in `/public/resume.pdf` and the `dist` folder as a workflow artifact.
