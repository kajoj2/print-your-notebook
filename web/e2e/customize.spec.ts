import { expect, test } from '@playwright/test';
import { defaultConfig } from '../src/notebook/config';
import { encodeConfig } from '../src/notebook/share';
import {
  goToSpread,
  inkOf,
  openNotebook,
  openTab,
  pageCanvas,
  pageCount,
  settled,
} from './helpers';

test.describe('settings change the notebook', () => {
  test.beforeEach(async ({ page }) => {
    await openNotebook(page);
  });

  test('page pattern: dots → lines → blank', async ({ page }) => {
    await goToSpread(page, 'Strony 4–5');
    const dots = await inkOf(page, 4);
    await openTab(page, 'Papier');
    await page.getByRole('radio', { name: 'Linie' }).click();
    await settled(page);
    await expect.poll(() => inkOf(page, 4)).not.toBe(dots);
    const lines = await inkOf(page, 4);
    await page.getByRole('radio', { name: 'Czysta' }).click();
    await settled(page);
    // blank page: only the page number remains
    await expect.poll(() => inkOf(page, 4)).toBeLessThan(Math.min(dots, lines) / 5);
  });

  test('a denser grid has more ink', async ({ page }) => {
    await goToSpread(page, 'Strony 4–5');
    const before = await inkOf(page, 4);
    await openTab(page, 'Papier');
    const slider = page.getByRole('slider', { name: 'Odstęp' });
    await slider.focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
    await settled(page);
    await expect.poll(() => inkOf(page, 4)).toBeGreaterThan(before * 1.5);
  });

  test('the passport format changes the page proportions', async ({ page }) => {
    const ratio = async () => {
      const box = (await pageCanvas(page, 1).boundingBox())!;
      return box.width / box.height;
    };
    expect(await ratio()).toBeCloseTo(110 / 210, 1);
    await page.getByRole('radio', { name: /Passport/ }).click();
    await expect(page.getByTestId('page-count')).toContainText('89 × 124 mm');
    await expect.poll(ratio).toBeCloseTo(89 / 124, 1);
  });

  test('custom format', async ({ page }) => {
    await page.getByRole('radio', { name: /Własny/ }).click();
    await page.getByLabel('Szerokość').fill('150');
    await page.getByLabel('Wysokość').fill('150');
    await page.getByLabel('Wysokość').press('Enter');
    await expect(page.getByTestId('page-count')).toContainText('150 × 150 mm');
    await settled(page);
    const box = (await pageCanvas(page, 1).boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(1, 1);
  });

  test('enabling the year calendar adds a page and a section', async ({ page }) => {
    await openTab(page, 'Strony');
    const row = page.getByTestId('section-year');
    await row.getByRole('switch').click();
    await settled(page);
    await expect(
      page
        .getByRole('group', { name: 'Przejdź do sekcji' })
        .getByRole('button', { name: 'Kalendarz roczny' }),
    ).toBeVisible();
    // title 1 + index 2 + year 1 + notes 28 (the rest of 32) = 32
    await expect(row.getByText('s. 4')).toBeVisible();
    expect(await pageCount(page)).toBe(32);
  });

  test('volume: notes fill the rest, too many pages gives a warning', async ({ page }) => {
    await page
      .getByRole('radiogroup', { name: 'Liczba stron' })
      .getByRole('radio', { name: '16' })
      .click();
    await expect(page.getByTestId('page-count')).toContainText('16 stron');
    await openTab(page, 'Strony');
    // title 1 + index 2 + notes 13 = 16
    await expect(page.getByTestId('section-notes').getByText('s. 4–16')).toBeVisible();
    // title 1 + index 2 + 12 months = 15: it fits, the notes get 1 page
    await page.getByTestId('section-months').getByRole('switch').click();
    await expect(page.getByTestId('volume-usage')).toHaveText('16 / 16');
    // 20 months: 23 pages > 16
    await page.getByTestId('section-months').getByLabel('Ile miesięcy').fill('20');
    await page.getByTestId('section-months').getByLabel('Ile miesięcy').press('Enter');
    await expect(page.getByRole('alert')).toContainText('Za dużo o 7 stron');
    await settled(page);
    await expect(page.getByTestId('over-volume')).toBeVisible();
    await page.getByRole('button', { name: 'Zwiększ do 24 stron' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await settled(page);
    await expect(page.getByTestId('over-volume')).toHaveCount(0);
    expect((await pageCount(page)) % 4).toBe(0);
  });

  test('all sections at once lay out without errors', async ({ page }) => {
    // through a link, not 25 clicks: expanding settings move the following
    // switches, and on slow CI the clicks waited forever for them to settle
    const cfg = defaultConfig(2027);
    for (const s of cfg.sections) s.enabled = true;
    await openNotebook(page, `/#c=${encodeConfig(cfg)}`);
    await openTab(page, 'Strony');
    await expect(
      page.locator('[data-testid^="section-"] [role="switch"][aria-checked="false"]'),
    ).toHaveCount(0);
    await settled(page);
    // no layout error; the volume exceeded warning is expected
    await expect(page.getByRole('alert').filter({ hasText: 'nie da się złożyć' })).toHaveCount(0);
    await expect(page.getByRole('alert').filter({ hasText: 'Za dużo o' })).toBeVisible();
    expect(await pageCount(page)).toBeGreaterThan(60);
    expect((await pageCount(page)) % 4).toBe(0);
    await expect(
      page.getByRole('group', { name: 'Przejdź do sekcji' }).getByRole('button'),
      // all sections exceed 32 pages: notes filling the rest get 0
      // and drop out of the layout
    ).toHaveCount(25);
  });

  test('reordering sections changes the order in the notebook', async ({ page }) => {
    await openTab(page, 'Strony');
    const handle = page.getByRole('button', { name: /Przestaw: Strony na notatki/ });
    await handle.focus();
    for (let i = 0; i < 13; i++) await page.keyboard.press('ArrowUp');
    await settled(page);
    const chips = page.getByRole('group', { name: 'Przejdź do sekcji' }).getByRole('button');
    await expect(chips.first()).toHaveText('Strony na notatki');
    await expect(page.getByTestId('section-notes').getByText('s. 1–29')).toBeVisible();
  });

  test('the title appears on the cover and the title page', async ({ page }) => {
    const before = await inkOf(page, 1);
    await page.getByLabel(/Na stronie tytułowej/).fill('Włóczęga po Bałkanach 2027');
    await settled(page);
    await expect.poll(() => inkOf(page, 1)).toBeGreaterThan(before);
    await page.keyboard.press('Home');
  });

  test('the font changes the title page', async ({ page }) => {
    const before = await inkOf(page, 1);
    await openTab(page, 'Wygląd');
    await page.getByRole('radio', { name: /Libertinus Serif/ }).click();
    await settled(page);
    await expect.poll(() => inkOf(page, 1)).not.toBe(before);
  });

  test('numbering off: less ink on a grid page', async ({ page }) => {
    await goToSpread(page, 'Strony 4–5');
    await openTab(page, 'Papier');
    await page.getByRole('radio', { name: 'Czysta' }).click();
    await settled(page);
    await expect.poll(() => inkOf(page, 4)).toBeGreaterThan(0);
    await openTab(page, 'Wygląd');
    await page.getByRole('switch', { name: /Numeruj strony/ }).click();
    await settled(page);
    await expect.poll(() => inkOf(page, 4)).toBe(0);
  });
});
