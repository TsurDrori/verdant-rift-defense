import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Phaser/WebAudio pages are GPU- and decoder-heavy. Capping concurrency
  // keeps viewport measurements deterministic instead of starving five
  // simultaneous game instances on typical laptops and hosted CI runners.
  workers: process.env.CI ? 2 : 3,
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
