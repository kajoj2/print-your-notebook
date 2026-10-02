import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openNotebook, openTab } from './helpers';

const TABS = ['Format', 'Papier', 'Strony', 'Wygląd'] as const;

test.describe('accessibility', () => {
  for (const tab of TABS) {
    test(`no serious violations: tab ${tab}`, async ({ page }) => {
      await openNotebook(page);
      await openTab(page, tab);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(
        serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      ).toEqual([]);
    });
  }

  for (const step of ['start', 'printer', 'test', 'print', 'assembly']) {
    test(`no serious violations: step ${step}`, async ({ page }) => {
      await page.goto(`/#step=${step}`);
      await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(
        serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      ).toEqual([]);
    });
  }

  test('everything can be operated with the keyboard', async ({ page }) => {
    await openNotebook(page);
    // tabs: arrow keys switch
    await page.getByRole('tab', { name: 'Format' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Papier' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('tabpanel', { name: 'Papier' })).toBeVisible();
    // page pattern: a radio group, arrow keys change the choice
    await page.getByRole('radio', { name: 'Kropki' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Linie' })).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.getByRole('radio', { name: 'Linie' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
