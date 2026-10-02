// Typst files shared with the CLI: lib/, templates/ and graphics from assets/svg/.
// Loaded at build time, so the website always has the same version as the repository.

const typ = import.meta.glob<string>(['../../../lib/*.typ', '../../../templates/*.typ'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const svg = import.meta.glob<string>('../../../assets/svg/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// "../../../lib/grids.typ" -> "/lib/grids.typ"
const toVirtual = (p: string) => p.replace(/^(\.\.\/)+/, '/');

export const TYPST_SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(typ).map(([p, src]) => [toVirtual(p), src]),
);

export const TYPST_ASSETS: Record<string, string> = Object.fromEntries(
  Object.entries(svg).map(([p, src]) => [toVirtual(p), src]),
);

// Imposition (the same file as in the CLI); the main file when compiling sheets for print.
export { default as IMPOSE_SOURCE } from '../../../impose.typ?raw';

// Duplex calibration sheet (the same file as in the CLI) for the test print.
export { default as CALIBRATION_SOURCE } from '../../../calibration.typ?raw';
