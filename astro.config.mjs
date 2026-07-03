import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import site from './src/config/site';

export default defineConfig({
  integrations: [
    mdx({
      // Apply ProjectLayout to all MDX files in projects directory
      grayMatter: false,
      shikiConfig: {
        theme: 'github-dark'
      }
    }),
    react(),
    sitemap()
  ],
  // Canonical origin — drives sitemap absolute URLs and Astro.site. (Was `site.url`, which
  // never existed on the config object, so Astro.site was silently undefined.)
  site: site.seo.baseUrl,
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
