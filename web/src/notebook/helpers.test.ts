import { describe, expect, it } from 'vitest';
import { daysInMonth, isLeap, isoWeeksInYear, monthAt, monthName, parseIsoDate } from './calendar';
import { COLOR_THEMES, PALETTE, defaultConfig, luminance, tooLightForLaser } from './config';
import { pagesLabel, plural } from './plural';
import { formatRange, sectionRanges } from './ranges';
import { estimatePages, SECTION_INFO } from './sections';
import { configFromHash, decodeConfig, encodeConfig, shareUrl } from './share';

describe('calendar', () => {
  it('leap years', () => {
    expect([2024, 2000, 1900, 2027].map(isLeap)).toEqual([true, true, false, false]);
  });
  it('ISO weeks: 53 when the year starts on a Thursday (or a Wednesday in a leap year)', () => {
    expect(isoWeeksInYear(2026)).toBe(53); // 1 stycznia 2026 to czwartek
    expect(isoWeeksInYear(2020)).toBe(53); // leap year, starts on a Wednesday
    expect(isoWeeksInYear(2027)).toBe(52);
  });
  it('days in a month', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2027, 12)).toBe(31);
  });
  it('monthAt rolls over into the next year', () => {
    expect(monthAt(2027, 11, 0)).toEqual([2027, 11]);
    expect(monthAt(2027, 11, 2)).toEqual([2028, 1]);
    expect(monthAt(2027, 1, 24)).toEqual([2029, 1]);
  });
  it('month names', () => {
    expect(monthName(1)).toBe('January');
    expect(monthName(13)).toBe('January');
  });
  it('parseIsoDate rejects dates that don’t exist', () => {
    expect(parseIsoDate('2027-03-05')).toEqual([2027, 3, 5]);
    expect(parseIsoDate('2027-02-29')).toBeNull();
    expect(parseIsoDate('2027-13-01')).toBeNull();
    expect(parseIsoDate('27-1-1')).toBeNull();
  });
});

describe('plural', () => {
  it.each([
    [1, '1 strona'],
    [2, '2 strony'],
    [4, '4 strony'],
    [5, '5 stron'],
    [12, '12 stron'],
    [14, '14 stron'],
    [22, '22 strony'],
    [32, '32 strony'],
    [100, '100 stron'],
    [112, '112 stron'],
  ])('%i', (n, text) => expect(pagesLabel(n)).toBe(text));
  it('general form', () => expect(plural(3, 'a', 'b', 'c')).toBe('b'));
});

describe('ranges', () => {
  it('a section ends before the next one, the last one at the end', () => {
    const r = sectionRanges(
      [
        { type: 'title', page: 1 },
        { type: 'index', page: 2 },
        { type: 'notes', page: 4 },
      ],
      32,
    );
    expect(r).toEqual({ title: [1, 1], index: [2, 3], notes: [4, 32] });
  });
  it('sections on the same page don’t give a negative range', () => {
    const r = sectionRanges(
      [
        { type: 'title', page: 1 },
        { type: 'year', page: 1 },
      ],
      2,
    );
    expect(r.title).toEqual([1, 1]);
  });
  it('formatRange', () => {
    expect(formatRange([3, 3])).toBe('s. 3');
    expect(formatRange([3, 9])).toBe('s. 3–9');
  });
});

describe('sections', () => {
  it('every type has a label and a description', () => {
    for (const s of defaultConfig().sections) {
      expect(SECTION_INFO[s.type].label).toBeTruthy();
      expect(SECTION_INFO[s.type].description).toBeTruthy();
    }
  });
  it('page estimate', () => {
    const byType = Object.fromEntries(defaultConfig().sections.map((s) => [s.type, s]));
    expect(estimatePages(byType.title!)).toBe(1);
    expect(estimatePages(byType.weeks!)).toBe(8);
    expect(estimatePages(byType['future-log']!)).toBe(2);
    expect(estimatePages(byType.notes!)).toBe(28);
  });
});

describe('share', () => {
  it('the configuration survives encoding in a link (with Polish characters)', () => {
    const cfg = defaultConfig(2027);
    cfg.title = 'Zażółć gęślą jaźń 📓';
    cfg.sections.reverse();
    expect(decodeConfig(encodeConfig(cfg))).toEqual(cfg);
  });
  it('the encoding is URL-safe', () => {
    expect(encodeConfig(defaultConfig())).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it('a broken link gives null', () => {
    expect(decodeConfig('%%%')).toBeNull();
    expect(decodeConfig('bm90IGpzb24')).toBeNull();
  });
  it('shareUrl and configFromHash', () => {
    const cfg = defaultConfig(2027);
    cfg.title = 'Link';
    const url = shareUrl(cfg, 'https://example.com/notes/?a=1#stare');
    expect(url.startsWith('https://example.com/notes/?a=1#c=')).toBe(true);
    expect(configFromHash(new URL(url).hash)?.title).toBe('Link');
    expect(configFromHash('#inne=1')).toBeNull();
    expect(configFromHash('')).toBeNull();
  });
});

describe('colours for a laser', () => {
  it('luminance: black 0, white 1', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBeCloseTo(1);
  });

  it('the whole palette and themes are dark enough for a laser', () => {
    for (const p of PALETTE) expect(tooLightForLaser(p.color), p.label).toBe(false);
    for (const t of COLOR_THEMES)
      for (const c of [t.grid, t.accent, t.ink]) expect(tooLightForLaser(c), t.label).toBe(false);
  });

  it('light grey dots that vanished in print are too light', () => {
    expect(tooLightForLaser('#b4b4b4')).toBe(true);
  });
});
