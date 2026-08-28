import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/opentelemetry.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    outDir: 'dist/library',
    target: 'node18',
    sourcemap: true,
    splitting: false,
    external: ['@opentelemetry/api'],
  },
  {
    entry: ['src/cli.ts'],
    format: ['esm', 'cjs'],
    dts: false,
    clean: false,
    outDir: 'dist/library',
    target: 'node18',
    sourcemap: true,
    splitting: false,
    banner: { js: '#!/usr/bin/env node' },
  },
]);
