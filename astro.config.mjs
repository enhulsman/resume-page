import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

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
  site: 'https://hulsman.dev',
  markdown: {
    // Configure layout for MDX files
    layouts: {
      '*/projects/*.mdx': './src/layouts/ProjectLayout.astro'
    }
  }
});
