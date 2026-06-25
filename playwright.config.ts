import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3005';
const isCi = process.env.CI === 'true';

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  outputDir: 'test-results/e2e',
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  retries: isCi ? 1 : 0,
  testDir: './e2e',
  timeout: 60_000,
  use: {
    actionTimeout: 15_000,
    baseURL,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  workers: 1,
});
