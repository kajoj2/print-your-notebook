// Printer profile: whatever depends on the printer and paper rather than on the notebook design.
// Kept in the browser separately from the design, because a link with the design (#c=…) may reach
// someone with a different printer. Dimensions in mm; fields mean the same as in [printer] and [duplex]
// w config/notebook.toml.

import type { NotebookConfig } from './config';

// a landscape sheet: width > height
export const PAPER_SIZES = {
  a4: { label: 'A4', width: 297, height: 210 },
  letter: { label: 'Letter', width: 279.4, height: 215.9 },
} as const;
export type PaperSize = keyof typeof PAPER_SIZES;

// Countries where printers hold Letter; the rest of the world uses A4.
const LETTER_REGIONS = ['US', 'CA', 'MX', 'PH', 'PR', 'CL', 'CO', 'VE'];

// Default paper from the browser language's region ("en-US" → Letter, "en-GB" → A4).
export function localPaper(locales: readonly string[]): PaperSize {
  const region = locales[0]?.split(/[-_]/)[1]?.toUpperCase();
  return region && LETTER_REGIONS.includes(region) ? 'letter' : 'a4';
}

// auto: the printer prints both sides itself; manual: fronts, flip the stack, backs
export type DuplexMode = 'auto' | 'manual';

export interface PrinterProfile {
  paper: PaperSize;
  // band at the sheet edge the printer can't print on (the same on every side)
  unprintable: number;
  duplex: DuplexMode;
  // offset of the sheet back: dx > 0 to the right, dy > 0 down
  dx: number;
  dy: number;
  // backs in reverse sheet order (manual duplex)
  evenReverse: boolean;
  // backs rotated by 180°
  rotateBack: boolean;
  // compatibility mode: sheets as images, rotated to portrait (print/raster.ts)
  raster: boolean;
}

export const PRINTER_LIMITS = {
  unprintable: { min: 0, max: 15 },
  offset: { min: -15, max: 15 },
} as const;

// Without calibration: 5 mm is a safe margin for typical home printers
// (inkjets usually 3 mm, lasers about 4–5 mm); a test print lets you lower it.
export const DEFAULT_PRINTER: PrinterProfile = {
  paper: 'a4',
  unprintable: 5,
  duplex: 'manual',
  dx: 0,
  dy: 0,
  evenReverse: true,
  rotateBack: false,
  raster: false,
};

// page number box height from lib/config.typ (number-box-height)
export const NUMBER_BOX = 3.5;

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

function clamp(x: unknown, { min, max }: { min: number; max: number }, def: number): number {
  if (typeof x !== 'number' || !Number.isFinite(x)) return def;
  return Math.min(max, Math.max(min, Math.round(x * 2) / 2));
}

// Profile from localStorage: unknown or broken fields fall back to the defaults.
export function normalizePrinter(raw: unknown): PrinterProfile {
  const p = isObj(raw) ? raw : {};
  const def = DEFAULT_PRINTER;
  return {
    paper:
      typeof p.paper === 'string' && p.paper in PAPER_SIZES ? (p.paper as PaperSize) : def.paper,
    unprintable: clamp(p.unprintable, PRINTER_LIMITS.unprintable, def.unprintable),
    duplex: p.duplex === 'auto' || p.duplex === 'manual' ? p.duplex : def.duplex,
    dx: clamp(p.dx, PRINTER_LIMITS.offset, def.dx),
    dy: clamp(p.dy, PRINTER_LIMITS.offset, def.dy),
    evenReverse: typeof p.evenReverse === 'boolean' ? p.evenReverse : def.evenReverse,
    rotateBack: typeof p.rotateBack === 'boolean' ? p.rotateBack : def.rotateBack,
    raster: typeof p.raster === 'boolean' ? p.raster : def.raster,
  };
}

export type MarginSide = keyof NotebookConfig['margins'];

export interface MarginFix {
  side: MarginSide;
  from: number;
  to: number;
  // 'number': the bottom margin must fit the page number above the unprintable area;
  // 'marks': cut marks in the band at the sheet edge (insert as tall as the sheet)
  reason: 'unprintable' | 'number' | 'marks';
}

