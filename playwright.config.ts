import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/results',
  globalSetup: './e2e/helpers/global-setup.ts',
  globalTeardown: './e2e/helpers/global-teardown.ts',
  fullyParallel: false, // serial — tests share state via DB
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // Watch mode locally; a single non-watching process in CI. `nest start --watch` binds the
      // port, then rebinds after its first rebuild, and on a CI runner the two overlap:
      // `EADDRINUSE :::3001`, and Playwright reports it as "webServer was not able to start".
      // Nothing is being watched in CI anyway.
      command: process.env.CI ? 'pnpm --filter api start' : 'pnpm --filter api start:dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      // A cold `nest start` on a CI runner compiles first; 60s is not enough.
      timeout: process.env.CI ? 180_000 : 60_000,
    },
    {
      command: 'pnpm --filter web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      // `next dev` compiles each route on first request, which is slow on a CI runner.
      timeout: process.env.CI ? 120_000 : 30_000,
    },
  ],
});
