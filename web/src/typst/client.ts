// Website ↔ worker: promises instead of messages.
//
// The typst.ts compiler (0.8.0-rc3) doesn't free memory between compilations (it doesn't clear
// the comemo caches), so WASM memory grows with every compilation, and at ~4 GB
// the compiler dies with "RuntimeError: unreachable". The memory belongs to the WASM module instance,
// so the only cure on the website's side is a fresh worker. The client does it itself:
// - before the worker's memory reaches the limit, it sends the next compilation to a new one;
// - if the worker crashes anyway, it repeats the compilation on a new worker.
// The old worker lives on while it finishes its tasks and holds the document shown on the website.
import type { ImposeMode } from '../notebook/print';
import type { TypstInput } from '../notebook/typst';
import type { PrintOutput, SectionMark } from './engine';
import type { PageSize, WorkerRequest, WorkerResponse } from './protocol';

export type PrintedFiles = PrintOutput;

export interface CompiledDoc {
  id: number;
  pages: PageSize[];
  sections: SectionMark[];
  // content pages before padding to the volume (missing = unknown)
  contentPages?: number;
}

// Minimal worker interface: tests substitute a fake.
export interface WorkerLike {
  postMessage(msg: WorkerRequest): void;
  addEventListener(type: 'message', fn: (e: MessageEvent<WorkerResponse>) => void): void;
  // unhandled error in the worker (e.g. out of memory); fakes don't have to report it
  addEventListener(type: 'error', fn: (e: Event) => void): void;
  terminate(): void;
}

export class SupersededError extends Error {
  constructor() {
    super('Superseded by a newer compilation');
  }
}

export interface InitAssets {
  compilerWasm: string;
  rendererWasm: string;
  fonts: string[];
}

export interface ClientOptions {
  // a new worker once the compiler's WASM memory exceeds this size (bytes)
  memoryLimit?: number;
  // ... or after this many compilations, in case the worker doesn't report memory
  maxCompiles?: number;
}

// Compiling an elaborate notebook can add ~350 MB, so 1.5 GB leaves plenty of
// headroom to 4 GB (and weaker browsers may give less; then the retry saves us).
export const DEFAULT_MEMORY_LIMIT = 1536 * 1024 * 1024;
export const DEFAULT_MAX_COMPILES = 60;

// One worker (one instance of the WASM compiler).
interface Slot {
  worker: WorkerLike;
  compiles: number;
  memory: number;
  // the worker reported it's ready (the compiler is loaded)
  ready: boolean;
  // WASM crashed or the worker didn't start: we no longer send it new tasks
  broken: boolean;
  terminated: boolean;
}

interface Pending {
  resolve: (v: never) => void;
  reject: (e: Error) => void;
  slot: Slot;
  msg: WorkerRequest;
  retried: boolean;
}

export class TypstClient {
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private renderCallbacks = new Map<number, (page: number, bitmap: ImageBitmap) => void>();
  private ready: Promise<void> | undefined;
  private onProgress: ((loaded: number, total: number) => void) | undefined;
  private readyResolve: (() => void) | undefined;
  private readyReject: ((e: Error) => void) | undefined;
  private assets: InitAssets | undefined;
  private current: Slot;
  private retired = new Set<Slot>();
  // the worker holding the last compiled document (rendering has to go to it)
  private lastDoc: { id: number; slot: Slot } | undefined;
  // the first worker: only its start is shown (progress, ready, engine error)
  private readonly primary: Slot;
  private readonly memoryLimit: number;
  private readonly maxCompiles: number;
  private disposed = false;
  // how many times the worker was replaced by a new one (for tests and diagnostics)
  recycled = 0;

  constructor(
    private readonly createWorker: () => WorkerLike,
    opts: ClientOptions = {},
  ) {
    this.memoryLimit = opts.memoryLimit ?? DEFAULT_MEMORY_LIMIT;
    this.maxCompiles = opts.maxCompiles ?? DEFAULT_MAX_COMPILES;
    this.primary = this.current = this.spawn();
  }

