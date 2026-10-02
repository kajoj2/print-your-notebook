// Compatibility mode: sheets as images, rotated to portrait (the equivalent of `just prepare`).
// For printers that lose the fonts from a Typst PDF or fit the page to the sheet on their own
// (CLX-3300, README "Print settings"). pdf.js draws the pages, pdf-lib assembles a PDF from them;
// both libraries are only loaded here, once the mode is turned on.
//
// 300 dpi rather than 600 as in the CLI: an A4 sheet at 600 dpi is 35 million pixels, and Safari on
// iPhone won't create a canvas above about 16.7 million. Lines from 0.12 mm are still > 1 pixel.

import type { NotebookConfig } from '../notebook/config';

export const RASTER_DPI = 300;

export interface RasterPage {
  // page image (PNG) and its size in PDF points
  png: Uint8Array;
  width: number;
  height: number;
}

export interface RasterOptions {
  // grey instead of colour (a notebook in greys only, like printer.color = auto in the CLI)
  gray: boolean;
  dpi?: number;
}

const isGray = (hex: string) =>
  hex.slice(1, 3) === hex.slice(3, 5) && hex.slice(3, 5) === hex.slice(5, 7);

// A colour raster only when some notebook colour isn't a grey (uses_color in nb.py).
export function usesColor(cfg: NotebookConfig): boolean {
  return ![cfg.grid.color, cfg.grid.accent, cfg.ink.color].every((c) => isGray(c.toLowerCase()));
}

// PDF pages as PNG images (pdf.js on a canvas).
export async function renderPages(pdf: Uint8Array, opts: RasterOptions): Promise<RasterPage[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;
  // pdf.js takes over the buffer: copy it so the vector PDF can still be downloaded
  const task = pdfjs.getDocument({ data: pdf.slice() });
  const doc = await task.promise;
  const scale = (opts.dpi ?? RASTER_DPI) / 72;
  const pages: RasterPage[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport, background: 'white' }).promise;
      const out = opts.gray ? toGray(canvas) : canvas;
      const blob = await new Promise<Blob>((resolve, reject) =>
        out.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob'))), 'image/png'),
      );
      pages.push({
        png: new Uint8Array(await blob.arrayBuffer()),
        width: base.width,
        height: base.height,
      });
      page.cleanup();
      canvas.width = canvas.height = 0;
    }
  } finally {
    await task.destroy();
  }
  return pages;
}

function toGray(src: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = src.getContext('2d')!;
  const img = ctx.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = Math.round(0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!);
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  ctx.putImageData(img, 0, 0);
  return src;
}

// A PDF of page images; a landscape page rotated 90° counterclockwise
// to portrait, like _to_portrait in nb.py (the printer doesn't have to fit anything).
export async function pagesToPdf(pages: RasterPage[]): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await import('pdf-lib');
  const out = await PDFDocument.create();
  for (const p of pages) {
    const img = await out.embedPng(p.png);
    if (p.width > p.height) {
      const page = out.addPage([p.height, p.width]);
      page.drawImage(img, {
        x: p.height,
        y: 0,
        width: p.width,
        height: p.height,
        rotate: degrees(90),
      });
    } else {
      out.addPage([p.width, p.height]).drawImage(img, {
        x: 0,
        y: 0,
        width: p.width,
        height: p.height,
      });
    }
  }
  // no object streams (PDF 1.5): the mode is for old printers and their PDF interpreters
  return out.save({ useObjectStreams: false });
}

export async function rasterize(pdf: Uint8Array, opts: RasterOptions): Promise<Uint8Array> {
  return pagesToPdf(await renderPages(pdf, opts));
}
