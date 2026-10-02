import { expect, test } from '@playwright/test';
import { openNotebook, openTab } from './helpers';

test.describe('link and persistence', () => {
  test('a link recreates the configuration in a new browser', async ({ page, browser }) => {
    await openNotebook(page);
    await page.getByLabel(/Na stronie tytułowej/).fill('Dziennik z linku');
    await page.getByRole('radio', { name: /Pocket/ }).click();
    await openTab(page, 'Papier');
    await page.getByRole('radio', { name: 'Kratka' }).click();
    await page.getByRole('button', { name: /Kopiuj link/ }).click();
    await expect(page.getByRole('button', { name: 'Link skopiowany' })).toBeVisible();
    await expect(page).toHaveURL(/#c=/);
    const url = page.url();

    const other = await browser.newContext();
    const fresh = await other.newPage();
    await openNotebook(fresh, url);
    await expect(fresh.getByLabel(/Na stronie tytułowej/)).toHaveValue('Dziennik z linku');
    await expect(fresh.getByTestId('page-count')).toContainText('90 × 140 mm');
    await openTab(fresh, 'Papier');
    await expect(fresh.getByRole('radio', { name: 'Kratka' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await other.close();
  });

  test('settings survive a page reload', async ({ page }) => {
    await openNotebook(page);
    await page.getByRole('radio', { name: /Passport/ }).click();
    await expect(page.getByTestId('page-count')).toContainText('89 × 124 mm');
    await page.reload();
    await openNotebook(page);
    await expect(page.getByTestId('page-count')).toContainText('89 × 124 mm');
  });

  test('start over restores the defaults', async ({ page }) => {
    await openNotebook(page);
    await page.getByRole('radio', { name: /Passport/ }).click();
    await page.getByRole('button', { name: /Od nowa/ }).click();
    await expect(page.getByTestId('page-count')).toContainText('110 × 210 mm');
  });

  test('a broken link doesn’t break the page', async ({ page }) => {
    await openNotebook(page, '/#c=to-nie-jest-konfiguracja');
    await expect(page.getByTestId('page-count')).toContainText('110 × 210 mm');
  });
});
