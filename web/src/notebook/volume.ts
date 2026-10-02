// Notebook volume: how many pages the sections take, how many are left for notes and whether it fits.
// Counts exactly like the Typst layout does (checked by engine.typst.test.ts).

import { isoWeeksInYear } from './calendar';
import { MAX_STAPLED_SHEETS, type NotebookConfig, type Section } from './config';
import { estimatePages } from './sections';

// Spreads start on a left (even) page: to-left-page in the template
// inserts a blank page before them when they'd land on a right one.
const SPREADS: Section['type'][] = ['weeks', 'future-log'];

// Weeks clamped to the number of ISO weeks in the year (as in typst.ts).
export function weekSpan(year: number, startWeek: number, count: number): [number, number] {
  const total = isoWeeksInYear(year);
  const start = Math.min(Math.max(1, startWeek), total);
  return [start, Math.min(start - 1 + count, total)];
}

function pagesOf(cfg: NotebookConfig, s: Section, notes: number): number {
  if (s.type === 'notes') return notes;
  if (s.type === 'weeks') {
    const [start, end] = weekSpan(cfg.year, s.startWeek, s.count);
    return 2 * (end - start + 1);
  }
  return estimatePages(s);
}

// Content pages for a given number of note pages.
export function contentPages(cfg: NotebookConfig, notes: number): number {
  let next = 1;
  for (const s of cfg.sections) {
    if (!s.enabled) continue;
    const n = pagesOf(cfg, s, notes);
    if (n === 0) continue;
    if (SPREADS.includes(s.type) && next % 2 === 1) next += 1;
    next += n;
  }
  return next - 1;
}

// Note pages: a fixed number or the rest of the volume (0 when it doesn't fit).
export function notesPages(cfg: NotebookConfig): number {
  const notes = cfg.sections.find((s) => s.type === 'notes');
  if (!notes?.enabled || notes.type !== 'notes') return 0;
  if (!notes.fill) return notes.pages;
  // every note page is a content page, but it can push a spread after the notes
  // and add a blank page; then one fewer
  let n = Math.max(0, cfg.pages - contentPages(cfg, 0));
  while (n > 0 && contentPages(cfg, n) > cfg.pages) n--;
  return n;
}

export interface Volume {
  // volume chosen by the user
  target: number;
  // content pages
  content: number;
  notes: number;
  // by how much the content exceeds the volume
  over: number;
  // pages that go to print: the volume, or the content padded to a multiple of 4
  printed: number;
  // signature sheets (4 pages) and A4 sheets (pocket: 2 signatures per sheet, cut in half)
  sheets: number;
  a4: number;
  tooThick: boolean;
}

export function planVolume(cfg: NotebookConfig): Volume {
  const notes = notesPages(cfg);
  const content = contentPages(cfg, notes);
  const printed = content <= cfg.pages ? cfg.pages : Math.ceil(content / 4) * 4;
  const sheets = printed / 4;
  const stacked = cfg.format.preset === 'pocket';
  return {
    target: cfg.pages,
    content,
    notes,
    over: Math.max(0, content - cfg.pages),
    printed,
    sheets,
    a4: stacked ? Math.ceil(sheets / 2) : sheets,
    tooThick: sheets > MAX_STAPLED_SHEETS,
  };
}

// The smallest volume that fits the content (a multiple of 4).
export const fittingVolume = (v: Volume) => Math.ceil(v.content / 4) * 4;
