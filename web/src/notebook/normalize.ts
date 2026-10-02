// Repairs a configuration from an untrusted source (link, localStorage, older version):
// unknown fields are dropped, missing ones take the default, numbers are clamped to their ranges.

import { isoWeeksInYear, parseIsoDate } from './calendar';
import {
  CONTACT_FIELDS,
  COVER_COLORS,
  FONTS,
  FORMAT_LIMITS,
  FORMAT_PRESETS,
  GRID_KINDS,
  PACKING_GROUPS,
  SHOPPING_GROUPS,
  SHOPPING_SPLITS,
  PIXEL_THEMES,
  TASTING_KINDS,
  WATCH_KINDS,
  WORKOUT_KINDS,
  NOTEBOOK_LANGS,
  defaultConfig,
  defaultSections,
  type FormatPreset,
  type NotebookConfig,
  type Section,
} from './config';

export const LIMITS = {
  year: { min: 1900, max: 2200 },
  margin: { min: 3, max: 30 },
  spacing: { min: 2, max: 15 },
  // 0.4 mm dots are barely visible on a CLX-3300 (color-test sheet, 2026-09-30)
  dotDiameter: { min: 0.5, max: 1.5 },
  lineWidth: { min: 0.05, max: 0.6 },
  fontSize: { min: 6, max: 14 },
  numberSize: { min: 5, max: 12 },
  pages: { min: 1, max: 200 },
  volume: { min: 8, max: 200 },
  months: { min: 1, max: 24 },
  weeks: { min: 1, max: 53 },
  days: { min: 1, max: 366 },
  habits: { min: 1, max: 12 },
  legend: { min: 0, max: 8 },
  oneLineMonths: { min: 1, max: 12 },
  oneLineYears: { min: 2, max: 10 },
  oneLinePerPage: { min: 1, max: 6 },
  meals: { min: 2, max: 4 },
  steps: { min: 1, max: 15 },
  actions: { min: 1, max: 10 },
  titleLength: 80,
  stores: { min: 1, max: 8 },
  storeLength: 30,
} as const;

type Range = { min: number; max: number };

export function clamp(x: unknown, r: Range, fallback: number, step?: number): number {
  const n = typeof x === 'number' && Number.isFinite(x) ? x : fallback;
  const snapped = step ? Math.round(n / step) * step : n;
  return Math.min(r.max, Math.max(r.min, Number(snapped.toFixed(3))));
}

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

const oneOf = <T extends string | number>(x: unknown, options: readonly T[], fallback: T): T =>
  options.includes(x as T) ? (x as T) : fallback;

// 1–8 store names; non-strings give an empty field (a line to fill in by hand)
const storeNames = (x: unknown, fallback: string[]): string[] =>
  Array.isArray(x) && x.length > 0
    ? x
        .slice(0, LIMITS.stores.max)
        .map((n) => (typeof n === 'string' ? n.slice(0, LIMITS.storeLength) : ''))
    : fallback;
const isHex = (x: unknown): x is string => typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x);

const bool = (x: unknown, fallback: boolean) => (typeof x === 'boolean' ? x : fallback);

const int = (x: unknown, r: Range, fallback: number) => clamp(x, r, fallback, 1);

const keysOf = <T extends string>(o: Record<T, string>) => Object.keys(o) as T[];

// A subset of allowed values without repeats, in the order of the options list.
function subset<T extends string>(x: unknown, options: readonly T[], fallback: T[]): T[] {
  if (!Array.isArray(x)) return fallback;
  return options.filter((o) => x.includes(o));
}

const GRID_OR_AUTO = ['auto', ...GRID_KINDS] as const;
const MONTH = { min: 1, max: 12 };

