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
      host: true, // Allow external connections
      port: 4321, // Explicitly set the port
      allowedHosts: [
        'npm-dev.arc8.dev',
        'localhost',
        '127.0.0.1'
      ]
    }
  }
});
