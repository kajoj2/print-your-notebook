// Printing from the website: insert pages → sheets for the signature (impose.typ, the same as in the CLI).
// The compiler first builds a PDF of pages with the 'print' config (a real sheet), then
// impose.typ places those pages on sheets via image(src, page: p).

import type { NotebookConfig } from './config';
import type { PrinterProfile } from './printer';
import { CONFIG_PATH, MAIN_PATH, toMain, toToml, typstInputs, type TypstInput } from './typst';

// duplex: front1, back1, front2, back2 … (automatic duplex)
// odd: fronts only, even: backs only (manual duplex)
export type ImposeMode = 'duplex' | 'odd' | 'even';

export const IMPOSE_PATH = '/impose.typ';
// PDF of insert pages in the compiler's virtual file system
export const PAGES_PDF_PATH = '/print/pages.pdf';

export function printModes(printer: PrinterProfile): ImposeMode[] {
  return printer.duplex === 'auto' ? ['duplex'] : ['odd', 'even'];
}

// Insert pages for printing: the same as in the preview, but with the sheet and marks.
export function toPrintTypst(cfg: NotebookConfig, printer: PrinterProfile): TypstInput {
  return {
    files: { [CONFIG_PATH]: toToml(cfg, printer, 'print'), [MAIN_PATH]: toMain(cfg) },
    inputs: typstInputs(cfg),
  };
}

// impose.typ as the main file; the same config as for the pages.
export function toImposeTypst(
  pagesInput: TypstInput,
  imposeSource: string,
  pages: number,
  mode: ImposeMode,
): TypstInput {
  return {
    files: { [CONFIG_PATH]: pagesInput.files[CONFIG_PATH]!, [MAIN_PATH]: imposeSource },
    inputs: { ...pagesInput.inputs, src: PAGES_PDF_PATH, pages: String(pages), mode },
  };
}

// suffix: file name suffix in the website's language (e.g. "1-fronts")
export function printFileName(base: string, suffix: Record<ImposeMode, string>, mode: ImposeMode) {
  return base.replace(/\.pdf$/, `-${suffix[mode]}.pdf`);
}

// --- test print ---

export type CalibrationSide = 'both' | 'front' | 'back';

// Manual duplex: front and back separately (printers can ignore page ranges).
export function calibrationSides(printer: PrinterProfile): CalibrationSide[] {
  return printer.duplex === 'auto' ? ['both'] : ['front', 'back'];
}

// Calibration sheet (calibration.typ from the CLI) on the sheet and in the layout of the current design.
export function toCalibrationTypst(
  cfg: NotebookConfig,
  printer: PrinterProfile,
  source: string,
  side: CalibrationSide,
): TypstInput {
  return {
    files: { [CONFIG_PATH]: toToml(cfg, printer, 'print'), [MAIN_PATH]: source },
    inputs: { side },
  };
}

// Order test for backs: two sheets (8 pages) of notes only. After printing,
// the sheet with 8 | 1 on the front has 2 | 7 on the back, and 6 | 3 has 4 | 5.
export function orderTestConfig(cfg: NotebookConfig): NotebookConfig {
  return {
    ...cfg,
    pages: 8,
    numbering: { ...cfg.numbering, enabled: true },
    sections: cfg.sections.map((s) =>
      s.type === 'notes' ? { ...s, enabled: true, fill: true } : { ...s, enabled: false },
    ),
  };
}

// Reading from the calibration sheet (against the light, front side up): how many mm the back cross
// is to the right of and below the front cross. A correction to the current values,
// as in the README (Calibrating the offset): [duplex] is in the landscape sheet layout,
// and for a portrait (stacked) one lib/sheet.typ converts it to (dy, −dx).
export function correctOffset(
  printer: PrinterProfile,
  stacked: boolean,
  seen: { right: number; down: number },
): Pick<PrinterProfile, 'dx' | 'dy'> {
  const r = (x: number) => Math.round(x * 2) / 2;
  return stacked
    ? { dx: r(printer.dx - seen.down), dy: r(printer.dy - seen.right) }
    : { dx: r(printer.dx + seen.right), dy: r(printer.dy - seen.down) };
}
