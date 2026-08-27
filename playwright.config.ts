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
      // Watch mode locally; a single non-watching process in CI. Nothing is being watched there,
      // and one process is easier to reason about when something goes wrong.
      // (This was first changed on a wrong diagnosis of the EADDRINUSE above — see the web
      // server's comment for the real cause. Kept because it is still the better default.)
      command: process.env.CI ? 'pnpm --filter api start' : 'pnpm --filter api start:dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      // A cold `nest start` on a CI runner compiles first; 60s is not enough.
      timeout: process.env.CI ? 180_000 : 60_000,
    },
    {
      // Next reads `PORT` from the environment, and the e2e workflow sets `PORT=3001` for the API
      // at job level — so the web server inherited it, tried to bind the port the API already
      // held, and died with EADDRINUSE. Overridden per-process here rather than as a CLI flag:
      // `pnpm --filter web dev -- --port 3000` forwards the `--` literally and Next reads
      // `--port` as a directory name ("Invalid project directory provided").
      command: 'pnpm --filter web dev',
      env: { PORT: '3000' },
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      // `next dev` compiles each route on first request, which is slow on a CI runner.
      timeout: process.env.CI ? 120_000 : 30_000,
    },
  ],
});
