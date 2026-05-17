import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'rm -rf .safeplan-data/e2e && SAFEPLAN_DATA_DIR=.safeplan-data/e2e NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 PORT=3000 pnpm start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
