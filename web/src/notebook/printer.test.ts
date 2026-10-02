import { describe, expect, it } from 'vitest';
import { defaultConfig, type NotebookConfig } from './config';
import {
  DEFAULT_PRINTER,
  fitToPrinter,
  localPaper,
  minMargins,
  normalizePrinter,
  sheetCount,
  sheetLayout,
} from './printer';
import { correctOffset, orderTestConfig } from './print';

const cfg = (patch: (c: NotebookConfig) => void = () => {}) => {
  const c = defaultConfig(2027);
  patch(c);
  return c;
};
const printer = (unprintable: number) => ({ ...DEFAULT_PRINTER, unprintable });

describe('normalizePrinter', () => {
  it('broken data falls back to the defaults', () => {
    expect(normalizePrinter(undefined)).toEqual(DEFAULT_PRINTER);
    expect(normalizePrinter({ paper: 'a3', duplex: 'tak', dx: 'x', rotateBack: 1 })).toEqual(
      DEFAULT_PRINTER,
    );
  });

  it('clamps to ranges and rounds to 0.5 mm', () => {
    const p = normalizePrinter({ unprintable: 40, dx: -2.3, dy: 99 });
    expect(p.unprintable).toBe(15);
    expect(p.dx).toBe(-2.5);
    expect(p.dy).toBe(15);
  });
});

describe('minMargins', () => {
  const passport = (c: NotebookConfig) =>
    (c.format = { preset: 'passport', width: 89, height: 124 });

  it('the bottom one fits the page number above the unprintable area', () => {
    expect(minMargins(cfg(passport), printer(5))).toEqual({
      top: 5,
      bottom: 8.5,
      inner: 5,
      outer: 5,
    });
  });

  it('without numbering the bottom one is like the others', () => {
    const c = cfg((c) => {
      passport(c);
      c.numbering.enabled = false;
    });
    expect(minMargins(c, printer(5)).bottom).toBe(5);
  });

  it('regular on A4 (as tall as the sheet): top and bottom fit the band of marks', () => {
    expect(minMargins(cfg(), printer(5))).toEqual({ top: 7, bottom: 8.5, inner: 5, outer: 5 });
    const c = cfg((c) => (c.numbering.enabled = false));
    expect(minMargins(c, printer(5)).bottom).toBe(7);
  });
});

describe('fitToPrinter', () => {
  it('the default design fits the default profile', () => {
    const c = cfg();
    const fit = fitToPrinter(c, DEFAULT_PRINTER);
    expect(fit.fixes).toEqual([]);
    expect(fit.config).toBe(c);
  });

  it('raises margins that are too small and says why', () => {
    const c = cfg((c) => (c.margins = { top: 3, bottom: 4, inner: 9, outer: 3 }));
    const fit = fitToPrinter(c, printer(5));
    expect(fit.config.margins).toEqual({ top: 7, bottom: 8.5, inner: 9, outer: 5 });
    expect(fit.fixes).toEqual([
      { side: 'top', from: 3, to: 7, reason: 'marks' },
      { side: 'bottom', from: 4, to: 8.5, reason: 'number' },
      { side: 'outer', from: 3, to: 5, reason: 'unprintable' },
    ]);
    // the design in the link stays unchanged
    expect(c.margins.top).toBe(3);
  });
});

