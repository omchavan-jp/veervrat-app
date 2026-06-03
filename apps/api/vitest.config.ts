import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    projects: [
      {
        // Unit tests — no DB, no external deps
        plugins: [tsconfigPaths()],
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
          exclude: ['src/**/*.integration.spec.ts', 'src/test/**'],
          environment: 'node',
          globals: true,
        },
      },
      {
        // Integration tests — real test DB, serial execution
        plugins: [tsconfigPaths()],
        test: {
          name: 'integration',
          include: ['src/**/*.integration.spec.ts', 'src/test/smoke.spec.ts'],
          environment: 'node',
          globals: true,
          setupFiles: ['src/test/setup.ts'],
          pool: 'forks',
          singleFork: true,
          hookTimeout: 30_000, // NestJS bootstrap can take 10–20s on cold CI
        },
      },
    ],
  },
});
