import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import site from './src/config/site';

export default defineConfig({
  integrations: [
    mdx({
      // Apply ProjectLayout to all MDX files in projects directory
      grayMatter: false,
      // both themes as CSS variables, no colour of their own: overzicht.css picks one with the
      // page's theme, on the sheet's own paper
      shikiConfig: {
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
      }
    }),
  ],
  site: site.url,
  // Astro 7 changed the default to 'jsx' whitespace stripping; keep HTML-rule collapsing for visual parity.
  compressHTML: true,
  markdown: {
    // Configure layout for MDX files
    layouts: {
      '*/projects/*.mdx': './src/layouts/ProjectLayout.astro'
    }
  },
  vite: {
    server: {
      host: true,
      port: 4321,
      allowedHosts: ['.arc8.dev', '.hulsman.dev'],
    },
    preview: {
      host: true,
      allowedHosts: ['.arc8.dev', '.hulsman.dev'],
    }
  }
});
