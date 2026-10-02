import { describe, expect, it } from 'vitest';
import { defaultConfig } from './config';
import { clamp, normalizeConfig } from './normalize';

describe('clamp', () => {
  it('clamps to the range and rounds to the step', () => {
    expect(clamp(99, { min: 1, max: 10 }, 5)).toBe(10);
    expect(clamp(-3, { min: 1, max: 10 }, 5)).toBe(1);
    expect(clamp(4.26, { min: 1, max: 10 }, 5, 0.5)).toBe(4.5);
  });
  it('replaces non-numbers with the default', () => {
    expect(clamp('7', { min: 1, max: 10 }, 5)).toBe(5);
    expect(clamp(NaN, { min: 1, max: 10 }, 5)).toBe(5);
    expect(clamp(Infinity, { min: 1, max: 10 }, 5)).toBe(5);
  });
});

describe('normalizeConfig', () => {
  it('garbage gives the default configuration', () => {
    const def = defaultConfig();
    expect(normalizeConfig(null)).toEqual(def);
    expect(normalizeConfig('x')).toEqual(def);
    expect(normalizeConfig([])).toEqual(def);
  });

  it('the default configuration passes unchanged', () => {
    const def = defaultConfig(2030);
    expect(normalizeConfig(def)).toEqual(def);
  });

  it('a preset forces the preset’s dimensions', () => {
    const c = normalizeConfig({ format: { preset: 'passport', width: 200, height: 10 } });
    expect(c.format).toEqual({ preset: 'passport', width: 89, height: 124 });
  });

  it('raises dots that are too small to 0.5 mm (a laser barely prints smaller ones)', () => {
    expect(normalizeConfig({ grid: { dotDiameter: 0.3 } }).grid.dotDiameter).toBe(0.5);
  });

  it('shopping list stores: 1–8 names, non-strings empty, names trimmed', () => {
    const shopping = (stores: unknown) =>
      normalizeConfig({ sections: [{ type: 'shopping', split: 'stores', stores }] }).sections.find(
        (s) => s.type === 'shopping',
      );
    expect(shopping(['Lidl', 7, 'x'.repeat(50)])).toMatchObject({
      split: 'stores',
      stores: ['Lidl', '', 'x'.repeat(30)],
    });
    expect(shopping(Array(12).fill('a'))!).toMatchObject({ stores: Array(8).fill('a') });
    expect(shopping([])).toMatchObject({ stores: ['', '', '', ''] });
    expect(shopping('Lidl')).toMatchObject({ stores: ['', '', '', ''] });
  });

  it('a custom format is clamped to the range', () => {
    const c = normalizeConfig({ format: { preset: 'custom', width: 5, height: 9000 } });
    expect(c.format).toEqual({ preset: 'custom', width: 60, height: 300 });
  });

  it('unknown enum values fall back to the defaults', () => {
    const c = normalizeConfig({
      grid: { kind: 'spiral', color: 'red' },
      font: { family: 'Comic Sans' },
      numbering: { position: 'top' },
      coverColor: 'javascript:alert(1)',
    });
    expect(c.grid.kind).toBe('dots');
    expect(c.grid.color).toBe('#666666');
    expect(c.font.family).toBe('Special Elite');
    expect(c.numbering.position).toBe('outer');
    expect(c.coverColor).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('normalises colours to lowercase', () => {
    expect(normalizeConfig({ grid: { color: '#ABCDEF' } }).grid.color).toBe('#abcdef');
  });

  it('the title is trimmed', () => {
    expect(normalizeConfig({ title: 'x'.repeat(500) }).title).toHaveLength(80);
  });

  it('sections: keeps the order, removes duplicates and unknowns, appends missing ones', () => {
    const c = normalizeConfig({
      sections: [
        { type: 'notes', enabled: true, pages: 10 },
        { type: 'hacker' },
        { type: 'notes', enabled: false, pages: 99 },
        { type: 'index', enabled: false, pages: 3 },
        'x',
      ],
    });
    const types = c.sections.map((s) => s.type);
    const notes = c.sections.find((s) => s.type === 'notes');
    expect(notes).toMatchObject({ enabled: true, pages: 10 });
    expect(c.sections.find((s) => s.type === 'index')).toMatchObject({ enabled: false, pages: 3 });
    // order from the input: notes before the index
    expect(types.indexOf('notes')).toBeLessThan(types.indexOf('index'));
    expect(new Set(types).size).toBe(types.length);
    expect(types).toHaveLength(defaultConfig().sections.length);
  });

  it('sections added later go to their place, not after the notes', () => {
    // a save from before the new sections: 14 old types in the default order
    const old = [
      'title',
      'index',
      'year',
      'future-log',
      'months',
      'weeks',
      'daily',
      'habits',
      'budget',
      'todo',
      'cornell',
      'travel',
      'reading',
      'notes',
    ].map((type) => ({ type }));
    const types = normalizeConfig({ sections: old }).sections.map((s) => s.type);
    expect(types.at(-1)).toBe('notes');
    expect(types.indexOf('birthdays')).toBe(types.indexOf('daily') + 1);
    expect(types.indexOf('pixels')).toBe(types.indexOf('habits') + 1);
    expect(types.indexOf('meals')).toBeLessThan(types.indexOf('notes'));
    expect(new Set(types).size).toBe(defaultConfig().sections.length);
  });

  it('a missing first type goes to the start', () => {
    const types = normalizeConfig({ sections: [{ type: 'notes' }] }).sections.map((s) => s.type);
    expect(types[0]).toBe('title');
  });

  it('section parameters are clamped', () => {
    const c = normalizeConfig({
      year: 2027,
      sections: [
        { type: 'weeks', enabled: true, startWeek: 60, count: 0 },
        { type: 'habits', enabled: true, startMonth: 13, count: 100, habits: 50 },
        { type: 'daily', enabled: true, startDate: '2027-02-30', count: 5 },
        { type: 'notes', enabled: true, pages: 1000, grid: 'zigzag' },
      ],
    });
    const byType = Object.fromEntries(c.sections.map((s) => [s.type, s]));
    expect(byType.weeks).toMatchObject({ startWeek: 52, count: 1 });
    expect(byType.habits).toMatchObject({ startMonth: 12, count: 24, habits: 12 });
    expect(byType.daily).toMatchObject({ startDate: '2027-01-01' });
    expect(byType.notes).toMatchObject({ pages: 200, grid: 'auto' });
  });

  it('options of new sections: choice lists and clamping', () => {
    const c = normalizeConfig({
      sections: [
        { type: 'packing', groups: ['health', 'nope', 'clothes', 'health'], columns: 3 },
        { type: 'contacts', fields: 'phone' },
        { type: 'birthdays', perPage: 5, dayColumn: 'tak' },
        { type: 'tasting', kind: 'whisky', perPage: 2, wheel: false },
        { type: 'one-line', years: 99, perPage: 0, count: 20 },
        { type: 'meeting', actions: 50, grid: 'seyes' },
        { type: 'pixels', theme: 'weather', legend: -1 },
      ],
    });
    const byType = Object.fromEntries(c.sections.map((s) => [s.type, s]));
    // order from the options list, without duplicates and unknowns
    expect(byType.packing).toMatchObject({ groups: ['clothes', 'health'], columns: 1 });
    expect(byType.contacts).toMatchObject({ fields: ['phone', 'email', 'address'] });
    expect(byType.birthdays).toMatchObject({ perPage: 3, dayColumn: true });
    expect(byType.tasting).toMatchObject({ kind: 'coffee', perPage: 2, wheel: false });
    expect(byType['one-line']).toMatchObject({ years: 10, perPage: 1, count: 12 });
    expect(byType.meeting).toMatchObject({ actions: 10, grid: 'seyes' });
    expect(byType.pixels).toMatchObject({ theme: 'weather', legend: 0 });
  });

  it('accent and page line colours: hex or the default', () => {
    const c = normalizeConfig({ grid: { accent: '#D2232A' }, ink: { color: 'red' } });
    expect(c.grid.accent).toBe('#d2232a');
    expect(c.ink.color).toBe('#000000');
    // an old save without accent and page lines
    const old = normalizeConfig({ grid: { color: '#6b85a8' } });
    expect(old.grid).toMatchObject({ color: '#6b85a8', accent: '#000000' });
    expect(old.ink).toEqual({ color: '#000000' });
  });

  it('volume: a multiple of 4 within range, old "full signatures" drop out', () => {
    expect(normalizeConfig({ pages: 30 }).pages).toBe(32);
    expect(normalizeConfig({ pages: 2 }).pages).toBe(8);
    expect(normalizeConfig({ pages: 999 }).pages).toBe(200);
    const old = normalizeConfig({ padToSignature: false });
    expect(old.pages).toBe(32);
    expect(old).not.toHaveProperty('padToSignature');
    // old notes without the fill field fill the rest
    const notes = normalizeConfig({ sections: [{ type: 'notes', pages: 10 }] }).sections.find(
      (s) => s.type === 'notes',
    );
    expect(notes).toMatchObject({ pages: 10, fill: true });
  });
});
