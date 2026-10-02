/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// The website imports lib/, templates/, fonts/ and assets/ from the parent directory
// (the same files the CLI uses), so the dev server needs access to them.
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// WASM compiler size for the progress bar: the server usually sends it compressed,
// so content-length doesn't say how many bytes arrive after decompression.
const compilerWasmBytes = statSync(
  createRequire(import.meta.url).resolve(
    '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
  ),
).size;

export default defineConfig({
  // relative paths: the site works under any address (e.g. GitHub Pages /notebook/)
  base: './',
  plugins: [react(), tailwindcss()],
  define: { __COMPILER_WASM_BYTES__: compilerWasmBytes },
  server: { fs: { allow: [repoRoot] } },
  worker: { format: 'es' },
  optimizeDeps: {
    // wasm-bindgen packages load .wasm via import.meta.url, pre-bundling breaks that
    exclude: [
      '@myriaddreamin/typst.ts',
      '@myriaddreamin/typst-ts-web-compiler',
      '@myriaddreamin/typst-ts-renderer',
    ],
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.typst.test.ts'],
          setupFiles: ['src/test/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          // real Typst compilation (WASM) in Node: slower, a separate project
          name: 'typst',
          environment: 'node',
          include: ['src/**/*.typst.test.ts'],
          testTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/**/*.worker.ts'],
    },
  },
});
