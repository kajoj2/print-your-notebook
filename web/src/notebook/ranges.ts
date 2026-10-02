import type { SectionType } from './config';

export interface SectionMark {
  type: string;
  page: number;
}

// Section page ranges (1-indexed, inclusive) from <nb-section> markers.
// A section ends one page before the next one; the last one on the last content page.
export function sectionRanges(
  marks: SectionMark[],
  totalPages: number,
): Partial<Record<SectionType, [number, number]>> {
  const out: Partial<Record<SectionType, [number, number]>> = {};
  marks.forEach((m, i) => {
    const next = marks[i + 1];
    const end = next ? Math.max(m.page, next.page - 1) : totalPages;
    out[m.type as SectionType] = [m.page, Math.max(m.page, end)];
  });
  return out;
}

export function formatRange([a, b]: [number, number]): string {
  return a === b ? `s. ${a}` : `s. ${a}–${b}`;
}
