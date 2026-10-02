import { expect, type Page } from '@playwright/test';

// Opens the Design step and waits until the cover opens and page 1 is drawn.
export async function openNotebook(page: Page, path = '/#step=design') {
  await page.goto(path);
  await expect(page.getByTestId('engine-loading')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('spread-label')).toHaveText('Strona 1');
  await expect(page.getByTestId('leaf')).toHaveCount(0);
  await expect(pageCanvas(page, 1)).toHaveAttribute('data-ready', 'true');
}

// A large page in the notebook (not a thumbnail).
export function pageCanvas(page: Page, n: number) {
  return page.getByTestId('book').locator(`canvas[data-page="${n}"]`);
}

export async function pageCount(page: Page): Promise<number> {
  const text = (await page.getByTestId('page-count').textContent()) ?? '';
  return Number(/(\d+) stron/.exec(text)?.[1]);
}

// Waits for compilation to finish after a settings change.
export async function settled(page: Page) {
  await expect(page.getByTestId('compiling')).toHaveCount(0);
}

// A "fingerprint" of a drawn page: the number of non-white pixels (small dots at a small
// scale come out as light grey pixels, so the threshold is close to white).
export async function inkOf(page: Page, n: number): Promise<number> {
  const canvas = pageCanvas(page, n);
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  return canvas.evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext('2d')!;
    const { data } = ctx.getImageData(0, 0, el.width, el.height);
    let dark = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i]! < 245) dark++;
    return dark;
  });
}

export async function openTab(page: Page, name: 'Format' | 'Papier' | 'Strony' | 'Wygląd') {
  await page.getByRole('tab', { name }).click();
  const panel = page.getByRole('tabpanel', { name });
  await expect(panel).toBeVisible();
  // end of the entry animation (transparency lowers the contrast in accessibility tests)
  await expect(panel).toHaveCSS('opacity', '1');
}

export async function goToSpread(page: Page, label: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(page.getByTestId('spread-label')).toHaveText(label);
  await expect(page.getByTestId('leaf')).toHaveCount(0);
}
