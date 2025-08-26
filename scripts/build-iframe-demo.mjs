#!/usr/bin/env node
import { build } from 'esbuild';
import { rmSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outFile = resolve(process.cwd(), 'public/react-demo-app.iife.js');
mkdirSync(dirname(outFile), { recursive: true });

const isProd = process.env.NODE_ENV === 'production' || process.env.BUILD === 'production';

const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: [resolve(process.cwd(), 'src/components/react-demo-app.tsx')],
  outfile: outFile,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2018'],
  minify: isProd,
  sourcemap: !isProd,
  loader: { '.ts': 'ts', '.tsx': 'tsx' },
  // React and ReactDOM are provided as globals by the HTML shell in the iframe.
  external: [],
};

// Only add watch option if actually watching
if (watch) {
  buildOptions.watch = {
    onRebuild(error) {
      if (error) console.error('Rebuild failed:', error);
      else console.log('Rebuilt iframe demo');
    }
  };
}

await build(buildOptions);
if (watch) console.log('Watching iframe demo...');
console.log(`Built iframe demo -> ${outFile}`);
