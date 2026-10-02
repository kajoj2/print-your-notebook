// Real compilation through WASM in Node: templates from the repository + a generated main.typ.
import { describe, expect, it } from 'vitest';
import { FORMAT_PRESETS, GRID_KINDS, defaultConfig, type Section } from '../notebook/config';
import { DEFAULT_PRINTER } from '../notebook/printer';
import { toTypst } from '../notebook/typst';
import { TYPST_SOURCES } from './sources';
import { firstError } from './engine';
import { allEnabled, compilePdf, engine, only, setupEngine } from './typstTest';

setupEngine();

describe('notebook compilation', () => {
  it('loads all files from lib/ and templates/', () => {
    expect(Object.keys(TYPST_SOURCES)).toEqual(
      expect.arrayContaining(['/lib/notebook.typ', '/lib/grids.typ', '/templates/week.typ']),
    );
  });

  it('default notebook: notes fill the 32-page volume', async () => {
    const out = await compilePdf(defaultConfig(2027));
    // title 1 + index 2 + notes 29 = 32
    expect(out.pages).toBe(32);
    expect(out.contentPages).toBe(32);
    expect(out.sections).toEqual([
      { type: 'title', page: 1 },
      { type: 'index', page: 2 },
      { type: 'notes', page: 4 },
    ]);
  });

  it('notes with a fixed page count: the grid pads the rest of the volume', async () => {
    const cfg = defaultConfig(2027);
    const notes = cfg.sections.find((s) => s.type === 'notes')!;
    Object.assign(notes, { fill: false, pages: 28 });
    const out = await compilePdf(cfg);
    expect(out.contentPages).toBe(31);
    expect(out.pages).toBe(32);
  });

  it('all sections at once compile without errors', async () => {
    const out = await compilePdf(allEnabled());
    expect(out.pages % 4).toBe(0);
    expect(out.sections.map((s) => s.type)).toEqual(allEnabled().sections.map((s) => s.type));
    // markers grow along with the pages
    const pages = out.sections.map((s) => s.page);
    expect([...pages].sort((a, b) => a - b)).toEqual(pages);
  });

  it.each(allEnabled().sections.map((s) => s.type))('section %s on its own', async (type) => {
    const cfg = only(allEnabled(), [type]);
    const out = await compilePdf(cfg);
    expect(out.pages).toBeGreaterThan(0);
    expect(out.sections[0]?.type).toBe(type);
  });

  it('weeks start on a left (even) page', async () => {
    const cfg = only(allEnabled(), ['title', 'weeks']);
    const out = await compilePdf(cfg);
    const weeks = out.sections.find((s) => s.type === 'weeks')!;
    // the marker comes before the alignment, so the spread starts on it or one page later
    expect(weeks.page).toBeLessThanOrEqual(2);
  });

  it.each(GRID_KINDS)('grid %s', async (kind) => {
    const cfg = only(defaultConfig(2027), ['notes']);
    cfg.grid.kind = kind;
    // notes fill the whole volume
    expect((await compilePdf(cfg)).pages).toBe(32);
  });

  it.each(['graph', 'margin-lines', 'calligraphy', 'seyes', 'storyboard'] as const)(
    'siatka %s z akcentem i kolorowymi liniami stron',
    async (kind) => {
      const cfg = allEnabled();
      cfg.grid = { ...cfg.grid, kind, color: '#6a4c9c', accent: '#d2232a' };
      cfg.ink.color = '#2a3b8f';
      await compilePdf(cfg);
    },
  );

  it.each(Object.keys(FORMAT_PRESETS))('format %s ze wszystkimi sekcjami', async (preset) => {
    const cfg = allEnabled();
    const p = FORMAT_PRESETS[preset as keyof typeof FORMAT_PRESETS];
    cfg.format = {
      preset: preset as keyof typeof FORMAT_PRESETS,
      width: p.width,
      height: p.height,
    };
    await compilePdf(cfg);
  });

  it.each([
    'Special Elite',
    'Courier Prime',
    'Cutive Mono',
    'Libertinus Serif',
    'New Computer Modern',
  ] as const)('font %s is available', async (family) => {
    const cfg = only(defaultConfig(2027), ['title']);
    cfg.font.family = family;
    const out = await compilePdf(cfg);
    // a missing font is an "unknown font family" warning, not an error
    expect(out.diagnostics.filter((d) => /font/i.test(d.message))).toEqual([]);
  });

  it('a title with quotes and Typst characters doesn’t break the source', async () => {
    const cfg = only(defaultConfig(2027), ['title']);
    cfg.title = 'Mój "notes" #set text(red) ]) } // $x$';
    await compilePdf(cfg);
  });

  it('page numbers centred and turned off', async () => {
    const cfg = only(defaultConfig(2027), ['notes']);
    cfg.numbering.position = 'center';
    await compilePdf(cfg);
    cfg.numbering.enabled = false;
    await compilePdf(cfg);
  });

  it('months roll over into the next year', async () => {
    const cfg = only(allEnabled(), ['months', 'habits', 'budget']);
    for (const s of cfg.sections) {
      if (s.type === 'months' || s.type === 'habits' || s.type === 'budget') {
        s.startMonth = 11;
        s.count = 4;
      }
    }
    await compilePdf(cfg);
  });

  it('extreme options of new sections in the smallest format', async () => {
    const cfg = allEnabled();
    cfg.format = { preset: 'passport', ...FORMAT_PRESETS.passport };
    cfg.sections = cfg.sections.map((s): Section => {
      switch (s.type) {
        case 'packing':
          return { ...s, groups: [], columns: 2, pages: 3 };
        case 'shopping':
          return {
            ...s,
            split: 'stores',
            // Typst characters in a name: through sys.inputs they don't execute anything
            stores: ['"] #panic("x") [', 'Sklep z bardzo długą nazwą do zawinięcia', ''],
            columns: 2,
            qty: true,
            pages: 2,
          };
        case 'contacts':
          return { ...s, fields: [] };
        case 'tasting':
          return { ...s, kind: 'beer', perPage: 2, wheel: true };
        case 'birthdays':
          return { ...s, perPage: 6, dayColumn: false };
        case 'one-line':
          return { ...s, startMonth: 12, count: 2, years: 10, perPage: 6 };
        case 'meals':
          return { ...s, meals: 4, shopping: false };
        case 'pixels':
          return { ...s, legend: 8 };
        case 'project':
          return { ...s, steps: 15, grid: 'calligraphy' };
        case 'meeting':
          return { ...s, actions: 10, grid: 'storyboard' };
        default:
          return s;
      }
    });
    const out = await compilePdf(cfg);
    // 2 months of 6 days per page: December (31) + January (31) = 62 days -> 11 pages
    const marks = out.sections.map((s) => s.type);
    const at = (t: string) => out.sections[marks.indexOf(t)]!.page;
    const next = marks[marks.indexOf('one-line') + 1]!;
    expect(at(next) - at('one-line')).toBe(11);
  });

  it('vector artifact for the preview', async () => {
    const out = await engine.compile(toTypst(defaultConfig(2027)), 'vector');
    expect(out.artifact?.byteLength).toBeGreaterThan(0);
  });

  // The client swaps the worker when the compiler's WASM memory approaches the limit (client.ts),
  // so the engine must report it: without it only the fallback compilation counter is left.
  it('reports the WASM memory size', async () => {
    const cfg = only(defaultConfig(2027), ['title']);
    await engine.compile(toTypst(cfg), 'vector');
    const before = engine.memoryBytes();
    expect(before).toBeGreaterThan(1024 * 1024);
    cfg.title = 'Inny tytuł';
    await engine.compile(toTypst(cfg), 'vector');
    // WASM memory never shrinks (typst.ts 0.8.0-rc3 doesn't free it either)
    expect(engine.memoryBytes()).toBeGreaterThanOrEqual(before!);
  });

  it('an empty notebook (no sections) isn’t an error', async () => {
    const out = await engine.compile(toTypst(only(defaultConfig(2027), [])), 'pdf');
    expect(firstError(out.diagnostics)).toBeUndefined();
  });

  // Margins from a link narrower than the printer can print: lib/config.typ must not reject
  // the design (previously: "The page number is in the unprintable area" at 5 mm).
  it.each([0, 5, 7, 15])('smallest margins with an unprintable area of %s mm', async (u) => {
    for (const position of ['outer', 'center'] as const) {
      const cfg = only(defaultConfig(2027), ['title', 'notes']);
      cfg.margins = { top: 3, bottom: 3, inner: 3, outer: 3 };
      cfg.numbering.position = position;
      const out = await engine.compile(toTypst(cfg, { ...DEFAULT_PRINTER, unprintable: u }), 'pdf');
      expect(firstError(out.diagnostics), JSON.stringify(out.diagnostics)).toBeUndefined();
    }
  });
});
