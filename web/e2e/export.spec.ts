import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { openNotebook, openTab, pageCount, settled } from './helpers';

async function downloadPdf(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Pobierz PDF' }).click(),
  ]);
  const bytes = await readFile((await download.path())!);
  return { name: download.suggestedFilename(), text: bytes.toString('latin1') };
}

const pdfPages = (pdf: string) => (pdf.match(/\/Type\s*\/Page\b/g) ?? []).length;
const mediaBoxes = (pdf: string) =>
  [...pdf.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
const mm = (pt: number) => (pt * 25.4) / 72;

test.describe('PDF export', () => {
  test('the PDF has as many pages as the preview and the format’s dimensions', async ({ page }) => {
    await openNotebook(page);
    const { name, text } = await downloadPdf(page);
    expect(name).toBe('notes-podrozny-110x210.pdf');
    expect(text.startsWith('%PDF-')).toBe(true);
    expect(pdfPages(text)).toBe(await pageCount(page));
    const [w, h] = mediaBoxes(text)[0]!;
    expect(mm(w!)).toBeCloseTo(110, 0);
    expect(mm(h!)).toBeCloseTo(210, 0);
  });

  test('PDF after changes: Pocket format, more sections', async ({ page }) => {
    await openNotebook(page);
    await page.getByRole('radio', { name: /Pocket/ }).click();
    await openTab(page, 'Strony');
    await page.getByTestId('section-weeks').getByRole('switch').click();
    await page.getByTestId('section-habits').getByRole('switch').click();
    await settled(page);
    const expected = await pageCount(page);
    const { name, text } = await downloadPdf(page);
    expect(name).toBe('notes-podrozny-90x140.pdf');
    expect(pdfPages(text)).toBe(expected);
    const [w, h] = mediaBoxes(text)[0]!;
    expect(mm(w!)).toBeCloseTo(90, 0);
    expect(mm(h!)).toBeCloseTo(140, 0);
  });

  test('the button shows preparation', async ({ page }) => {
    await openNotebook(page);
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Pobierz PDF' }).click();
    await downloaded;
    await expect(page.getByRole('button', { name: 'Pobierz PDF' })).toBeEnabled();
  });
});