  init(assets: InitAssets, onProgress?: (loaded: number, total: number) => void): Promise<void> {
    if (!this.ready) {
      this.assets = assets;
      this.onProgress = onProgress;
      this.ready = new Promise<void>((resolve, reject) => {
        this.readyResolve = resolve;
        this.readyReject = reject;
      });
      this.current.worker.postMessage({ type: 'init', ...assets });
    }
    return this.ready;
  }

  compile(input: TypstInput): Promise<CompiledDoc> {
    const id = this.nextId++;
    return this.request<CompiledDoc>(id, { type: 'compile', id, input });
  }

  pdf(input: TypstInput): Promise<Uint8Array> {
    const id = this.nextId++;
    return this.request<Uint8Array>(id, { type: 'pdf', id, input });
  }

  // Sheets for printing (impose.typ) in the given modes.
  print(input: TypstInput, modes: ImposeMode[]): Promise<PrintedFiles> {
    const id = this.nextId++;
    return this.request<PrintedFiles>(id, { type: 'print', id, input, modes });
  }

  // Draws the pages of document doc; every finished page goes straight to onPage.
  render(
    doc: number,
    pages: number[],
    pixelPerPt: number,
    onPage: (page: number, bitmap: ImageBitmap) => void,
  ): Promise<void> {
    const id = this.nextId++;
    this.renderCallbacks.set(id, onPage);
    return this.request<void>(id, { type: 'render', id, doc, pages, pixelPerPt }).finally(() =>
      this.renderCallbacks.delete(id),
    );
  }

  dispose(): void {
    this.disposed = true;
    for (const slot of [this.current, ...this.retired]) this.kill(slot);
    this.retired.clear();
    for (const p of this.pending.values()) p.reject(new Error('Worker closed'));
    this.pending.clear();
  }

  private spawn(): Slot {
    const slot: Slot = {
      worker: this.createWorker(),
      compiles: 0,
      memory: 0,
      ready: false,
      broken: false,
      terminated: false,
    };
    slot.worker.addEventListener('message', (e) => this.onMessage(slot, e.data));
    slot.worker.addEventListener('error', (e) =>
      this.onCrash(slot, (e as ErrorEvent).message || 'The compiler stopped working'),
    );
    return slot;
  }

  // Replaces the current worker with a new one; the old one finishes its tasks and is closed.
  private recycle(): void {
    const old = this.current;
    this.current = this.spawn();
    this.recycled++;
    if (this.assets) this.current.worker.postMessage({ type: 'init', ...this.assets });
    this.retired.add(old);
    this.reap();
  }

  private needsRecycle(slot: Slot): boolean {
    return slot.broken || slot.memory >= this.memoryLimit || slot.compiles >= this.maxCompiles;
  }

  // Closes retired workers that have nothing left to do.
  private reap(): void {
    for (const slot of this.retired) {
      const busy = [...this.pending.values()].some((p) => p.slot === slot);
      if (!busy && this.lastDoc?.slot !== slot) {
        this.kill(slot);
        this.retired.delete(slot);
      }
    }
  }

  private kill(slot: Slot): void {
    if (slot.terminated) return;
    slot.terminated = true;
    slot.worker.terminate();
  }

  // Picks a worker for a task. Compilations (the only thing that uses memory) may switch
  // to a new worker; drawing goes where the document is.
  private route(msg: WorkerRequest): Slot {
    if (msg.type === 'render') {
      const holder = this.lastDoc;
      if (holder && holder.id === msg.doc && !holder.slot.terminated && !holder.slot.broken)
        return holder.slot;
      return this.current;
    }
    // before the engine starts (and after a failed first start) there's nothing to replace the worker with
    if (this.primary.ready && !this.disposed && this.needsRecycle(this.current)) this.recycle();
    if (msg.type === 'compile' || msg.type === 'pdf' || msg.type === 'print')
      this.current.compiles++;
    return this.current;
  }

