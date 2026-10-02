// Page counts from the real layout (WASM): panel estimates and volume.
import { describe, expect, it } from 'vitest';
import {
  FORMAT_PRESETS,
  defaultConfig,
  type NotebookConfig,
  type Section,
} from '../notebook/config';
import { estimatePages } from '../notebook/sections';
import { planVolume } from '../notebook/volume';
import { compilePdf, only, setupEngine } from './typstTest';

setupEngine();

describe('page count', () => {
  // New pages: as many pages as the panel promises (estimatePages), in several option variants
  // and in every format, i.e. nothing spills onto an extra page.
  const VARIANTS: Partial<Section>[] = [
    { type: 'pixels', theme: 'weather', legend: 0 },
    { type: 'pixels', legend: 8 },
    { type: 'one-line', startMonth: 2, count: 1, perPage: 1, years: 2 },
    { type: 'one-line', startMonth: 12, count: 3, perPage: 4, years: 10 },
    { type: 'birthdays', perPage: 2, dayColumn: true },
    { type: 'birthdays', perPage: 6, dayColumn: false },
    { type: 'packing', pages: 1, groups: ['clothes'], columns: 1 },
    { type: 'packing', pages: 3, groups: ['clothes', 'health'], columns: 2 },
    { type: 'packing', pages: 2, groups: [], columns: 2 },
    { type: 'shopping', pages: 1, groups: ['produce'], columns: 1, qty: true },
    { type: 'shopping', pages: 2, groups: ['produce', 'dairy', 'drinks'], columns: 2, qty: false },
    { type: 'shopping', pages: 3, groups: [], columns: 2, qty: true },
    { type: 'shopping', pages: 1, split: 'stores', stores: ['Lidl', '', 'Rossmann'], columns: 2 },
    { type: 'shopping', pages: 2, split: 'stores', stores: Array(8).fill(''), columns: 1 },
    { type: 'meals', count: 3, meals: 2, shopping: true },
    { type: 'meals', count: 1, meals: 4, shopping: false },
    { type: 'workout', pages: 2, kind: 'strength' },
    { type: 'workout', pages: 1, kind: 'cardio' },
    { type: 'contacts', pages: 2, fields: ['phone', 'email', 'address', 'birthday'] },
    { type: 'contacts', pages: 1, fields: [] },
    { type: 'tasting', pages: 2, kind: 'wine', perPage: 1, wheel: true },
    { type: 'tasting', pages: 1, kind: 'tea', perPage: 2, wheel: false },
    { type: 'tasting', pages: 1, kind: 'beer', perPage: 2, wheel: true },
    { type: 'watchlist', pages: 1, kind: 'series' },
    { type: 'watchlist', pages: 2, kind: 'podcasts' },
    { type: 'project', pages: 2, steps: 15, grid: 'graph' },
    { type: 'project', pages: 1, steps: 1, grid: 'auto' },
    { type: 'meeting', pages: 2, actions: 10, grid: 'margin-lines' },
    { type: 'meeting', pages: 1, actions: 1, grid: 'split' },
  ];
  const variantCases = Object.keys(FORMAT_PRESETS).flatMap((preset) =>
    VARIANTS.map((v) => [preset, v.type!, JSON.stringify(v), v] as const),
  );

  it.each(variantCases)(
    '%s: %s %s ma tyle stron, ile szacuje panel',
    async (preset, type, _, v) => {
      const cfg = only(defaultConfig(2027), [type]);
      const p = FORMAT_PRESETS[preset as keyof typeof FORMAT_PRESETS];
      cfg.format = {
        preset: preset as keyof typeof FORMAT_PRESETS,
        width: p.width,
        height: p.height,
      };
      cfg.sections = cfg.sections.map((s) => (s.type === type ? ({ ...s, ...v } as Section) : s));
      const section = cfg.sections.find((s) => s.type === type)!;
      const out = await compilePdf(cfg);
      expect(out.contentPages).toBe(estimatePages(section));
      expect(out.sections).toEqual([{ type, page: 1 }]);
    },
  );

  // Volume: planVolume (panel, number of note pages) must count pages the same way as the layout,
  // including blank pages before spreads (weeks, future log).
  type Patch = { on: Section['type'][]; pages: number; set?: (c: NotebookConfig) => void };
  const VOLUME_CASES: [string, Patch][] = [
    ['default', { on: ['title', 'index', 'notes'], pages: 32 }],
    ['weeks at the start', { on: ['weeks', 'notes'], pages: 16 }],
    ['weeks after an odd page count', { on: ['title', 'weeks', 'notes'], pages: 24 }],
    [
      'notes before weeks (parity depends on the notes)',
      {
        on: ['title', 'notes', 'weeks'],
        pages: 24,
        set: (c) => {
          const notes = c.sections.find((s) => s.type === 'notes')!;
          const rest = c.sections.filter((s) => s !== notes);
          rest.splice(
            rest.findIndex((s) => s.type === 'weeks'),
            0,
            notes,
          );
          c.sections = rest;
        },
      },
    ],
    ['future log after the title', { on: ['title', 'future-log', 'notes'], pages: 16 }],
    [
      'weeks and future log',
      { on: ['title', 'index', 'future-log', 'months', 'weeks', 'notes'], pages: 40 },
    ],
    [
      'weeks clamped to the end of the year',
      {
        on: ['title', 'weeks', 'notes'],
        pages: 16,
        set: (c) => {
          const w = c.sections.find((s) => s.type === 'weeks')!;
          Object.assign(w, { startWeek: 51, count: 5 });
        },
      },
    ],
    [
      'content exactly fills the volume',
      {
        on: ['title', 'index', 'year', 'todo'],
        pages: 8,
        set: (c) => {
          const t = c.sections.find((s) => s.type === 'todo')!;
          Object.assign(t, { pages: 4 });
        },
      },
    ],
    [
      'too much: notes disappear, padding to 4',
      {
        on: ['title', 'index', 'months', 'notes'],
        pages: 8,
        set: (c) => {
          const m = c.sections.find((s) => s.type === 'months')!;
          Object.assign(m, { count: 12 });
        },
      },
    ],
    [
      'notes with a fixed page count beyond the volume',
      {
        on: ['title', 'notes'],
        pages: 8,
        set: (c) => {
          const n = c.sections.find((s) => s.type === 'notes')!;
          Object.assign(n, { fill: false, pages: 10 });
        },
      },
    ],
    ['bez sekcji', { on: [], pages: 8 }],
  ];

  it.each(VOLUME_CASES)('volume: %s', async (_, { on, pages, set }) => {
    const cfg = only(defaultConfig(2027), on);
    cfg.pages = pages;
    set?.(cfg);
    const plan = planVolume(cfg);
    const out = await compilePdf(cfg);
    // empty notebook: the first grid page counts as "content"
    expect(out.contentPages).toBe(on.length ? plan.content : 1);
    expect(out.pages).toBe(plan.printed);
    expect(out.pages % 4).toBe(0);
    const notes = out.sections.some((s) => s.type === 'notes');
    expect(notes).toBe(on.includes('notes') && plan.notes > 0);
    if (plan.over === 0) expect(out.pages).toBe(pages);
  });
});
