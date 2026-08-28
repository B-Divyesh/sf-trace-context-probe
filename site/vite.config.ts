import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: siteRoot,
  publicDir: resolve(siteRoot, 'public'),
  build: {
    outDir: resolve(siteRoot, '../dist/site'),
    emptyOutDir: false,
    target: 'es2022',
    assetsInlineLimit: 2048,
  },
});
