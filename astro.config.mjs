import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
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
    react()
  ],
  site: site.url,
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
      allowedHosts: true
    },
    preview: {
      host: true,
      allowedHosts: true
    }
  }
});
