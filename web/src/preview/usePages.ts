import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useTypst } from '../state/typst';
import { PageStore } from './pageStore';

// Scale rounded to 1/4 px/pt: small window size changes don't invalidate the cache.
export function quantizeScale(pixelPerPt: number): number {
  return Math.max(0.25, Math.round(pixelPerPt * 4) / 4);
}

export function usePageStore(pixelPerPt: number, capacity: number): PageStore {
  const { client } = useTypst();
  const scale = quantizeScale(pixelPerPt);
  const store = useMemo(
    () =>
      new PageStore(
        (doc, pages, s, onPage) => client.render(doc, pages, s, onPage),
        scale,
        capacity,
      ),
    [client, scale, capacity],
  );
  useEffect(() => () => store.clear(), [store]);
  return store;
}

// A page bitmap (or its previous version, while the new one is being drawn).
export function usePageBitmap(store: PageStore, doc: number | undefined, page: number | null) {
  useSyncExternalStore(store.subscribe, () => store.version);
  useEffect(() => {
    if (doc !== undefined && page !== null) store.request(doc, page);
  });
  if (doc === undefined || page === null) return undefined;
  return store.get(doc, page);
}
