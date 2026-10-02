// Shared by the WASM compilation tests in Node.
// Every *.typst.test.ts file gets its own WASM module (Vitest isolates files), and the
// compiler module keeps about 25 MB of memory per compilation and dies after about 146.
// That's why the tests are split into files, each well below that threshold.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, expect } from 'vitest';
import { defaultConfig, type NotebookConfig, type Section } from '../notebook/config';
import { toTypst } from '../notebook/typst';
import { FONT_FILES } from './fonts';
import { TYPST_ASSETS, TYPST_SOURCES } from './sources';
import { TypstEngine, firstError, pdfPageCount, type CompileOutput } from './engine';

const require = createRequire(import.meta.url);
const wasmPath =
  require.resolve('@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm');

export let engine: TypstEngine;

export function setupEngine() {
  beforeAll(async () => {
    engine = await TypstEngine.create({
      wasm: new Uint8Array(readFileSync(wasmPath)),
      fonts: FONT_FILES.map((f) => new Uint8Array(readFileSync(f))),
      sources: TYPST_SOURCES,
      assets: TYPST_ASSETS,
    });
  });
}

export async function compilePdf(cfg: NotebookConfig): Promise<CompileOutput & { pages: number }> {
  const out = await engine.compile(toTypst(cfg), 'pdf');
  expect(firstError(out.diagnostics), JSON.stringify(out.diagnostics)).toBeUndefined();
  expect(out.artifact).toBeDefined();
  return { ...out, pages: pdfPageCount(out.artifact!) };
}

export function only(cfg: NotebookConfig, types: Section['type'][]): NotebookConfig {
  return {
    ...cfg,
    sections: cfg.sections.map((s) => ({ ...s, enabled: types.includes(s.type) })),
  };
}

// All sections at once don't fit in 32 pages, so the notes get a fixed
// 28 pages (filling the rest would give them 0 and they'd drop out of the layout).
export function allEnabled(): NotebookConfig {
  const cfg = defaultConfig(2027);
  return {
    ...cfg,
    sections: cfg.sections.map((s) =>
      s.type === 'notes' ? { ...s, enabled: true, fill: false } : { ...s, enabled: true },
    ),
  };
}
