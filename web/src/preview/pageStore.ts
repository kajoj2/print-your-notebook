// Cache of rendered pages (ImageBitmap) with a limit (LRU).
// While a new version of a page is being drawn, get() returns the last known version of that page,
// so the preview doesn't flash a blank sheet on every settings change.

export type RenderFn = (
  doc: number,
  pages: number[],
  pixelPerPt: number,
  onPage: (page: number, bitmap: ImageBitmap) => void,
) => Promise<void>;

interface Entry {
  doc: number;
  page: number;
  bitmap: ImageBitmap;
}

const key = (doc: number, page: number) => `${doc}:${page}`;

export class PageStore {
  private entries = new Map<string, Entry>();
  private inflight = new Set<string>();
  private batch = new Map<number, Set<number>>();
  private scheduled = false;
  private listeners = new Set<() => void>();
  private _version = 0;

  constructor(
    private readonly render: RenderFn,
    readonly pixelPerPt: number,
    private readonly capacity: number,
  ) {}

  get version(): number {
    return this._version;
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  // The exact version or the newest older version of the same page.
  get(doc: number, page: number): { bitmap: ImageBitmap; fresh: boolean } | undefined {
    const exact = this.entries.get(key(doc, page));
    if (exact) {
      this.touch(exact);
      return { bitmap: exact.bitmap, fresh: true };
    }
    let best: Entry | undefined;
    for (const e of this.entries.values()) {
      if (e.page === page && e.doc < doc && (!best || e.doc > best.doc)) best = e;
    }
    return best && { bitmap: best.bitmap, fresh: false };
  }

  has(doc: number, page: number): boolean {
    return this.entries.has(key(doc, page));
  }

  // Requests a page; requests from one frame go to the worker in a single batch.
  request(doc: number, page: number): void {
    const k = key(doc, page);
    if (this.entries.has(k) || this.inflight.has(k)) return;
    this.inflight.add(k);
    let pages = this.batch.get(doc);
    if (!pages) this.batch.set(doc, (pages = new Set()));
    pages.add(page);
    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => this.flush());
    }
  }

  clear(): void {
    for (const e of this.entries.values()) e.bitmap.close();
    this.entries.clear();
    this.inflight.clear();
    this.batch.clear();
    this.bump();
  }

  private flush() {
    this.scheduled = false;
    const batches = [...this.batch.entries()];
    this.batch.clear();
    for (const [doc, pages] of batches) {
      const list = [...pages].sort((a, b) => a - b);
      this.render(doc, list, this.pixelPerPt, (page, bitmap) => this.put(doc, page, bitmap))
        .catch(() => {
          // a drawing error shows up as a missing page; the next request will try again
        })
        .finally(() => {
          for (const p of list) this.inflight.delete(key(doc, p));
        });
    }
  }

  private put(doc: number, page: number, bitmap: ImageBitmap) {
    const k = key(doc, page);
    this.entries.get(k)?.bitmap.close();
    this.entries.set(k, { doc, page, bitmap });
    // older versions of this page aren't needed any more
    for (const [ok, e] of this.entries) {
      if (e.page === page && e.doc < doc) {
        e.bitmap.close();
        this.entries.delete(ok);
      }
    }
    while (this.entries.size > this.capacity) {
      const [oldest, e] = this.entries.entries().next().value!;
      e.bitmap.close();
      this.entries.delete(oldest);
    }
    this.bump();
  }

  private touch(e: Entry) {
    const k = key(e.doc, e.page);
    this.entries.delete(k);
    this.entries.set(k, e);
  }

  private bump() {
    this._version++;
    for (const fn of this.listeners) fn();
  }
}
