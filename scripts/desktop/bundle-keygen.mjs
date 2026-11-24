/** Builds the key generator window (vendor tool) into build-keygen/. */
import { build } from 'esbuild';
import fs from 'fs';

fs.mkdirSync('build-keygen', { recursive: true });
await build({
  entryPoints: ['keygen-app/main.ts'],
  outfile: 'build-keygen/main.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['electron'],
  logLevel: 'info'
});
// Sandboxed preload: CommonJS
await build({
  entryPoints: ['keygen-app/preload.ts'],
  outfile: 'build-keygen/preload.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  logLevel: 'info'
});
fs.copyFileSync('keygen-app/index.html', 'build-keygen/index.html');
fs.copyFileSync('build-resources/icon.png', 'build-keygen/icon.png');
