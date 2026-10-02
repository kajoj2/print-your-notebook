// Model of the notebook configuration edited on the website. Dimensions in mm, colours "#rrggbb".

import palette from '../../../config/palette.json' with { type: 'json' };
import { en } from '../i18n/en';
import { pl } from '../i18n/pl';

export const GRID_KINDS = [
  'dots',
  'lines',
  'squares',
  'blank',
  'isometric',
  'hex',
  'staff',
  'graph',
  'margin-lines',
  'calligraphy',
  'seyes',
  'tab',
  'storyboard',
  'split',
] as const;
export type GridKind = (typeof GRID_KINDS)[number];

export const GRID_LABELS: Record<GridKind, string> = {
  dots: 'Dots',
  lines: 'Lines',
  squares: 'Squares',
  blank: 'Blank',
  isometric: 'Isometric',
  hex: 'Hexagons',
  staff: 'Music staff',
  graph: 'Graph',
  'margin-lines': 'With margin',
  calligraphy: 'Calligraphy',
  seyes: 'Seyès',
  tab: 'Guitar tab',
  storyboard: 'Storyboard',
  split: 'Half and half',
};

export const FORMAT_PRESETS = {
  regular: { label: 'Regular', width: 110, height: 210 },
  passport: { label: 'Passport', width: 89, height: 124 },
  pocket: { label: 'Pocket', width: 90, height: 140 },
} as const;
export type FormatPreset = keyof typeof FORMAT_PRESETS | 'custom';

export const FORMAT_LIMITS = { min: 60, max: 300 } as const;

export const FONTS = [
  { family: 'Special Elite', label: 'Special Elite', note: 'typewriter' },
  { family: 'Courier Prime', label: 'Courier Prime', note: 'typewriter, clear' },
  { family: 'Cutive Mono', label: 'Cutive Mono', note: 'typewriter, light' },
  { family: 'Libertinus Serif', label: 'Libertinus Serif', note: 'serif, bookish' },
  { family: 'New Computer Modern', label: 'New Computer Modern', note: 'classic, LaTeX' },
] as const;
export type FontFamily = (typeof FONTS)[number]['family'];

export type NumberPosition = 'outer' | 'center';

// language of the text printed in the notebook (lib/i18n.typ) and the first day of the week
export const NOTEBOOK_LANGS = ['pl', 'en'] as const;
export type NotebookLang = (typeof NOTEBOOK_LANGS)[number];
export type WeekStart = 'monday' | 'sunday';

// Quick volume choices; a custom one is any multiple of 4 within LIMITS.volume.
export const VOLUME_PRESETS = [16, 24, 32, 40, 48] as const;
// A thicker signature: a staple barely holds and the outer sheets stick out after folding
// (like duplex.max_sheets in config/notebook.toml).
export const MAX_STAPLED_SHEETS = 12;

// --- sections (page types) ---

interface SectionBase {
  enabled: boolean;
}

export interface TitleSection extends SectionBase {
  type: 'title';
  owner: boolean;
}
export interface PagesSection<T extends string> extends SectionBase {
  type: T;
  pages: number;
}
export interface YearSection extends SectionBase {
  type: 'year';
}
export interface FutureLogSection extends SectionBase {
  type: 'future-log';
  startMonth: number;
}
export interface MonthsSection<T extends string> extends SectionBase {
  type: T;
  startMonth: number;
  count: number;
}
export interface HabitsSection extends MonthsSection<'habits'> {
  habits: number;
}
export interface WeeksSection extends SectionBase {
  type: 'weeks';
  startWeek: number;
  count: number;
}
export interface DailySection extends SectionBase {
  type: 'daily';
  // "YYYY-MM-DD"
  startDate: string;
  count: number;
}
export interface NotesSection extends SectionBase {
  type: 'notes';
  pages: number;
  // true = notes fill the rest of the volume; pages is unused then
  fill: boolean;
  // "auto" = grid from the paper settings
  grid: GridKind | 'auto';
}

export const PIXEL_THEMES = {
  mood: 'Mood',
  weather: 'Weather',
  sleep: 'Sleep',
  energy: 'Energy',
  activity: 'Exercise',
} as const;
export type PixelTheme = keyof typeof PIXEL_THEMES;

export interface PixelsSection extends SectionBase {
  type: 'pixels';
  theme: PixelTheme;
  // number of legend fields; 0 = no legend
  legend: number;
}
export interface OneLineSection extends SectionBase {
  type: 'one-line';
  startMonth: number;
  count: number;
  years: number;
  perPage: number;
}
export interface BirthdaysSection extends SectionBase {
  type: 'birthdays';
  // months per page: a divisor of 12
  perPage: 2 | 3 | 4 | 6;
  dayColumn: boolean;
}

