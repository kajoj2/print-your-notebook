// Printing through WASM in Node: insert pages → sheets (impose.typ), like `just print` in the CLI.
import { describe, expect, it } from 'vitest';
import { defaultConfig, type NotebookConfig } from '../notebook/config';
import { orderTestConfig, printModes, toCalibrationTypst, toPrintTypst } from '../notebook/print';
import { DEFAULT_PRINTER, type PrinterProfile } from '../notebook/printer';
import { firstError, pdfPageCount } from './engine';
import { CALIBRATION_SOURCE, IMPOSE_SOURCE } from './sources';
import { engine, only, setupEngine } from './typstTest';

setupEngine();

const PT = 25.4 / 72;

// page sizes in mm from /MediaBox (Typst writes them in page order)
function pageSizes(pdf: Uint8Array): [number, number][] {
  const text = new TextDecoder('latin1').decode(pdf);
  return [
    ...text.matchAll(/\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/g),
  ].map((m) => [
    Math.round((Number(m[3]) - Number(m[1])) * PT),
    Math.round((Number(m[4]) - Number(m[2])) * PT),
  ]);
}

function notebook(preset: 'regular' | 'passport' | 'pocket'): NotebookConfig {
  const cfg = only(defaultConfig(2027), ['title', 'index', 'notes']);
  const sizes = { regular: [110, 210], passport: [89, 124], pocket: [90, 140] } as const;
  cfg.format = { preset, width: sizes[preset][0], height: sizes[preset][1] };
  return cfg;
}

async function print(cfg: NotebookConfig, printer: PrinterProfile) {
  return engine.print(toPrintTypst(cfg, printer), IMPOSE_SOURCE, printModes(printer));
}

describe('printing: sheets for the signature', () => {
  it('regular, manual duplex: 32 pages → 8 fronts and 8 backs, landscape A4', async () => {
    const out = await print(notebook('regular'), DEFAULT_PRINTER);
    expect(out.pages).toBe(32);
    expect(Object.keys(out.files)).toEqual(['odd', 'even']);
    for (const pdf of [out.files.odd!, out.files.even!]) {
      expect(pdfPageCount(pdf)).toBe(8);
      expect(new Set(pageSizes(pdf).map(String))).toEqual(new Set(['297,210']));
    }
  });

  it('pocket: two spreads on portrait A4, 4 sheets', async () => {
    const out = await print(notebook('pocket'), DEFAULT_PRINTER);
    expect(pdfPageCount(out.files.odd!)).toBe(4);
    expect(pageSizes(out.files.even!)[0]).toEqual([210, 297]);
  });

  it('automatic duplex: one file, front and back alternating', async () => {
    const out = await print(notebook('passport'), { ...DEFAULT_PRINTER, duplex: 'auto' });
    expect(Object.keys(out.files)).toEqual(['duplex']);
    expect(pdfPageCount(out.files.duplex!)).toBe(16);
  });

  it('smallest margins and a large unprintable area don’t block printing', async () => {
    for (const preset of ['regular', 'passport', 'pocket'] as const) {
      const cfg = notebook(preset);
      cfg.margins = { top: 3, bottom: 3, inner: 3, outer: 3 };
      await expect(print(cfg, { ...DEFAULT_PRINTER, unprintable: 7 })).resolves.toBeDefined();
    }
  });

  it('a format larger than the sheet: a readable error instead of a PDF', async () => {
    const cfg = notebook('regular');
    cfg.format = { preset: 'custom', width: 160, height: 200 };
    await expect(print(cfg, DEFAULT_PRINTER)).rejects.toThrow(/wider than the sheet/);
  });
});

describe('test print', () => {
  it('calibration sheet: both sides or one, in the format’s layout', async () => {
    for (const preset of ['regular', 'pocket'] as const) {
      for (const [side, pages] of [
        ['both', 2],
        ['front', 1],
        ['back', 1],
      ] as const) {
        const input = toCalibrationTypst(
          notebook(preset),
          DEFAULT_PRINTER,
          CALIBRATION_SOURCE,
          side,
        );
        const out = await engine.compile(input, 'pdf');
        expect(firstError(out.diagnostics), JSON.stringify(out.diagnostics)).toBeUndefined();
        expect(pdfPageCount(out.artifact!)).toBe(pages);
        expect(pageSizes(out.artifact!)[0]).toEqual(preset === 'pocket' ? [210, 297] : [297, 210]);
      }
    }
  });

  it('order test: two sheets', async () => {
    const out = await print(orderTestConfig(notebook('regular')), DEFAULT_PRINTER);
    expect(out.pages).toBe(8);
    expect(pdfPageCount(out.files.odd!)).toBe(2);
  });
});

describe('Letter paper', () => {
  const letter = { ...DEFAULT_PRINTER, paper: 'letter' as const };

  it('regular and pocket: 279 × 216 mm landscape sheets', async () => {
    for (const preset of ['regular', 'pocket'] as const) {
      const out = await print(notebook(preset), letter);
      expect(pdfPageCount(out.files.odd!)).toBe(8);
      expect(new Set(pageSizes(out.files.odd!).map(String))).toEqual(new Set(['279,216']));
    }
  });

  it('calibration on Letter', async () => {
    const input = toCalibrationTypst(notebook('pocket'), letter, CALIBRATION_SOURCE, 'both');
    const out = await engine.compile(input, 'pdf');
    expect(firstError(out.diagnostics), JSON.stringify(out.diagnostics)).toBeUndefined();
    expect(pageSizes(out.artifact!)[0]).toEqual([279, 216]);
  });
});
