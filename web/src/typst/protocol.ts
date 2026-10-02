// Messages between the website and the Typst worker.
import type { ImposeMode } from '../notebook/print';
import type { TypstInput } from '../notebook/typst';
import type { SectionMark } from './engine';

export interface PageSize {
  // in typographic points (1 pt = 1/72 inch)
  width: number;
  height: number;
}

export interface InitRequest {
  type: 'init';
  compilerWasm: string;
  rendererWasm: string;
  fonts: string[];
}

export interface CompileRequest {
  type: 'compile';
  id: number;
  input: TypstInput;
}

export interface PdfRequest {
  type: 'pdf';
  id: number;
  input: TypstInput;
}

// Sheets for printing: input has the 'print' config (toPrintTypst), modes from printModes.
export interface PrintRequest {
  type: 'print';
  id: number;
  input: TypstInput;
  modes: ImposeMode[];
}

export interface RenderRequest {
  type: 'render';
  id: number;
  // document version (compilation id) whose pages we're drawing
  doc: number;
  pages: number[];
  pixelPerPt: number;
}

export type WorkerRequest =
  InitRequest | CompileRequest | PdfRequest | PrintRequest | RenderRequest;

export type WorkerResponse =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready' }
  | { type: 'init-error'; message: string }
  | {
      type: 'compiled';
      id: number;
      pages: PageSize[];
      sections: SectionMark[];
      contentPages?: number;
      // the compiler's WASM memory after compiling (bytes); the client swaps the worker in time
      memory?: number;
    }
  | { type: 'superseded'; id: number }
  | { type: 'pdf'; id: number; bytes: Uint8Array; memory?: number }
  | {
      type: 'printed';
      id: number;
      pages: number;
      files: Partial<Record<ImposeMode, Uint8Array>>;
      memory?: number;
    }
  | { type: 'rendered'; id: number; doc: number; page: number; bitmap: ImageBitmap }
  | { type: 'render-done'; id: number }
  // fatal: WASM crashed (e.g. "RuntimeError: unreachable"), the worker is only fit for replacing
  | { type: 'error'; id: number; message: string; fatal?: boolean };
