import { describe, expect, it, vi } from 'vitest';
import { defaultConfig } from '../notebook/config';
import { toTypst } from '../notebook/typst';
import { FakeWorker, fakeClient } from '../test/fakeWorker';
import { SupersededError, TypstClient } from './client';
import { SerialQueue } from './queue';

const assets = { compilerWasm: 'c.wasm', rendererWasm: 'r.wasm', fonts: ['a.ttf'] };
const input = toTypst(defaultConfig(2027));

describe('TypstClient', () => {
  it('init sends asset URLs once and reports progress', async () => {
    const { client, worker } = fakeClient();
    const progress = vi.fn();
    await Promise.all([client.init(assets, progress), client.init(assets)]);
    expect(worker.received.filter((m) => m.type === 'init')).toHaveLength(1);
    expect(worker.received[0]).toMatchObject({ type: 'init', ...assets });
    expect(progress).toHaveBeenCalledWith(10, 10);
  });

  it('an init error rejects the promise', async () => {
    const worker = new FakeWorker({ autoReady: false });
    const client = new TypstClient(() => worker);
    const p = client.init(assets);
    worker.emit({ type: 'init-error', message: 'no wasm' });
    await expect(p).rejects.toThrow('no wasm');
  });

  it('compile returns pages and sections', async () => {
    const { client } = fakeClient({ pages: 4 });
    const doc = await client.compile(input);
    expect(doc.pages).toHaveLength(4);
    expect(doc.sections[0]).toEqual({ type: 'title', page: 1 });
    expect(doc.id).toBeGreaterThan(0);
  });

  it('a superseded compilation ends with SupersededError', async () => {
    const worker = new FakeWorker();
    worker.postMessage = (msg) => worker.received.push(msg);
    const client = new TypstClient(() => worker);
    const p = client.compile(input);
    const id = (worker.received[0] as { id: number }).id;
    worker.emit({ type: 'superseded', id });
    await expect(p).rejects.toBeInstanceOf(SupersededError);
  });

  it('a compile error passes on the message', async () => {
    const worker = new FakeWorker();
    worker.postMessage = (msg) => worker.received.push(msg);
    const client = new TypstClient(() => worker);
    const p = client.compile(input);
    worker.emit({
      type: 'error',
      id: (worker.received[0] as { id: number }).id,
      message: 'bad font',
    });
    await expect(p).rejects.toThrow('bad font');
  });

  it('render passes on every page, then finishes', async () => {
    const { client } = fakeClient();
    const pages: number[] = [];
    await client.render(1, [0, 3], 2, (p) => pages.push(p));
    expect(pages).toEqual([0, 3]);
  });

  it('pdf returns bytes', async () => {
    const { client } = fakeClient();
    const bytes = await client.pdf(input);
    expect(new TextDecoder().decode(bytes)).toBe('%PDF-1.7');
  });

  it('dispose closes the worker and rejects pending ones', async () => {
    const worker = new FakeWorker();
    worker.postMessage = (msg) => worker.received.push(msg);
    const client = new TypstClient(() => worker);
    const p = client.compile(input);
    client.dispose();
    expect(worker.terminate).toHaveBeenCalled();
    await expect(p).rejects.toThrow();
  });

  it('messages for unknown ids are ignored', () => {
    const worker = new FakeWorker();
    new TypstClient(() => worker);
    expect(() => worker.emit({ type: 'pdf', id: 999, bytes: new Uint8Array() })).not.toThrow();
  });
});

// A worker that only records messages; the test sends replies.
function silent(worker: FakeWorker) {
  worker.postMessage = (msg) => worker.received.push(msg);
  return worker;
}
const types = (w: FakeWorker) => w.received.map((m) => m.type);
const lastId = (w: FakeWorker) => (w.received.at(-1) as { id: number }).id;
const MB = 1024 * 1024;

