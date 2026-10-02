import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { defaultConfig } from '../notebook/config';
import { pagesToPdf, usesColor } from './raster';

// the smallest valid PNG: 1×1, white
const PNG_1PX = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC',
  ),
  (c) => c.charCodeAt(0),
);
const MM = 72 / 25.4;

describe('compatibility mode (raster)', () => {
  it('a landscape sheet is rotated to portrait 210 × 297, a portrait one is unchanged', async () => {
    const pdf = await pagesToPdf([
      { png: PNG_1PX, width: 297 * MM, height: 210 * MM },
      { png: PNG_1PX, width: 210 * MM, height: 297 * MM },
    ]);
    const doc = await PDFDocument.load(pdf);
    const sizes = doc.getPages().map((p) => {
      const { width, height } = p.getSize();
      return [Math.round(width / MM), Math.round(height / MM)];
    });
    expect(sizes).toEqual([
      [210, 297],
      [210, 297],
    ]);
  });

  it('colour raster only with colours other than greys', () => {
    const cfg = defaultConfig(2027);
    expect(usesColor(cfg)).toBe(false);
    expect(usesColor({ ...cfg, grid: { ...cfg.grid, accent: '#d2232a' } })).toBe(true);
    expect(usesColor({ ...cfg, ink: { color: '#2A3B8F' } })).toBe(true);
  });
});
