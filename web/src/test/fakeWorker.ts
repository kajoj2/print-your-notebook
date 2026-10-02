// A fake Typst worker: replies according to the protocol, without WASM.
import { vi } from 'vitest';
import { TypstClient, type ClientOptions, type WorkerLike } from '../typst/client';
import type { WorkerRequest, WorkerResponse } from '../typst/protocol';

export interface FakeOptions {
  pages?: number;
  // content pages before padding (default = pages)
  contentPages?: number;
  // delay of the reply to a compilation (ms)
  delay?: number;
  autoReady?: boolean;
  // doesn't reply at all: only records messages, the test sends replies (emit)
  silent?: boolean;
  // WASM memory reported after compiling: start + growth per compilation (bytes)
  memory?: { base: number; perCompile: number };
}

export class FakeWorker implements WorkerLike {
  listeners: ((e: MessageEvent<WorkerResponse>) => void)[] = [];
  errorListeners: ((e: Event) => void)[] = [];
  received: WorkerRequest[] = [];
  terminate = vi.fn();
  private compiles = 0;
  constructor(private opts: FakeOptions = {}) {}

  addEventListener(
    type: 'message' | 'error',
    fn: ((e: MessageEvent<WorkerResponse>) => void) | ((e: Event) => void),
  ) {
    if (type === 'error') this.errorListeners.push(fn as (e: Event) => void);
    else this.listeners.push(fn as (e: MessageEvent<WorkerResponse>) => void);
  }

  emit(msg: WorkerResponse) {
    for (const fn of this.listeners) fn({ data: msg } as MessageEvent<WorkerResponse>);
  }

  // unhandled error in the worker (the Worker object's "error" event)
  crash(message: string) {
    for (const fn of this.errorListeners) fn({ message } as ErrorEvent);
  }

  private memory(): number | undefined {
    const m = this.opts.memory;
    return m && m.base + ++this.compiles * m.perCompile;
  }

  postMessage(msg: WorkerRequest) {
    this.received.push(msg);
    if (this.opts.silent) return;
    const later = (fn: () => void) => setTimeout(fn, this.opts.delay ?? 0);
    switch (msg.type) {
      case 'init':
        if (this.opts.autoReady !== false)
          later(() => {
            this.emit({ type: 'progress', loaded: 10, total: 10 });
            this.emit({ type: 'ready' });
          });
        return;
      case 'compile': {
        const n = this.opts.pages ?? 8;
        later(() =>
          this.emit({
            type: 'compiled',
            id: msg.id,
            pages: Array.from({ length: n }, () => ({ width: 311.8, height: 595.3 })),
            sections: [
              { type: 'title', page: 1 },
              { type: 'notes', page: 2 },
            ],
            memory: this.memory(),
            contentPages: this.opts.contentPages ?? n,
          }),
        );
        return;
      }
      case 'pdf':
        later(() =>
          this.emit({
            type: 'pdf',
            id: msg.id,
            bytes: new TextEncoder().encode('%PDF-1.7'),
            memory: this.memory(),
          }),
        );
        return;
      case 'print':
        later(() =>
          this.emit({
            type: 'printed',
            id: msg.id,
            pages: this.opts.pages ?? 8,
            files: Object.fromEntries(
              msg.modes.map((m) => [m, new TextEncoder().encode(`%PDF-1.7 ${m}`)]),
            ),
            memory: this.memory(),
          }),
        );
        return;
      case 'render':
        later(() => {
          for (const page of msg.pages)
            this.emit({
              type: 'rendered',
              id: msg.id,
              doc: msg.doc,
              page,
              bitmap: { width: 10, height: 20, close: () => {} } as unknown as ImageBitmap,
            });
          this.emit({ type: 'render-done', id: msg.id });
        });
        return;
    }
  }
}

// worker: the first worker; workers: all the client created (also after a swap).
// opts can depend on the worker number (0 = first).
export function fakeClient(
  opts?: FakeOptions | ((index: number) => FakeOptions),
  clientOpts?: ClientOptions,
) {
  const workers: FakeWorker[] = [];
  const client = new TypstClient(() => {
    const w = new FakeWorker(typeof opts === 'function' ? opts(workers.length) : opts);
    workers.push(w);
    return w;
  }, clientOpts);
  return { worker: workers[0]!, workers, client };
}
