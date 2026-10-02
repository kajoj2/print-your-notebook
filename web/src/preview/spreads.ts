import { pl, type Messages } from '../i18n/pl';
// Notebook spreads. Pages counted from 0 (page 1 = index 0).
// Spread -1: closed cover. 0: inside of the cover | page 1.
// k ≥ 1: pages 2k and 2k+1 (numbered from 1), i.e. indices 2k-1 and 2k.

export type Face =
  | { kind: 'page'; index: number }
  | { kind: 'cover-front' }
  | { kind: 'cover-inside' }
  | { kind: 'none' };

export const CLOSED = -1;

export function lastSpread(pages: number): number {
  return Math.floor(pages / 2);
}

export function leftFace(spread: number, pages: number): Face {
  if (spread <= CLOSED) return { kind: 'none' };
  if (spread === 0) return { kind: 'cover-inside' };
  const index = 2 * spread - 1;
  return index < pages ? { kind: 'page', index } : { kind: 'cover-inside' };
}

export function rightFace(spread: number, pages: number): Face {
  if (spread <= CLOSED) return { kind: 'cover-front' };
  const index = 2 * spread;
  return index < pages ? { kind: 'page', index } : { kind: 'cover-inside' };
}

// The spread containing the page at index i.
export function spreadOf(index: number): number {
  return Math.floor((index + 1) / 2);
}

export function spreadLabel(
  spread: number,
  pages: number,
  t: Pick<Messages['preview'], 'cover' | 'page' | 'spread'> = pl.preview,
): string {
  if (spread <= CLOSED) return t.cover;
  const l = leftFace(spread, pages);
  const r = rightFace(spread, pages);
  const nums = [l, r]
    .filter((f) => f.kind === 'page')
    .map((f) => (f as { index: number }).index + 1);
  if (nums.length === 0) return t.cover;
  return nums.length === 1 ? t.page(nums[0]!) : t.spread(nums[0]!, nums[1]!);
}
