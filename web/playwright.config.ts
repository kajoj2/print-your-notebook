import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const CI = !!process.env.CI;

// Tests run against the built site (vite preview): the same code, WASM and paths as in production.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 20_000 },
  use: {
    // tests are in Polish; the English version has separate tests with the en-US locale
    locale: 'pl-PL',
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: /mobile/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: /mobile/ },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, testMatch: /mobile/ },
    { name: 'mobile-safari', use: { ...devices['iPhone 15'] }, testMatch: /mobile/ },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
});
