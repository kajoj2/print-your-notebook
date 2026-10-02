/// <reference lib="webworker" />
// Worker: compiles the notebook (typst.ts) and draws pages on an OffscreenCanvas,
// so animations on the website don't stutter during compilation.

import { createTypstRenderer } from '@myriaddreamin/typst.ts/renderer';
import type { TypstRenderer } from '@myriaddreamin/typst.ts/renderer';
import { TypstEngine, firstError } from './engine';
import type { InitRequest, WorkerRequest, WorkerResponse } from './protocol';
import { SerialQueue } from './queue';
import { IMPOSE_SOURCE, TYPST_ASSETS, TYPST_SOURCES } from './sources';

declare const self: DedicatedWorkerGlobalScope;

const post = (msg: WorkerResponse, transfer: Transferable[] = []) =>
  self.postMessage(msg, transfer);

let engine: TypstEngine | undefined;
let renderer: TypstRenderer | undefined;
const queue = new SerialQueue();
// the last compiled document ("vector" artifact for the renderer)
let doc: { id: number; artifact: Uint8Array } | undefined;
// WASM crashed (e.g. out of memory): its state is unknown, so every further error
// is reported as fatal too, and the client moves the work to a new worker
let crashed = false;

function fail(id: number, e: unknown) {
  if (e instanceof WebAssembly.RuntimeError) crashed = true;
  post({ type: 'error', id, message: String(e), fatal: crashed || undefined });
}

// Downloads a file with progress (the compiler is tens of MB). The production build ships
// the compiler gzipped (see vite.config.ts), which is decompressed on the fly; progress counts
// decompressed bytes. The bytes decide, not the .gz name: a server may send it with
// Content-Encoding: gzip (e.g. vite preview) and the browser has already decompressed it.
async function fetchWithProgress(url: string, onProgress: (loaded: number) => void) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Failed to download ${url} (${res.status})`);
  const [probe, data] = res.body.tee();
  const probeReader = probe.getReader();
  const { value: head } = await probeReader.read();
  void probeReader.cancel();
  const gzipped = head?.[0] === 0x1f && head[1] === 0x8b;
  const body = gzipped ? data.pipeThrough(new DecompressionStream('gzip')) : data;
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress(loaded);
  }
  const out = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

async function init(req: InitRequest) {
  const total = __COMPILER_WASM_BYTES__;
  let last = 0;
  const wasm = await fetchWithProgress(req.compilerWasm, (loaded) => {
    if (loaded - last > 500_000 || loaded >= total) {
      last = loaded;
      post({ type: 'progress', loaded, total: Math.max(total, loaded) });
    }
  });
  const fonts = await Promise.all(
    req.fonts.map(async (u) => new Uint8Array(await (await fetch(u)).arrayBuffer())),
  );
  engine = await TypstEngine.create({ wasm, fonts, sources: TYPST_SOURCES, assets: TYPST_ASSETS });
  renderer = createTypstRenderer();
  await renderer.init({ getModule: () => fetch(req.rendererWasm) });
}

function handle(req: WorkerRequest) {
  switch (req.type) {
    case 'init':
      queue.push({
        run: () =>
          init(req).then(
            () => post({ type: 'ready' }),
            (e: unknown) => post({ type: 'init-error', message: String(e) }),
          ),
      });
      return;

    case 'compile':
      queue.push({
        latest: 'compile',
        onDrop: () => post({ type: 'superseded', id: req.id }),
        run: async () => {
          try {
            const out = await engine!.compile(req.input, 'vector');
            const err = firstError(out.diagnostics);
            if (err || !out.artifact) {
              post({
                type: 'error',
                id: req.id,
                message: err ?? 'Compilation returned no document',
              });
              return;
            }
            doc = { id: req.id, artifact: out.artifact };
            const pages = await renderer!.runWithSession(
              { format: 'vector', artifactContent: out.artifact },
              async (session) => session.retrievePagesInfo(),
            );
            post({
              type: 'compiled',
              id: req.id,
              pages: pages.map((p) => ({ width: p.width, height: p.height })),
              sections: out.sections,
              memory: engine!.memoryBytes(),
              contentPages: out.contentPages,
            });
          } catch (e) {
            fail(req.id, e);
          }
        },
      });
      return;

    case 'pdf':
      queue.push({
        run: async () => {
          try {
            const out = await engine!.compile(req.input, 'pdf');
            const err = firstError(out.diagnostics);
            if (err || !out.artifact) throw new Error(err ?? 'Brak PDF');
            const bytes = out.artifact.slice();
            post({ type: 'pdf', id: req.id, bytes, memory: engine!.memoryBytes() }, [bytes.buffer]);
          } catch (e) {
            fail(req.id, e);
          }
        },
      });
      return;

    case 'print':
      queue.push({
        run: async () => {
          try {
            const out = await engine!.print(req.input, IMPOSE_SOURCE, req.modes);
            const files = Object.fromEntries(
              Object.entries(out.files).map(([mode, bytes]) => [mode, bytes.slice()]),
            );
            post(
              {
                type: 'printed',
                id: req.id,
                pages: out.pages,
                files,
                memory: engine!.memoryBytes(),
              },
              Object.values(files).map((b) => b.buffer),
            );
          } catch (e) {
            fail(req.id, e);
          }
        },
      });
      return;

    case 'render':
      queue.push({
        run: async () => {
          const current = doc;
          // the website asked for an old version: a newer one is already there or about to be
          if (!current || current.id !== req.doc) {
            post({ type: 'render-done', id: req.id });
            return;
          }
          try {
            await renderer!.runWithSession(
              { format: 'vector', artifactContent: current.artifact },
              async (session) => {
                const info = session.retrievePagesInfo();
                for (const page of req.pages) {
                  const p = info[page];
                  if (!p) continue;
                  const canvas = new OffscreenCanvas(
                    Math.max(1, Math.ceil(p.width * req.pixelPerPt)),
                    Math.max(1, Math.ceil(p.height * req.pixelPerPt)),
                  );
                  const ctx = canvas.getContext('2d')!;
                  await session.renderCanvas({
                    canvas: ctx as unknown as CanvasRenderingContext2D,
                    pageOffset: page,
                    pixelPerPt: req.pixelPerPt,
                    backgroundColor: '#ffffff',
                  });
                  const bitmap = canvas.transferToImageBitmap();
                  post({ type: 'rendered', id: req.id, doc: current.id, page, bitmap }, [bitmap]);
                }
              },
            );
          } catch (e) {
            fail(req.id, e);
          }
          post({ type: 'render-done', id: req.id });
        },
      });
      return;
  }
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => handle(e.data);
