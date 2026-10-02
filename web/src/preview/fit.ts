// The largest spread (2 pages side by side) that fits in the area,
// with room for the cover sticking out.
export function fitSpread(
  area: { width: number; height: number },
  format: { width: number; height: number },
  padding = 28,
): { pageWidth: number; pageHeight: number } {
  const aspect = format.width / format.height;
  const availW = Math.max(0, area.width - 2 * padding);
  const availH = Math.max(0, area.height - 2 * padding);
  const pageHeight = Math.min(availH, availW / 2 / aspect);
  return { pageWidth: Math.floor(pageHeight * aspect), pageHeight: Math.floor(pageHeight) };
}

// 1 mm = 72/25.4 pt; render scale such that the bitmap is as sharp as the screen.
export function pixelPerPtFor(pageWidthCss: number, formatWidthMm: number, dpr: number): number {
  const widthPt = (formatWidthMm * 72) / 25.4;
  return widthPt > 0 ? (pageWidthCss * dpr) / widthPt : 1;
}