describe('TypstClient: worker swap (WASM memory leak)', () => {
  it('once the memory limit is exceeded, the next compilation goes to a new worker', async () => {
    const progress = vi.fn();
    const fake = fakeClient(
      { memory: { base: 100 * MB, perCompile: 100 * MB } },
      { memoryLimit: 350 * MB },
    );
    await fake.client.init(assets, progress);
    for (let i = 0; i < 3; i++) await fake.client.compile(input);
    expect(fake.workers).toHaveLength(1);
    // 400 MB of memory >= 350 MB: the fourth compilation starts a fresh worker
    const doc = await fake.client.compile(input);
    expect(doc.pages).toHaveLength(8);
    // the new worker also returns the content end (volume warning)
    expect(doc.contentPages).toBe(8);
    expect(fake.workers).toHaveLength(2);
    expect(types(fake.workers[1]!)).toEqual(['init', 'compile']);
    expect(fake.workers[1]!.received[0]).toMatchObject({ type: 'init', ...assets });
    expect(fake.worker.terminate).toHaveBeenCalledOnce();
    expect(fake.client.recycled).toBe(1);
    // the new worker's loading progress doesn't reach the website
    expect(progress).toHaveBeenCalledOnce();
  });

  it('without memory info it swaps the worker every maxCompiles compilations', async () => {
    const fake = fakeClient({}, { maxCompiles: 5 });
    await fake.client.init(assets);
    for (let i = 0; i < 12; i++) await fake.client.compile(input);
    expect(fake.workers).toHaveLength(3);
    expect(fake.workers.map((w) => types(w).filter((t) => t === 'compile').length)).toEqual([
      5, 5, 2,
    ]);
    expect(fake.workers[0]!.terminate).toHaveBeenCalled();
    expect(fake.workers[1]!.terminate).toHaveBeenCalled();
    expect(fake.workers[2]!.terminate).not.toHaveBeenCalled();
  });

  it('pdf counts towards the limit too', async () => {
    const fake = fakeClient({}, { maxCompiles: 2 });
    await fake.client.init(assets);
    await fake.client.compile(input);
    await fake.client.pdf(input);
    await fake.client.pdf(input);
    expect(fake.workers).toHaveLength(2);
    expect(types(fake.workers[1]!)).toEqual(['init', 'pdf']);
  });

  it('doesn’t swap the worker before init', async () => {
    const fake = fakeClient({}, { maxCompiles: 1 });
    await fake.client.compile(input);
    await fake.client.compile(input);
    expect(fake.workers).toHaveLength(1);
  });

  it('the old worker draws its document until the new one compiles the next', async () => {
    const fake = fakeClient((i) => ({ silent: i > 0 }), { maxCompiles: 1 });
    await fake.client.init(assets);
    const a = await fake.client.compile(input);
    const b = fake.client.compile(input);
    const w1 = fake.workers[1]!;
    // the website still shows document a: drawn by the worker that has it
    const pages: number[] = [];
    await fake.client.render(a.id, [0], 2, (p) => pages.push(p));
    expect(pages).toEqual([0]);
    expect(types(fake.worker).at(-1)).toBe('render');
    expect(fake.worker.terminate).not.toHaveBeenCalled();
    // the new document is ready: the old worker is no longer needed
    const id = lastId(w1);
    w1.emit({ type: 'compiled', id, pages: [{ width: 1, height: 1 }], sections: [] });
    await expect(b).resolves.toMatchObject({ id });
    expect(fake.worker.terminate).toHaveBeenCalledOnce();
    // the next drawing goes to the new worker
    void fake.client.render(id, [0], 2, () => {});
    expect(types(w1).at(-1)).toBe('render');
  });

  it('doesn’t close the old worker while it finishes a task sent to it', async () => {
    const fake = fakeClient({}, { maxCompiles: 1 });
    await fake.client.init(assets);
    await fake.client.compile(input);
    const w0 = silent(fake.worker);
    const pdf = fake.client.pdf(input); // swap: pdf already goes to the new worker
    void pdf;
    expect(fake.workers).toHaveLength(2);
    const render = fake.client.render(1, [0], 2, () => {});
    expect(types(w0).at(-1)).toBe('render');
    await pdf;
    expect(w0.terminate).not.toHaveBeenCalled();
    w0.emit({ type: 'render-done', id: lastId(w0) });
    await render;
    // document 1 is still the last compiled one, so the worker keeps waiting
    expect(w0.terminate).not.toHaveBeenCalled();
    await fake.client.compile(input);
    expect(w0.terminate).toHaveBeenCalledOnce();
  });

  it('fatal WASM error: compilation retried on a new worker, no error for the website', async () => {
    const fake = fakeClient();
    await fake.client.init(assets);
    const w0 = silent(fake.worker);
    const p = fake.client.compile(input);
    const id = lastId(w0);
    w0.emit({ type: 'error', id, message: 'RuntimeError: unreachable', fatal: true });
    await expect(p).resolves.toMatchObject({ id, pages: expect.any(Array) });
    expect(fake.workers).toHaveLength(2);
    expect(types(fake.workers[1]!)).toEqual(['init', 'compile']);
    expect(w0.terminate).toHaveBeenCalledOnce();
    // a late reply from the crashed worker doesn't break anything
    expect(() => w0.emit({ type: 'superseded', id })).not.toThrow();
    await expect(fake.client.compile(input)).resolves.toBeDefined();
    expect(fake.workers).toHaveLength(2);
  });

  it('a fatal error while drawing swaps the worker, and drawing ends with an error', async () => {
    const fake = fakeClient();
    await fake.client.init(assets);
    const doc = await fake.client.compile(input);
    const w0 = silent(fake.worker);
    const r = fake.client.render(doc.id, [0], 2, () => {});
    w0.emit({ type: 'error', id: lastId(w0), message: 'RuntimeError: unreachable', fatal: true });
    await expect(r).rejects.toThrow('unreachable');
    // the replacement starts right away, the crashed worker is closed
    expect(fake.workers).toHaveLength(2);
    expect(types(fake.workers[1]!)).toEqual(['init']);
    expect(w0.terminate).toHaveBeenCalledOnce();
    await expect(fake.client.compile(input)).resolves.toBeDefined();
    expect(fake.workers).toHaveLength(2);
  });

  it('when the new worker crashes too, the compilation ends with an error (no loop)', async () => {
    const fake = fakeClient((i) => ({ silent: i === 1 }));
    await fake.client.init(assets);
    const w0 = silent(fake.worker);
    const p = fake.client.compile(input);
    w0.emit({ type: 'error', id: lastId(w0), message: 'RuntimeError: unreachable', fatal: true });
    const w1 = fake.workers[1]!;
    w1.emit({ type: 'ready' });
    w1.emit({ type: 'error', id: lastId(w1), message: 'RuntimeError: unreachable', fatal: true });
    await expect(p).rejects.toThrow('unreachable');
    // the next compilation goes to another fresh worker
    expect(fake.workers).toHaveLength(3);
    await expect(fake.client.compile(input)).resolves.toBeDefined();
    expect(types(fake.workers[2]!)).toEqual(['init', 'compile']);
  });

  it('a worker "error" event after start: tasks move to a new worker', async () => {
    const fake = fakeClient();
    await fake.client.init(assets);
    const w0 = silent(fake.worker);
    const p = fake.client.compile(input);
    w0.crash('Out of memory');
    await expect(p).resolves.toBeDefined();
    expect(w0.terminate).toHaveBeenCalledOnce();
  });

  it('an "error" event before start is an engine error', async () => {
    const fake = fakeClient({ autoReady: false });
    const ready = fake.client.init(assets);
    fake.worker.crash('Failed to load the script');
    await expect(ready).rejects.toThrow('Failed to load the script');
  });

  it('a worker that crashes before starting isn’t replaced over and over', async () => {
    const fake = fakeClient((i) => ({ silent: i > 0 }), { maxCompiles: 1 });
    await fake.client.init(assets);
    await fake.client.compile(input);
    const p = fake.client.compile(input);
    fake.workers[1]!.crash('Failed to load the worker script');
    // the compilation tried once more on another worker, which didn't start either
    fake.workers[2]!.crash('Failed to load the worker script');
    await expect(p).rejects.toThrow('worker script');
    expect(fake.workers).toHaveLength(3);
    // the first one stays: it holds the document the website still shows
    expect(fake.workers.map((w) => w.terminate.mock.calls.length)).toEqual([0, 1, 1]);
  });

  it('the new worker didn’t start: the compilation gets an error, the next one tries again', async () => {
    const fake = fakeClient({}, { maxCompiles: 1 });
    await fake.client.init(assets);
    await fake.client.compile(input);
    const p = fake.client.compile(input);
    const w1 = silent(fake.workers[1]!);
    w1.emit({ type: 'init-error', message: 'Failed to download c.wasm (503)' });
    await expect(p).rejects.toThrow('503');
    expect(w1.terminate).toHaveBeenCalledOnce();
    await expect(fake.client.compile(input)).resolves.toBeDefined();
    expect(fake.workers).toHaveLength(3);
  });

  it('dispose also closes retired workers', async () => {
    const fake = fakeClient({}, { maxCompiles: 1 });
    await fake.client.init(assets);
    await fake.client.compile(input);
    const w0 = silent(fake.worker);
    void fake.client.render(1, [0], 2, () => {}).catch(() => {});
    void fake.client.compile(input).catch(() => {});
    fake.client.dispose();
    expect(w0.terminate).toHaveBeenCalledOnce();
    expect(fake.workers[1]!.terminate).toHaveBeenCalledOnce();
    await expect(fake.client.compile(input)).rejects.toThrow('Worker closed');
  });
});