describe('sheetLayout', () => {
  const fmt = (
    preset: 'regular' | 'passport' | 'pocket' | 'custom',
    width: number,
    height: number,
  ) => cfg((c) => (c.format = { preset, width, height }));

  it('regular: landscape A4, marks in the band at the edge', () => {
    const l = sheetLayout(fmt('regular', 110, 210), DEFAULT_PRINTER);
    expect(l).toMatchObject({ fits: true, stacked: false, width: 297, height: 210 });
    expect(l).toMatchObject({ pagesPerSheet: 4, marksOutside: false, bandStart: 5, bandMargin: 7 });
  });

  it('passport: marks above and below the insert', () => {
    const l = sheetLayout(fmt('passport', 89, 124), DEFAULT_PRINTER);
    expect(l).toMatchObject({ fits: true, stacked: false, marksOutside: true, bandMargin: 0 });
  });

  it('pocket: two spreads on portrait A4', () => {
    const l = sheetLayout(fmt('pocket', 90, 140), DEFAULT_PRINTER);
    expect(l).toMatchObject({ fits: true, stacked: true, width: 210, height: 297 });
    expect(l.pagesPerSheet).toBe(8);
    // 297 − 280 = 17 mm for marks: 8.5 mm each, too little for 2 + 5 mm above a 5 mm area
    expect(l.marksOutside).toBe(false);
    expect(l.bandMargin).toBe(0);
  });

  it('a custom format that is too wide doesn’t fit', () => {
    expect(sheetLayout(fmt('custom', 150, 200), DEFAULT_PRINTER).fits).toBe(false);
    expect(sheetLayout(fmt('custom', 148, 210), DEFAULT_PRINTER).fits).toBe(true);
  });

  it('sheet count', () => {
    const regular = sheetLayout(fmt('regular', 110, 210), DEFAULT_PRINTER);
    const pocket = sheetLayout(fmt('pocket', 90, 140), DEFAULT_PRINTER);
    expect(sheetCount(32, regular)).toBe(8);
    expect(sheetCount(30, regular)).toBe(8);
    expect(sheetCount(32, pocket)).toBe(4);
    expect(sheetCount(36, pocket)).toBe(5);
  });
});

describe('test print', () => {
  it('offset correction as in the README: landscape and portrait sheet', () => {
    const p = { ...DEFAULT_PRINTER, dx: 2, dy: 0 };
    expect(correctOffset(p, false, { right: 1, down: 2 })).toEqual({ dx: 3, dy: -2 });
    expect(correctOffset(p, true, { right: 1, down: 2 })).toEqual({ dx: 0, dy: -1 });
  });

  it('order test: 8 pages of numbered notes only', () => {
    const c = orderTestConfig(cfg((c) => (c.numbering.enabled = false)));
    expect(c.pages).toBe(8);
    expect(c.numbering.enabled).toBe(true);
    expect(c.sections.filter((s) => s.enabled).map((s) => s.type)).toEqual(['notes']);
  });
});

describe('Letter paper', () => {
  const letter = { ...DEFAULT_PRINTER, paper: 'letter' as const };
  const fmt = (preset: 'regular' | 'passport' | 'pocket', width: number, height: number) =>
    cfg((c) => (c.format = { preset, width, height }));

  it('regular: 279.4 × 215.9 landscape, marks in the band (insert almost as tall as the sheet)', () => {
    const l = sheetLayout(fmt('regular', 110, 210), letter);
    expect(l).toMatchObject({ fits: true, stacked: false, width: 279.4, height: 215.9 });
    // (215.9 − 210) / 2 = 2.95 mm above the insert: a band from 5 mm reaches 4.05 mm into the margin
    expect(l.marksOutside).toBe(false);
    expect(l.bandMargin).toBe(4.5);
  });

  it('pocket: two spreads (280 mm) don’t fit, so one per side, landscape', () => {
    const l = sheetLayout(fmt('pocket', 90, 140), letter);
    expect(l).toMatchObject({ fits: true, stacked: false, width: 279.4, pagesPerSheet: 4 });
    expect(sheetCount(32, l)).toBe(8);
  });

  it('default paper from the browser region', () => {
    expect(localPaper(['en-US', 'en'])).toBe('letter');
    expect(localPaper(['es-MX'])).toBe('letter');
    expect(localPaper(['en-GB'])).toBe('a4');
    expect(localPaper(['pl-PL'])).toBe('a4');
    expect(localPaper(['en'])).toBe('a4');
    expect(localPaper([])).toBe('a4');
  });
});
