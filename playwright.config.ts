import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Phaser/WebAudio pages are GPU- and decoder-heavy. A single worker keeps
  // audio handoffs, fixed-step timing, and viewport measurements deterministic
  // instead of making game regressions depend on machine-level contention.
  workers: 1,
  // Headless Chromium on GitHub's software-rendered Linux VM is ~4× slower
  // than local GPU-backed runs at 1920×1080. Keep the strict local budget, but
  // let hosted layout/playfield assertions finish rather than timing out mid-read.
  timeout: process.env.CI ? 120_000 : 45_000,
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
