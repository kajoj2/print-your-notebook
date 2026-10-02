import { expect, test } from '@playwright/test';
import { openNotebook, openTab } from './helpers';

test.describe('phone', () => {
  test('notebook on top, settings below it, no horizontal scrolling', async ({ page }) => {
    await openNotebook(page);
    const book = (await page.getByTestId('book').boundingBox())!;
    const panel = (await page.getByRole('complementary', { name: 'Ustawienia' }).boundingBox())!;
    expect(book.y).toBeLessThan(panel.y);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const viewport = page.viewportSize()!;
    expect(book.x).toBeGreaterThanOrEqual(0);
    // the whole notebook visible right after opening (no scrolling)
    expect(book.y).toBeGreaterThanOrEqual(0);
    expect(book.y + book.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.querySelector('main')!.scrollTop)).toBe(0);
    expect(book.x + book.width).toBeLessThanOrEqual(viewport.width);
  });

  test('settings work on a phone', async ({ page }) => {
    await openNotebook(page);
    await openTab(page, 'Papier');
    await page.getByRole('radio', { name: 'Linie' }).tap();
    await expect(page.getByRole('radio', { name: 'Linie' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.getByRole('button', { name: 'Następna rozkładówka' }).tap();
    await expect(page.getByTestId('spread-label')).toHaveText('Strony 2–3');
  });
});

test.describe('wizard on a phone', () => {
  for (const step of ['start', 'printer', 'test', 'print', 'assembly']) {
    test(`step ${step}: no horizontal scrolling, buttons within reach`, async ({ page }) => {
      await page.goto(`/#step=${step}`);
      await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      // the current step visible in the step bar
      await expect(page.getByRole('navigation').locator('[aria-current="step"]')).toBeInViewport();
    });
  }
});