export const PACKING_GROUPS = {
  clothes: 'Clothes',
  documents: 'Documents and money',
  electronics: 'Electronics',
  toiletries: 'Toiletries',
  health: 'First aid',
  outdoor: 'Gear and outdoor',
  food: 'Food for the road',
  other: 'Other',
} as const;
export type PackingGroup = keyof typeof PACKING_GROUPS;

export interface PackingSection extends SectionBase {
  type: 'packing';
  pages: number;
  groups: PackingGroup[];
  columns: 1 | 2;
}
export const SHOPPING_GROUPS = {
  produce: 'Fruit and vegetables',
  bakery: 'Bakery',
  dairy: 'Dairy',
  meat: 'Meat and fish',
  pantry: 'Pantry',
  frozen: 'Frozen',
  drinks: 'Drinks',
  household: 'Household',
  cosmetics: 'Toiletries',
  other: 'Other',
} as const;
export type ShoppingGroup = keyof typeof SHOPPING_GROUPS;

export const SHOPPING_SPLITS = { departments: 'Departments', stores: 'Stores' } as const;
export type ShoppingSplit = keyof typeof SHOPPING_SPLITS;

export interface ShoppingSection extends SectionBase {
  type: 'shopping';
  pages: number;
  split: ShoppingSplit;
  groups: ShoppingGroup[];
  // store names (user text, passed to Typst via sys.inputs); empty = a line to fill in
  stores: string[];
  columns: 1 | 2;
  // a “qty” column next to every item
  qty: boolean;
}
export interface MealsSection extends SectionBase {
  type: 'meals';
  // weeks, one page per week
  count: number;
  meals: number;
  shopping: boolean;
}

export const WORKOUT_KINDS = { strength: 'Strength', cardio: 'Endurance' } as const;
export type WorkoutKind = keyof typeof WORKOUT_KINDS;

export interface WorkoutSection extends SectionBase {
  type: 'workout';
  pages: number;
  kind: WorkoutKind;
}

export const CONTACT_FIELDS = {
  phone: 'Telefon',
  email: 'E-mail',
  address: 'Adres',
  birthday: 'Urodziny',
} as const;
export type ContactField = keyof typeof CONTACT_FIELDS;

export interface ContactsSection extends SectionBase {
  type: 'contacts';
  pages: number;
  fields: ContactField[];
}

export const TASTING_KINDS = {
  coffee: 'Kawa',
  wine: 'Wino',
  tea: 'Herbata',
  beer: 'Piwo',
} as const;
export type TastingKind = keyof typeof TASTING_KINDS;

export interface TastingSection extends SectionBase {
  type: 'tasting';
  pages: number;
  kind: TastingKind;
  perPage: 1 | 2;
  wheel: boolean;
}

export const WATCH_KINDS = {
  movies: 'Filmy',
  series: 'Seriale',
  games: 'Gry',
  podcasts: 'Podcasty',
} as const;
export type WatchKind = keyof typeof WATCH_KINDS;

export interface WatchlistSection extends SectionBase {
  type: 'watchlist';
  pages: number;
  kind: WatchKind;
}
export interface ProjectSection extends SectionBase {
  type: 'project';
  pages: number;
  steps: number;
  grid: GridKind | 'auto';
}
export interface MeetingSection extends SectionBase {
  type: 'meeting';
  pages: number;
  actions: number;
  grid: GridKind | 'auto';
}

export type Section =
  | TitleSection
  | PagesSection<'index'>
  | YearSection
  | FutureLogSection
  | MonthsSection<'months'>
  | WeeksSection
  | DailySection
  | HabitsSection
  | MonthsSection<'budget'>
  | PagesSection<'todo'>
  | PagesSection<'cornell'>
  | PagesSection<'travel'>
  | PagesSection<'reading'>
  | NotesSection
  | PixelsSection
  | OneLineSection
  | BirthdaysSection
  | PackingSection
  | ShoppingSection
  | MealsSection
  | WorkoutSection
  | ContactsSection
  | TastingSection
  | WatchlistSection
  | ProjectSection
  | MeetingSection;

export type SectionType = Section['type'];
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>;

export interface NotebookConfig {
  title: string;
  format: { preset: FormatPreset; width: number; height: number };
  margins: { top: number; bottom: number; inner: number; outer: number };
  grid: {
    kind: GridKind;
    spacing: number;
    dotDiameter: number;
    lineWidth: number;
    color: string;
    // margin line, bold lines of graph paper, calligraphy baseline, storyboard frames
    accent: string;
  };
  // lines, tables and checkboxes on section pages (text stays black)
  ink: { color: string };
  font: { family: FontFamily; size: number };
  numbering: { enabled: boolean; position: NumberPosition; size: number };
  year: number;
  lang: NotebookLang;
  weekStart: WeekStart;
  // notebook volume: a multiple of 4 (an A4 sheet folded in half = 4 pages)
  pages: number;
  // cover colour: preview only
  coverColor: string;
  sections: Section[];
}

