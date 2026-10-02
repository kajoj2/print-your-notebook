// A notebook in English with a Sunday-first week through the real compiler (WASM).
import { describe, expect, it } from 'vitest';
import { allEnabled, compilePdf, setupEngine } from './typstTest';

setupEngine();

describe('notebook language', () => {
  it('all sections in English, Sunday-first week: as many pages as in Polish', async () => {
    const pl = await compilePdf(allEnabled());
    const en = await compilePdf({ ...allEnabled(), lang: 'en', weekStart: 'sunday' });
    expect(en.pages).toBe(pl.pages);
    expect(en.sections).toEqual(pl.sections);
  });
});