function normalizeSection(raw: Record<string, unknown>, def: Section, year: number): Section {
  const enabled = bool(raw.enabled, def.enabled);
  switch (def.type) {
    case 'title':
      return { ...def, enabled, owner: bool(raw.owner, def.owner) };
    case 'year':
      return { ...def, enabled };
    case 'future-log':
      return {
        ...def,
        enabled,
        startMonth: int(raw.startMonth, { min: 1, max: 12 }, def.startMonth),
      };
    case 'months':
    case 'budget':
      return {
        ...def,
        enabled,
        startMonth: int(raw.startMonth, { min: 1, max: 12 }, def.startMonth),
        count: int(raw.count, LIMITS.months, def.count),
      };
    case 'habits':
      return {
        ...def,
        enabled,
        startMonth: int(raw.startMonth, { min: 1, max: 12 }, def.startMonth),
        count: int(raw.count, LIMITS.months, def.count),
        habits: int(raw.habits, LIMITS.habits, def.habits),
      };
    case 'weeks':
      return {
        ...def,
        enabled,
        startWeek: int(raw.startWeek, { min: 1, max: isoWeeksInYear(year) }, def.startWeek),
        count: int(raw.count, LIMITS.weeks, def.count),
      };
    case 'daily':
      return {
        ...def,
        enabled,
        startDate:
          typeof raw.startDate === 'string' && parseIsoDate(raw.startDate)
            ? raw.startDate
            : `${year}-01-01`,
        count: int(raw.count, LIMITS.days, def.count),
      };
    case 'notes':
      return {
        ...def,
        enabled,
        pages: int(raw.pages, LIMITS.pages, def.pages),
        fill: bool(raw.fill, def.fill),
        grid: oneOf(raw.grid, GRID_OR_AUTO, def.grid),
      };
    case 'index':
    case 'todo':
    case 'cornell':
    case 'travel':
    case 'reading':
      return { ...def, enabled, pages: int(raw.pages, LIMITS.pages, def.pages) };
    case 'pixels':
      return {
        ...def,
        enabled,
        theme: oneOf(raw.theme, keysOf(PIXEL_THEMES), def.theme),
        legend: int(raw.legend, LIMITS.legend, def.legend),
      };
    case 'one-line':
      return {
        ...def,
        enabled,
        startMonth: int(raw.startMonth, MONTH, def.startMonth),
        count: int(raw.count, LIMITS.oneLineMonths, def.count),
        years: int(raw.years, LIMITS.oneLineYears, def.years),
        perPage: int(raw.perPage, LIMITS.oneLinePerPage, def.perPage),
      };
    case 'birthdays':
      return {
        ...def,
        enabled,
        perPage: oneOf(raw.perPage, [2, 3, 4, 6] as const, def.perPage),
        dayColumn: bool(raw.dayColumn, def.dayColumn),
      };
    case 'packing':
      return {
        ...def,
        enabled,
        pages: int(raw.pages, LIMITS.pages, def.pages),
        groups: subset(raw.groups, keysOf(PACKING_GROUPS), def.groups),
        columns: oneOf(raw.columns, [1, 2] as const, def.columns),
      };
    case 'shopping':
      return {
        ...def,
        enabled,
        pages: int(raw.pages, LIMITS.pages, def.pages),
        split: oneOf(raw.split, keysOf(SHOPPING_SPLITS), def.split),
        groups: subset(raw.groups, keysOf(SHOPPING_GROUPS), def.groups),
        stores: storeNames(raw.stores, def.stores),
        columns: oneOf(raw.columns, [1, 2] as const, def.columns),
        qty: bool(raw.qty, def.qty),
      };
    case 'meals':
      return {
        ...def,
        enabled,
        count: int(raw.count, LIMITS.weeks, def.count),
        meals: int(raw.meals, LIMITS.meals, def.meals),
        shopping: bool(raw.shopping, def.shopping),
      };
    case 'workout':
      return {
        ...def,
        enabled,
        pages: int(raw.pages, LIMITS.pages, def.pages),
        kind: oneOf(raw.kind, keysOf(WORKOUT_KINDS), def.kind),
      };
    case 'contacts':
      return {
        ...def,
        enabled,
        pages: int(raw.pages, LIMITS.pages, def.pages),
        fields: subset(raw.fields, keysOf(CONTACT_FIELDS), def.fields),
      };
    case 'tasting':
      return {
        ...def,
        enabled,
        pages: int(raw.pages, LIMITS.pages, def.pages),
        kind: oneOf(raw.kind, keysOf(TASTING_KINDS), def.kind),
        perPage: oneOf(raw.perPage, [1, 2] as const, def.perPage),
        wheel: bool(raw.wheel, def.wheel),
      };
    case 'watchlist':
      return {
        ...def,
        enabled,
        pages: int(raw.pages, LIMITS.pages, def.pages),
        kind: oneOf(raw.kind, keysOf(WATCH_KINDS), def.kind),
      };
    case 'project':
      return {
        ...def,
        enabled,
        pages: int(raw.pages, LIMITS.pages, def.pages),
        steps: int(raw.steps, LIMITS.steps, def.steps),
        grid: oneOf(raw.grid, GRID_OR_AUTO, def.grid),
      };
    case 'meeting':
      return {
        ...def,
        enabled,
        pages: int(raw.pages, LIMITS.pages, def.pages),
        actions: int(raw.actions, LIMITS.actions, def.actions),
        grid: oneOf(raw.grid, GRID_OR_AUTO, def.grid),
      };
  }
}

