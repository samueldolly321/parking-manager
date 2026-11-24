/**
 * Builds the two files of the desktop version:
 *   build/server.mjs  the application server (same code as the web version), in one file
 *   build/main.mjs    the Electron launcher (database + server + window)
 * The PostgreSQL programs (@embedded-postgres/windows-x64) stay as they are: they are copied by electron-builder.
 */
import { build } from 'esbuild';

// Some bundled CommonJS libraries call require(): give them one in the ES module output
const banner = {
  js: "import { createRequire as __pmCreateRequire } from 'module';\nconst require = __pmCreateRequire(import.meta.url);"
};

const common = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  banner,
  logLevel: 'info',
  legalComments: 'none'
};

await build({
  ...common,
  entryPoints: ['server.ts'],
  outfile: 'build/server.mjs',
  // vite: development only; pg-native: optional, unused
  external: ['vite', 'pg-native', 'lightningcss', 'fsevents']
});

await build({
  ...common,
  entryPoints: ['electron/main.ts'],
  outfile: 'build/main.mjs',
  external: ['electron', '@embedded-postgres/*', 'pg-native']
});
