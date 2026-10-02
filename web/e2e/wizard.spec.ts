import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { openTab, settled } from './helpers';

const pdfPages = (pdf: string) => (pdf.match(/\/Type\s*\/Page\b/g) ?? []).length;
const sizesMm = (pdf: string) =>
  [...pdf.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map((m) =>
    [m[1], m[2]].map((pt) => Math.round((Number(pt) * 25.4) / 72)).join('×'),
  );

async function download(page: Page, name: RegExp) {
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name }).click(),
  ]);
  const text = (await readFile((await file.path())!)).toString('latin1');
  return { name: file.suggestedFilename(), text };
}

const next = (page: Page, name: RegExp = /^Dalej/) => page.getByRole('button', { name }).click();

test.describe('print wizard', () => {
  test('from start to files: manual duplex, landscape A4', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Wydrukuj własny notes', exact: true }),
    ).toBeVisible();
    await next(page, /Zaczynamy/);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Drukarka i papier', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('radio', { name: /Ręcznie/ })).toBeChecked();
    await next(page);
    await expect(page.getByTestId('engine-loading')).toBeHidden({ timeout: 60_000 });
    await settled(page);
    await next(page, /Dalej: próba/);
    await next(page);
    await expect(page.getByRole('heading', { level: 2, name: 'Druk', exact: true })).toBeVisible();
    await expect(page.getByTestId('print-sheets')).toHaveText('8');
    await page.getByRole('button', { name: /Przygotuj pliki do druku/ }).click();

    const fronts = await download(page, /Przody kartek/);
    expect(fronts.name).toBe('notes-podrozny-110x210-1-przody.pdf');
    expect(pdfPages(fronts.text)).toBe(8);
    expect(new Set(sizesMm(fronts.text))).toEqual(new Set(['297×210']));
    const backs = await download(page, /Tyły kartek/);
    expect(pdfPages(backs.text)).toBe(8);

    await next(page);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Składanie', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Góry i dołu nie przycinasz/)).toBeVisible();
  });

  test('pocket, automatic duplex: one file, portrait A4', async ({ page }) => {
    await page.goto('/#step=printer');
    await page.getByRole('radio', { name: /Drukarka sama/ }).click();
    await page
      .getByRole('navigation', { name: 'Kroki kreatora' })
      .getByRole('button', { name: /Projekt/ })
      .click();
    await expect(page.getByTestId('engine-loading')).toBeHidden({ timeout: 60_000 });
    await openTab(page, 'Format');
    await page.getByRole('radio', { name: /Pocket/ }).click();
    await settled(page);
    await next(page, /Dalej: próba/);
    await next(page);
    await expect(page.getByText(/dłuższej krawędzi/)).toBeVisible();
    await expect(page.getByTestId('print-sheets')).toContainText('4');
    await page.getByRole('button', { name: /Przygotuj pliki do druku/ }).click();
    const both = await download(page, /dwustronnie/);
    expect(pdfPages(both.text)).toBe(8);
    expect(sizesMm(both.text)[0]).toBe('210×297');
    await next(page);
    await expect(page.getByText(/Przetnij cały stos na pół/)).toBeVisible();
  });

  test('the printer profile survives a reload, and a design link doesn’t contain it', async ({
    page,
  }) => {
    await page.goto('/#step=printer');
    await page.getByRole('radio', { name: /Drukarka sama/ }).click();
    await page.reload();
    await expect(page.getByRole('radio', { name: /Drukarka sama/ })).toBeChecked();
  });
});

test.describe('compatibility mode', () => {
  test('pages as images: portrait 210 × 297 sheets, no fonts', async ({ page }) => {
    await page.goto('/#step=printer');
    await page.getByRole('switch', { name: 'Drukuj strony jako obrazy' }).click();
    await page.goto('/#step=print');
    await expect(page.getByTestId('print-sheets')).toHaveText('8', { timeout: 60_000 });
    await page.getByRole('button', { name: /Przygotuj pliki do druku/ }).click();
    const fronts = await download(page, /Przody kartek/);
    expect(pdfPages(fronts.text)).toBe(8);
    expect(new Set(sizesMm(fronts.text))).toEqual(new Set(['210×297']));
    expect(fronts.text).toContain('/Image');
    expect(fronts.text).not.toContain('/FontFile');
  });
});

test.describe('in English', () => {
  test.use({ locale: 'en-US' });

  test('English browser: wizard and notebook in English', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Print your own notebook', exact: true }),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await next(page, /Get started/);
    await expect(page.getByRole('radio', { name: /By hand/ })).toBeChecked();
    await next(page, /^Next/);
    await expect(page.getByTestId('engine-loading')).toBeHidden({ timeout: 60_000 });
    await expect(page.getByTestId('page-count')).toContainText('32 pages');
    await expect(page.getByRole('tab', { name: 'Size' })).toBeVisible();
    await next(page, /Next: test print/);
    await next(page, /^Next/);
    await expect(page.getByRole('heading', { level: 2, name: 'Print', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Prepare files for printing/ }).click();
    const fronts = await download(page, /Fronts/);
    expect(fronts.name).toBe('travel-notebook-110x210-1-fronts.pdf');
    expect(pdfPages(fronts.text)).toBe(8);
    // en-US: Letter paper by default
    expect(new Set(sizesMm(fronts.text))).toEqual(new Set(['279×216']));
  });

  test('the language switch goes back to Polish', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'pl' }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Wydrukuj własny notes', exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Wydrukuj własny notes', exact: true }),
    ).toBeVisible();
  });
});