// Keeps the input order, drops duplicates and unknown types. Missing types
// (e.g. sections added after the configuration was saved) are inserted after their predecessor in the default
// order, so that a new section doesn't end up after the notes.
function normalizeSections(raw: unknown, year: number): Section[] {
  const defaults = defaultSections(year);
  const byType = new Map(defaults.map((s) => [s.type, s]));
  const out: Section[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (!isObj(item) || typeof item.type !== 'string') continue;
    const def = byType.get(item.type as Section['type']);
    if (!def || seen.has(def.type)) continue;
    seen.add(def.type);
    out.push(normalizeSection(item, def, year));
  }
  defaults.forEach((def, i) => {
    if (seen.has(def.type)) return;
    const prev = defaults
      .slice(0, i)
      .reverse()
      .find((d) => seen.has(d.type));
    const at = prev ? out.findIndex((s) => s.type === prev.type) + 1 : 0;
    out.splice(at, 0, def);
    seen.add(def.type);
  });
  return out;
}

export function normalizeConfig(raw: unknown): NotebookConfig {
  const def = defaultConfig();
  if (!isObj(raw)) return def;
  const year = int(raw.year, LIMITS.year, def.year);

  const f = isObj(raw.format) ? raw.format : {};
  const preset = oneOf<FormatPreset>(
    f.preset,
    [...(Object.keys(FORMAT_PRESETS) as FormatPreset[]), 'custom'],
    def.format.preset,
  );
  const presetSize = preset === 'custom' ? def.format : FORMAT_PRESETS[preset];
  const format =
    preset === 'custom'
      ? {
          preset,
          width: clamp(f.width, FORMAT_LIMITS, presetSize.width, 1),
          height: clamp(f.height, FORMAT_LIMITS, presetSize.height, 1),
        }
      : { preset, width: presetSize.width, height: presetSize.height };

  const m = isObj(raw.margins) ? raw.margins : {};
  const g = isObj(raw.grid) ? raw.grid : {};
  const font = isObj(raw.font) ? raw.font : {};
  const n = isObj(raw.numbering) ? raw.numbering : {};
  const ink = isObj(raw.ink) ? raw.ink : {};

  return {
    title: typeof raw.title === 'string' ? raw.title.slice(0, LIMITS.titleLength) : def.title,
    format,
    margins: {
      top: clamp(m.top, LIMITS.margin, def.margins.top, 0.5),
      bottom: clamp(m.bottom, LIMITS.margin, def.margins.bottom, 0.5),
      inner: clamp(m.inner, LIMITS.margin, def.margins.inner, 0.5),
      outer: clamp(m.outer, LIMITS.margin, def.margins.outer, 0.5),
    },
    grid: {
      kind: oneOf(g.kind, GRID_KINDS, def.grid.kind),
      spacing: clamp(g.spacing, LIMITS.spacing, def.grid.spacing, 0.5),
      dotDiameter: clamp(g.dotDiameter, LIMITS.dotDiameter, def.grid.dotDiameter, 0.05),
      lineWidth: clamp(g.lineWidth, LIMITS.lineWidth, def.grid.lineWidth, 0.01),
      color: isHex(g.color) ? g.color.toLowerCase() : def.grid.color,
      accent: isHex(g.accent) ? g.accent.toLowerCase() : def.grid.accent,
    },
    ink: { color: isHex(ink.color) ? ink.color.toLowerCase() : def.ink.color },
    font: {
      family: oneOf(
        font.family,
        FONTS.map((x) => x.family),
        def.font.family,
      ),
      size: clamp(font.size, LIMITS.fontSize, def.font.size, 0.5),
    },
    numbering: {
      enabled: bool(n.enabled, def.numbering.enabled),
      position: oneOf(n.position, ['outer', 'center'] as const, def.numbering.position),
      size: clamp(n.size, LIMITS.numberSize, def.numbering.size, 0.5),
    },
    year,
    // old links (from before the English version) are in Polish
    lang: oneOf(raw.lang, NOTEBOOK_LANGS, def.lang),
    weekStart: oneOf(raw.weekStart, ['monday', 'sunday'] as const, def.weekStart),
    pages: clamp(raw.pages, LIMITS.volume, def.pages, 4),
    coverColor: isHex(raw.coverColor) ? raw.coverColor.toLowerCase() : COVER_COLORS[0].color,
    sections: normalizeSections(raw.sections, year),
  };
}
