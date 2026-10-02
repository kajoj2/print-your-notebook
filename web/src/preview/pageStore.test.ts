import { describe, expect, it, vi } from 'vitest';
import { PageStore, type RenderFn } from './pageStore';

const bitmap = (tag: string) =>
  ({ width: 10, height: 20, close: vi.fn(), tag }) as unknown as ImageBitmap & { tag: string };

const tick = () => new Promise((r) => setTimeout(r, 0));

function setup(capacity = 10) {
  const calls: { doc: number; pages: number[] }[] = [];
  const render: RenderFn = async (doc, pages, _scale, onPage) => {
    calls.push({ doc, pages });
    for (const p of pages) onPage(p, bitmap(`${doc}:${p}`));
  };
  const store = new PageStore(render, 2, capacity);
  return { store, calls };
}

describe('PageStore', () => {
  it('requests from one moment go in one batch, sorted', async () => {
    const { store, calls } = setup();
    store.request(1, 5);
    store.request(1, 2);
    store.request(1, 5);
    await tick();
    expect(calls).toEqual([{ doc: 1, pages: [2, 5] }]);
    expect(store.get(1, 2)?.fresh).toBe(true);
  });

  it('doesn’t draw a page it already has again', async () => {
    const { store, calls } = setup();
    store.request(1, 0);
    await tick();
    store.request(1, 0);
    await tick();
    expect(calls).toHaveLength(1);
  });

  it('returns the old version while drawing a new one', async () => {
    const { store } = setup();
    store.request(1, 3);
    await tick();
    const old = store.get(2, 3);
    expect(old?.fresh).toBe(false);
    expect((old?.bitmap as unknown as { tag: string }).tag).toBe('1:3');
  });

  it('a new page version releases the old one', async () => {
    const { store } = setup();
    store.request(1, 3);
    await tick();
    const first = store.get(1, 3)!.bitmap;
    store.request(2, 3);
    await tick();
    expect(first.close).toHaveBeenCalled();
    expect(store.has(1, 3)).toBe(false);
    expect(store.get(2, 3)?.fresh).toBe(true);
  });

  it('the memory limit evicts the least recently used', async () => {
    const { store } = setup(2);
    store.request(1, 0);
    store.request(1, 1);
    await tick();
    store.get(1, 0); // 0 used most recently
    store.request(1, 2);
    await tick();
    expect(store.has(1, 0)).toBe(true);
    expect(store.has(1, 1)).toBe(false);
    expect(store.has(1, 2)).toBe(true);
  });

  it('notifies subscribers and bumps the version', async () => {
    const { store } = setup();
    const fn = vi.fn();
    const unsub = store.subscribe(fn);
    const v = store.version;
    store.request(1, 0);
    await tick();
    expect(fn).toHaveBeenCalled();
    expect(store.version).toBeGreaterThan(v);
    unsub();
  });

  it('a drawing error allows a retry', async () => {
    let fail = true;
    const render: RenderFn = async (_d, pages, _s, onPage) => {
      if (fail) throw new Error('boom');
      for (const p of pages) onPage(p, bitmap('ok'));
    };
    const store = new PageStore(render, 1, 5);
    store.request(1, 0);
    await tick();
    expect(store.has(1, 0)).toBe(false);
    fail = false;
    store.request(1, 0);
    await tick();
    expect(store.has(1, 0)).toBe(true);
  });

  it('clear closes the bitmaps', async () => {
    const { store } = setup();
    store.request(1, 0);
    await tick();
    const b = store.get(1, 0)!.bitmap;
    store.clear();
    expect(b.close).toHaveBeenCalled();
    expect(store.get(1, 0)).toBeUndefined();
  });
});