  private request<T>(id: number, msg: WorkerRequest): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.disposed) {
        reject(new Error('Worker closed'));
        return;
      }
      const slot = this.route(msg);
      this.pending.set(id, {
        resolve: resolve as (v: never) => void,
        reject,
        slot,
        msg,
        retried: false,
      });
      slot.worker.postMessage(msg);
    });
  }

  private settle(id: number, fn: (p: Pending) => void) {
    const p = this.pending.get(id);
    if (!p) return;
    this.pending.delete(id);
    fn(p);
    this.reap();
  }

  // A compilation from a crashed worker is retried once on a new one; the rest are rejected.
  private retryOrReject(id: number, message: string) {
    const p = this.pending.get(id);
    if (!p) return;
    const canRetry =
      !p.retried &&
      !this.disposed &&
      (p.msg.type === 'compile' || p.msg.type === 'pdf' || p.msg.type === 'print');
    if (!canRetry) {
      this.settle(id, (q) => q.reject(new Error(message)));
      return;
    }
    p.retried = true;
    p.slot = this.route(p.msg);
    p.slot.worker.postMessage(p.msg);
    this.reap();
  }

  // The worker is useless: new tasks go to a fresh one, its tasks are retried.
  private onCrash(slot: Slot, message: string) {
    if (slot.broken || slot.terminated) return;
    slot.broken = true;
    // the first worker crashed before starting: that's an engine error (e.g. the script didn't load)
    if (slot === this.primary && !slot.ready) this.readyReject?.(new Error(message));
    if (this.lastDoc?.slot === slot) this.lastDoc = undefined;
    // The replacement starts right away so it's ready for the next compilation. Only after a worker
    // that was already running: one that never started would keep replacing itself forever.
    if (slot === this.current && slot.ready && !this.disposed) this.recycle();
    else this.retired.add(slot);
    for (const [id, p] of [...this.pending]) if (p.slot === slot) this.retryOrReject(id, message);
    this.reap();
  }

  private onMessage(slot: Slot, msg: WorkerResponse) {
    // "RuntimeError: unreachable" etc.: WASM is in an unknown state
    if (msg.type === 'error' && msg.fatal) {
      this.onCrash(slot, msg.message);
      return;
    }
    // the old worker's reply to a task we retried elsewhere
    if ('id' in msg && this.pending.get(msg.id)?.slot !== slot) return;
    switch (msg.type) {
      case 'progress':
        if (slot === this.primary) this.onProgress?.(msg.loaded, msg.total);
        return;
      case 'ready':
        slot.ready = true;
        if (slot === this.primary) this.readyResolve?.();
        return;
      case 'init-error':
        if (slot === this.primary) {
          // the first start failed: that's an engine error, the website shows it
          this.readyReject?.(new Error(msg.message));
          return;
        }
        // the new worker didn't start: its tasks get this error, the next ones will try again
        slot.broken = true;
        this.retired.add(slot);
        for (const [id, p] of [...this.pending])
          if (p.slot === slot) this.settle(id, (q) => q.reject(new Error(msg.message)));
        this.reap();
        return;
      case 'compiled':
        if (msg.memory !== undefined) slot.memory = msg.memory;
        // the old worker may have finished an older version after the new one
        if (!this.lastDoc || this.lastDoc.id < msg.id) this.lastDoc = { id: msg.id, slot };
        this.settle(msg.id, (p) =>
          p.resolve({
            id: msg.id,
            pages: msg.pages,
            sections: msg.sections,
            contentPages: msg.contentPages,
          } as never),
        );
        return;
      case 'superseded':
        this.settle(msg.id, (p) => p.reject(new SupersededError()));
        return;
      case 'pdf':
        if (msg.memory !== undefined) slot.memory = msg.memory;
        this.settle(msg.id, (p) => p.resolve(msg.bytes as never));
        return;
      case 'printed':
        if (msg.memory !== undefined) slot.memory = msg.memory;
        this.settle(msg.id, (p) => p.resolve({ pages: msg.pages, files: msg.files } as never));
        return;
      case 'rendered':
        this.renderCallbacks.get(msg.id)?.(msg.page, msg.bitmap);
        return;
      case 'render-done':
        this.settle(msg.id, (p) => p.resolve(undefined as never));
        return;
      case 'error':
        this.settle(msg.id, (p) => p.reject(new Error(msg.message)));
        return;
    }
  }
}
