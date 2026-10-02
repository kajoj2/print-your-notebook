import { expect, test } from '@playwright/test';
import { goToSpread, inkOf, openNotebook, pageCanvas, pageCount } from './helpers';

test.describe('notebook preview', () => {
  test('after loading the cover opens on the title page', async ({ page }) => {
    await page.goto('/#step=design');
    await expect(page.getByTestId('cover-front')).toBeVisible({ timeout: 60_000 });
    await openNotebook(page);
    expect(await pageCount(page)).toBe(32);
    expect(await inkOf(page, 1)).toBeGreaterThan(500);
    await expect(page.getByTestId('cover-inside').first()).toBeVisible();
  });

  test('a leaf turns when moving forward', async ({ page }) => {
    await openNotebook(page);
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('leaf')).toBeVisible();
    await expect(page.getByTestId('spread-label')).toHaveText('Strony 2–3');
    await expect(page.getByTestId('leaf')).toHaveCount(0);
    await expect(pageCanvas(page, 2)).toHaveAttribute('data-ready', 'true');
    await expect(pageCanvas(page, 3)).toHaveAttribute('data-ready', 'true');
  });

  test('navigation: buttons, keys, thumbnails, sections', async ({ page }) => {
    await openNotebook(page);
    await page.getByRole('button', { name: 'Następna rozkładówka' }).click();
    await expect(page.getByTestId('spread-label')).toHaveText('Strony 2–3');
    await page.getByRole('button', { name: 'Poprzednia rozkładówka' }).click();
    await expect(page.getByTestId('spread-label')).toHaveText('Strona 1');

    await page.keyboard.press('End');
    await expect(page.getByTestId('spread-label')).toHaveText('Strona 32');
    await page.keyboard.press('Home');
    await expect(page.getByTestId('spread-label')).toHaveText('Strona 1');

    await page
      .getByRole('navigation', { name: 'Miniatury rozkładówek' })
      .getByRole('button', { name: 'Strony 10–11' })
      .click();
    await expect(page.getByTestId('spread-label')).toHaveText('Strony 10–11');

    await page
      .getByRole('group', { name: 'Przejdź do sekcji' })
      .getByRole('button', { name: 'Indeks' })
      .click();
    await expect(page.getByTestId('spread-label')).toHaveText('Strony 2–3');
  });

  test('fast clicking ends at the last target', async ({ page }) => {
    await openNotebook(page);
    const next = page.getByRole('button', { name: 'Następna rozkładówka' });
    for (let i = 0; i < 4; i++) await next.click();
    await expect(page.getByTestId('spread-label')).toHaveText('Strony 8–9');
    await expect(page.getByTestId('book')).toHaveAttribute('data-spread', '4');
    await expect(page.getByTestId('leaf')).toHaveCount(0);
  });

  test('thumbnails draw pages', async ({ page }) => {
    await openNotebook(page);
    const thumb = page.getByTestId('thumb-2').locator('canvas').first();
    await expect(thumb).toHaveAttribute('data-ready', 'true');
  });

  test('reduced motion: no page turning', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await openNotebook(page);
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('spread-label')).toHaveText('Strony 2–3');
    await expect(page.getByTestId('leaf')).toHaveCount(0);
    await expect(page.getByTestId('book')).toHaveAttribute('data-spread', '1');
    await context.close();
  });

  test('the last spread: inside of the back cover', async ({ page }) => {
    await openNotebook(page);
    await page.keyboard.press('End');
    await expect(page.getByTestId('leaf')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Następna rozkładówka' })).toBeDisabled();
    await expect(page.getByTestId('book').getByTestId('cover-inside')).toBeVisible();
    await goToSpread(page, 'Strony 2–3');
  });
});
