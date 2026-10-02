import { describe, expect, it } from 'vitest';
import { defaultConfig, type NotebookConfig, type Section } from './config';
import { contentPages, fittingVolume, notesPages, planVolume, weekSpan } from './volume';

const cfg = (on: Section['type'][], patch: (c: NotebookConfig) => void = () => {}) => {
  const c = defaultConfig(2027);
  for (const s of c.sections) s.enabled = on.includes(s.type);
  patch(c);
  return c;
};
// notes before the given section (by default they're at the end)
const notesBefore = (c: NotebookConfig, type: Section['type']) => {
  const notes = c.sections.find((s) => s.type === 'notes')!;
  const rest = c.sections.filter((s) => s !== notes);
  rest.splice(
    rest.findIndex((s) => s.type === type),
    0,
    notes,
  );
  c.sections = rest;
};

const sec = <T extends Section['type']>(c: NotebookConfig, type: T) =>
  c.sections.find((s) => s.type === type) as Extract<Section, { type: T }>;

describe('volume', () => {
  it('notes fill the rest', () => {
    const c = cfg(['title', 'index', 'notes']);
    expect(notesPages(c)).toBe(29);
    expect(planVolume(c)).toMatchObject({ target: 32, content: 32, over: 0, printed: 32 });
  });

  it('a week spread after an odd page gets a blank page', () => {
    // title on 1 -> week from page 2 (even), no blank
    expect(contentPages(cfg(['title', 'weeks']), 0)).toBe(1 + 2 * 4);
    // title + index = 3 -> week from 4, no blank
    expect(contentPages(cfg(['title', 'index', 'weeks']), 0)).toBe(3 + 8);
    // title + index + year = 4 -> next is 5 (odd) -> blank 5, week from 6
    expect(contentPages(cfg(['title', 'index', 'year', 'weeks']), 0)).toBe(4 + 1 + 8);
  });

  it('notes before a spread: one fewer when they would force a blank page', () => {
    const c = cfg(['title', 'notes', 'weeks'], (x) => {
      x.pages = 16;
      notesBefore(x, 'weeks');
    });
    // title 1 + weeks 8 = 9; 7 remain, but 7 notes put the week on page 9
    // (odd): a blank page would give 17 > 16, so 6 notes and 1 grid page at the end
    expect(notesPages(c)).toBe(6);
    expect(planVolume(c)).toMatchObject({ content: 15, over: 0, printed: 16 });
  });

  it('too much: notes get 0, print padded to a full signature', () => {
    const c = cfg(['title', 'months', 'notes'], (x) => {
      x.pages = 8;
      sec(x, 'months').count = 12;
    });
    const v = planVolume(c);
    expect(v).toMatchObject({ notes: 0, content: 13, over: 5, printed: 16 });
    expect(fittingVolume(v)).toBe(16);
  });

  it('notes with a fixed page count', () => {
    const c = cfg(['title', 'notes'], (x) =>
      Object.assign(sec(x, 'notes'), { fill: false, pages: 10 }),
    );
    expect(planVolume(c)).toMatchObject({ notes: 10, content: 11, over: 0, printed: 32 });
  });

  it('signature sheets and A4 sheets: pocket has two signatures per sheet', () => {
    const c = cfg(['notes'], (x) => (x.pages = 40));
    expect(planVolume(c)).toMatchObject({ sheets: 10, a4: 10, tooThick: false });
    c.format = { preset: 'pocket', width: 90, height: 140 };
    expect(planVolume(c)).toMatchObject({ sheets: 10, a4: 5 });
  });

  it('more than 12 sheets is too thick a signature', () => {
    expect(planVolume(cfg(['notes'], (x) => (x.pages = 48))).tooThick).toBe(false);
    expect(planVolume(cfg(['notes'], (x) => (x.pages = 52))).tooThick).toBe(true);
  });

  it('weeks clamped to the end of the ISO year', () => {
    // 2027 has 52 ISO weeks
    expect(weekSpan(2027, 51, 5)).toEqual([51, 52]);
    expect(weekSpan(2027, 99, 1)).toEqual([52, 52]);
  });
});