describe('SerialQueue', () => {
  const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => (resolve = r));
    return { promise, resolve };
  };

  it('runs tasks in order', async () => {
    const q = new SerialQueue();
    const log: string[] = [];
    const d = deferred();
    q.push({
      run: async () => {
        log.push('a-start');
        await d.promise;
        log.push('a-end');
      },
    });
    q.push({ run: async () => void log.push('b') });
    await Promise.resolve();
    expect(log).toEqual(['a-start']);
    d.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(log).toEqual(['a-start', 'a-end', 'b']);
  });

  it('a "latest" task replaces a waiting one with the same key', async () => {
    const q = new SerialQueue();
    const log: string[] = [];
    const d = deferred();
    const dropped = vi.fn();
    q.push({ run: () => d.promise });
    q.push({ latest: 'c', run: async () => void log.push('c1'), onDrop: dropped });
    q.push({ latest: 'c', run: async () => void log.push('c2') });
    expect(q.size).toBe(1);
    d.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(log).toEqual(['c2']);
    expect(dropped).toHaveBeenCalledOnce();
  });

  it('an error in a task doesn’t block the queue forever', async () => {
    const q = new SerialQueue();
    const log: string[] = [];
    q.push({
      run: async () => {
        throw new Error('x');
      },
    });
    await new Promise((r) => setTimeout(r, 0));
    q.push({ run: async () => void log.push('ok') });
    await new Promise((r) => setTimeout(r, 0));
    expect(log).toEqual(['ok']);
  });
});
