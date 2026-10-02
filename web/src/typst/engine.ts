// The Typst compiler (WASM) with the repository files loaded.
// Used by the web worker in the browser and by the integration tests in Node.

import { createTypstCompiler, initOptions, loadFonts } from '@myriaddreamin/typst.ts';
import type { TypstCompiler } from '@myriaddreamin/typst.ts';
import initCompilerWasm from '@myriaddreamin/typst-ts-web-compiler';
import type { SectionMark } from '../notebook/ranges';
import { PAGES_PDF_PATH, toImposeTypst, type ImposeMode } from '../notebook/print';
import { MAIN_PATH, type TypstInput } from '../notebook/typst';

export type OutputFormat = 'vector' | 'pdf';

export type { SectionMark };

export interface Diagnostic {
  severity: string;
  message: string;
  path: string;
  range: string;
}

export interface CompileOutput {
  artifact?: Uint8Array;
  diagnostics: Diagnostic[];
  sections: SectionMark[];
  // last content page (the <nb-end> marker), before padding to the volume
  contentPages?: number;
}

export interface EngineOptions {
  wasm: Uint8Array | ArrayBuffer | (() => Promise<Uint8Array | ArrayBuffer>);
  fonts: Uint8Array[];
  sources: Record<string, string>;
  assets: Record<string, string>;
}

export class TypstEngine {
  private constructor(
    private readonly compiler: TypstCompiler,
    private readonly memory: WebAssembly.Memory | undefined,
  ) {}

  static async create(opts: EngineOptions): Promise<TypstEngine> {
    const compiler = createTypstCompiler();
    const wasm = opts.wasm;
    await compiler.init({
      getModule: () => (typeof wasm === 'function' ? wasm() : wasm),
      beforeBuild: [initOptions.disableDefaultFontAssets(), loadFonts(opts.fonts)],
    });
    for (const [path, src] of Object.entries(opts.sources)) compiler.addSource(path, src);
    const enc = new TextEncoder();
    for (const [path, src] of Object.entries(opts.assets))
      compiler.mapShadow(path, enc.encode(src));
    // The WASM module is already initialised, so init() just returns its exports (with memory).
    const exports = await initCompilerWasm().catch(() => undefined);
    return new TypstEngine(compiler, exports?.memory);
  }

  // WASM memory size in bytes. The typst.ts compiler (0.8.0-rc3) never clears
  // the comemo caches, so memory grows with every compilation (tens of MB)
  // and never shrinks; at ~4 GB the compiler dies with "RuntimeError: unreachable".
  // The worker reports this size, and the client replaces it with a fresh one in time (client.ts).
  memoryBytes(): number | undefined {
    return this.memory?.buffer.byteLength;
  }

  async compile(input: TypstInput, format: OutputFormat): Promise<CompileOutput> {
    for (const [path, src] of Object.entries(input.files)) this.compiler.addSource(path, src);
    const snapshot = { mainFilePath: MAIN_PATH, root: '/', inputs: input.inputs };
    return this.compiler.runWithWorld(snapshot, async (world) => {
      const res = await world[format]({ diagnostics: 'full' });
      const diagnostics = (res.diagnostics ?? []) as Diagnostic[];
      if (!res.result) return { diagnostics, sections: [] };
      let sections: SectionMark[];
      let contentPages: number | undefined;
      // queries are only auxiliary: missing markers don't block the preview
      try {
        sections = await world.query<SectionMark[]>({ selector: '<nb-section>', field: 'value' });
      } catch {
        sections = [];
      }
      try {
        const end = await world.query<{ page: number }[]>({ selector: '<nb-end>', field: 'value' });
        contentPages = end.at(-1)?.page;
      } catch {
        contentPages = undefined;
      }
      return { artifact: res.result, diagnostics, sections, contentPages };
    });
  }

  // Printing: a PDF of the insert's pages, and from it the sheets in the given modes (impose.typ).
  // pagesInput must have the 'print' config (a real sheet), because impose.typ reads it.
  async print(
    pagesInput: TypstInput,
    imposeSource: string,
    modes: readonly ImposeMode[],
  ): Promise<PrintOutput> {
    const pages = await this.compile(pagesInput, 'pdf');
    const err = firstError(pages.diagnostics);
    if (err || !pages.artifact) throw new Error(err ?? 'Compilation returned no page PDF');
    const count = pdfPageCount(pages.artifact);
    this.compiler.mapShadow(PAGES_PDF_PATH, pages.artifact);
    try {
      const files: Partial<Record<ImposeMode, Uint8Array>> = {};
      for (const mode of modes) {
        const out = await this.compile(toImposeTypst(pagesInput, imposeSource, count, mode), 'pdf');
        const e = firstError(out.diagnostics);
        if (e || !out.artifact) throw new Error(e ?? `Imposition (${mode}) returned no PDF`);
        files[mode] = out.artifact;
      }
      return { pages: count, files };
    } finally {
      this.compiler.unmapShadow(PAGES_PDF_PATH);
    }
  }
}

export interface PrintOutput {
  // insert pages before padding to a multiple of 4
  pages: number;
  files: Partial<Record<ImposeMode, Uint8Array>>;
}

// Page count of a Typst PDF (every page is a /Type /Page object).
export function pdfPageCount(pdf: Uint8Array): number {
  const text = new TextDecoder('latin1').decode(pdf);
  return (text.match(/\/Type\s*\/Page\b/g) ?? []).length;
}

// A readable message from the first error (warnings are skipped).
export function firstError(diagnostics: Diagnostic[]): string | undefined {
  const err = diagnostics.find((d) => d.severity.toLowerCase() === 'error');
  return err?.message;
}
