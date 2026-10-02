import { expect, test } from '@playwright/test';
import { defaultConfig } from '../src/notebook/config';
import { encodeConfig } from '../src/notebook/share';
import { openNotebook, pageCanvas, settled } from './helpers';

// The typst.ts compiler doesn't free memory between compilations: every new version of a notebook
// with all sections adds ~300 MB of WASM memory. Without swapping the worker the preview died
// after a dozen or so changes ("RuntimeError: unreachable"); now it has to survive any number.
test('the preview survives many compilations of a large notebook', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'the leak is in the WASM compiler, not the browser');
  test.setTimeout(180_000);
  // every new worker is a fresh instance of the WASM compiler
  let workers = 0;
  page.on('worker', () => workers++);
  const cfg = defaultConfig(2027);
  cfg.sections = cfg.sections.map((s) => ({ ...s, enabled: true }));
  await openNotebook(page, `/#c=${encodeConfig(cfg)}`);
  const title = page.getByLabel(/Na stronie tytułowej/);
  for (let i = 0; i < 30; i++) {
    // a different title every time: the same version hits the compiler's cache
    // and memory doesn't grow
    await title.fill(`Notes ${i}`);
    // after the delay (COMPILE_DEBOUNCE_MS) compilation is already running; we wait for it to finish
    await page.waitForTimeout(300);
    await settled(page);
    await expect(page.getByText('Tej wersji nie da się złożyć')).toHaveCount(0);
  }
  await expect(pageCanvas(page, 1)).toHaveAttribute('data-ready', 'true');
  expect(workers).toBeGreaterThan(1);
});
