import { useEffect, useRef } from 'react';
import type { PageStore } from './pageStore';
import { usePageBitmap } from './usePages';

// One notebook page drawn from the worker's bitmap. Until the bitmap arrives,
// a blank sheet is shown; a new version of the page smoothly replaces the old one.
export function PageCanvas({
  store,
  doc,
  page,
  label,
}: {
  store: PageStore;
  doc: number | undefined;
  page: number;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const image = usePageBitmap(store, doc, page);
  const bitmap = image?.bitmap;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !bitmap) return;
    // a closed bitmap (evicted from memory) has size 0
    if (bitmap.width === 0) return;
    if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
    }
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  }, [bitmap]);

  return (
    <canvas
      ref={ref}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      data-page={page + 1}
      data-ready={image?.fresh ? 'true' : 'false'}
      className={`block h-full w-full bg-white transition-opacity duration-300 ${bitmap ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