// label: fallback name; the website shows Messages.style.coverColors[id]
export const COVER_COLORS = [
  { id: 'brown', color: '#8a5a3b', label: 'Brown' },
  { id: 'black', color: '#2f2a26', label: 'Black' },
  { id: 'camel', color: '#b0764a', label: 'Camel' },
  { id: 'olive', color: '#3d4a3a', label: 'Olive' },
  { id: 'navy', color: '#2a3b57', label: 'Navy' },
  { id: 'burgundy', color: '#7b2f2f', label: 'Burgundy' },
] as const;

// Palette shared with the CLI (test sheet color-test.typ): dark, saturated colours,
// because a laser loses light thin lines.
export const PALETTE: readonly { id: string; color: string; label: string }[] = palette.colors;

export interface ColorTheme {
  id: string;
  label: string;
  grid: string;
  accent: string;
  ink: string;
}
export const COLOR_THEMES: readonly ColorTheme[] = palette.themes;

// Relative luminance (WCAG) of a "#rrggbb" colour: 0 = black, 1 = white.
export function luminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

// Above this luminance thin lines and small dots vanish in the laser raster
// (light grey #b4b4b4 ≈ 0.46 printed as a blank sheet; Light grey #9a9a9a ≈ 0.32).
export const LASER_LUMINANCE_MAX = 0.4;
export const tooLightForLaser = (hex: string) => luminance(hex) > LASER_LUMINANCE_MAX;

export function defaultSections(year: number): Section[] {
  return [
    { type: 'title', enabled: true, owner: true },
    { type: 'index', enabled: true, pages: 2 },
    { type: 'year', enabled: false },
    { type: 'future-log', enabled: false, startMonth: 1 },
    { type: 'months', enabled: false, startMonth: 1, count: 12 },
    { type: 'weeks', enabled: false, startWeek: 1, count: 4 },
    { type: 'daily', enabled: false, startDate: `${year}-01-01`, count: 7 },
    { type: 'birthdays', enabled: false, perPage: 3, dayColumn: true },
    { type: 'habits', enabled: false, startMonth: 1, count: 1, habits: 7 },
    { type: 'pixels', enabled: false, theme: 'mood', legend: 5 },
    { type: 'one-line', enabled: false, startMonth: 1, count: 1, years: 5, perPage: 3 },
    { type: 'workout', enabled: false, pages: 2, kind: 'strength' },
    { type: 'budget', enabled: false, startMonth: 1, count: 1 },
    { type: 'todo', enabled: false, pages: 2 },
    {
      type: 'packing',
      enabled: false,
      pages: 1,
      groups: ['clothes', 'documents', 'electronics', 'toiletries'],
      columns: 1,
    },
    {
      type: 'shopping',
      enabled: false,
      pages: 1,
      split: 'departments',
      groups: ['produce', 'bakery', 'dairy', 'meat', 'pantry', 'household'],
      stores: ['', '', '', ''],
      columns: 2,
      qty: true,
    },
    { type: 'reading', enabled: false, pages: 1 },
    { type: 'watchlist', enabled: false, pages: 1, kind: 'movies' },
    { type: 'contacts', enabled: false, pages: 2, fields: ['phone', 'email', 'address'] },
    { type: 'cornell', enabled: false, pages: 2 },
    { type: 'meeting', enabled: false, pages: 2, actions: 5, grid: 'auto' },
    { type: 'project', enabled: false, pages: 1, steps: 6, grid: 'auto' },
    { type: 'travel', enabled: false, pages: 4 },
    { type: 'tasting', enabled: false, pages: 2, kind: 'coffee', perPage: 1, wheel: true },
    { type: 'meals', enabled: false, count: 1, meals: 3, shopping: true },
    { type: 'notes', enabled: true, pages: 28, fill: true, grid: 'auto' },
  ];
}

export function defaultConfig(
  year = new Date().getFullYear() + 1,
  lang: NotebookLang = 'pl',
): NotebookConfig {
  return {
    title: (lang === 'en' ? en : pl).format.defaultTitle,
    format: { preset: 'regular', ...pick(FORMAT_PRESETS.regular, 'width', 'height') },
    // as in config/notebook.toml
    margins: { top: 8, bottom: 11, inner: 8, outer: 7 },
    grid: {
      kind: 'dots',
      spacing: 5,
      dotDiameter: 0.6,
      lineWidth: 0.12,
      color: '#666666',
      accent: '#000000',
    },
    ink: { color: '#000000' },
    font: { family: 'Special Elite', size: 8 },
    numbering: { enabled: true, position: 'outer', size: 6.5 },
    year,
    lang,
    // a Sunday-first week is a US custom; the rest of the world starts on Monday
    weekStart: 'monday',
    pages: 32,
    coverColor: COVER_COLORS[0].color,
    sections: defaultSections(year),
  };
}

function pick<T extends object, K extends keyof T>(o: T, ...keys: K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((k) => [k, o[k]])) as Pick<T, K>;
}
