import { defineConfig, devices } from '@playwright/test';

const port = process.env.PORT || '3000';
const dataDir = process.env.SAFEPLAN_DATA_DIR || '.safeplan-data/e2e';
const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || `http://127.0.0.1:${port}`;
const aiProviderMode = process.env.AI_PROVIDER_MODE || 'mock';
const paymentProvider = process.env.PAYMENT_PROVIDER || 'mock';

export default defineConfig({
  testDir: './src/tests/e2e',
  timeout: process.env.LIVE_E2E ? 120_000 : 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: appUrl,
    trace: 'on-first-retry'
  },
  webServer: {
    command: `rm -rf ${dataDir} && SAFEPLAN_DATA_DIR=${dataDir} APP_URL=${appUrl} NEXT_PUBLIC_APP_URL=${appUrl} PORT=${port} AI_PROVIDER_MODE=${aiProviderMode} PAYMENT_PROVIDER=${paymentProvider} pnpm start`,
    url: appUrl,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
    timeout: 120_000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