// cut marks as in [marks] of config/notebook.toml
export const MARKS = { gap: 2, length: 5, bandLength: 2 } as const;

// margins in the panel have a 0.5 mm step
const ceilHalf = (x: number) => Math.ceil(x * 2 - 1e-9) / 2;

export interface SheetLayout {
  // false: the spread doesn't fit on a sheet of this paper
  fits: boolean;
  // two spreads one above the other on a portrait sheet (pocket, as in the CLI)
  stacked: boolean;
  // the sheet as it lies under imposition (stacked: portrait)
  width: number;
  height: number;
  // insert pages on one sheet (front and back)
  pagesPerSheet: number;
  // vertical cut marks fit above and below the insert; otherwise they lie in a band
  // at the sheet edge, inside the insert's margin
  marksOutside: boolean;
  // start of that band from the sheet edge: on the website always just past the unprintable
  // area (the CLI has measured edges and goes lower)
  bandStart: number;
  // the smallest top and bottom margin that fits the band of marks
  bandMargin: number;
}

// How the insert lies on the sheet; the same geometry as lib/sheet.typ.
export function sheetLayout(cfg: NotebookConfig, printer: PrinterProfile): SheetLayout {
  const paper = PAPER_SIZES[printer.paper];
  const { width: w, height: h } = cfg.format;
  const u = printer.unprintable;
  const stacked = cfg.format.preset === 'pocket' && 2 * w <= paper.height && 2 * h <= paper.width;
  const fits = stacked || (2 * w <= paper.width && h <= paper.height);
  const [W, H] = stacked ? [paper.height, paper.width] : [paper.width, paper.height];
  const slots = stacked ? 2 : 1;
  const y0 = (H - slots * h) / 2;
  const marksOutside = !fits || y0 - MARKS.gap - MARKS.length >= u;
  return {
    fits,
    stacked,
    width: W,
    height: H,
    pagesPerSheet: 4 * slots,
    marksOutside,
    bandStart: u,
    bandMargin: marksOutside ? 0 : Math.max(0, ceilHalf(u + MARKS.bandLength - y0)),
  };
}

// Paper sheets for a notebook with a given page count (padded to a multiple of 4).
export function sheetCount(pages: number, layout: SheetLayout): number {
  return Math.ceil(Math.ceil(pages / 4) / (layout.pagesPerSheet / 4));
}

// The smallest margins the printer will print. lib/config.typ checks all
// four against unprintable, even though at the spine and outside the insert usually doesn't sit
// at the sheet edge (as conservative as the CLI).
export function minMargins(
  cfg: NotebookConfig,
  printer: PrinterProfile,
): Record<MarginSide, number> {
  const u = printer.unprintable;
  const band = sheetLayout(cfg, printer).bandMargin;
  return {
    top: Math.max(u, band),
    bottom: Math.max(cfg.numbering.enabled ? ceilHalf(u + NUMBER_BOX) : u, band),
    inner: u,
    outer: u,
  };
}

// The design fitted to the printer: margins raised to the minimum. The preview and PDF
// use the fitted version; the design in the link stays unchanged.
export function fitToPrinter(
  cfg: NotebookConfig,
  printer: PrinterProfile,
): { config: NotebookConfig; fixes: MarginFix[] } {
  const min = minMargins(cfg, printer);
  const band = sheetLayout(cfg, printer).bandMargin;
  const numberMin = cfg.numbering.enabled ? ceilHalf(printer.unprintable + NUMBER_BOX) : 0;
  const fixes: MarginFix[] = [];
  const margins = { ...cfg.margins };
  for (const side of ['top', 'bottom', 'inner', 'outer'] as const) {
    if (margins[side] >= min[side]) continue;
    const reason: MarginFix['reason'] =
      (side === 'top' || side === 'bottom') && band === min[side] && band > printer.unprintable
        ? 'marks'
        : side === 'bottom' && numberMin === min.bottom && numberMin > printer.unprintable
          ? 'number'
          : 'unprintable';
    fixes.push({ side, from: margins[side], to: min[side], reason });
    margins[side] = min[side];
  }
  return { config: fixes.length ? { ...cfg, margins } : cfg, fixes };
}
