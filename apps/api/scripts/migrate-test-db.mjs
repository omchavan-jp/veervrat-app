/**
 * Brings the integration test database up to date before the suite runs.
 *
 * CI does this (`.github/workflows/integration.yml` → `db:migrate:deploy`); locally nothing did,
 * so the test database drifted from the schema and stayed drifted. It was missing
 * `pending_signups` entirely — a table the app uses in production — which meant every local
 * integration run was silently weaker than CI while looking identical, and anything touching
 * that table had no integration coverage at all.
 *
 * Running the same command CI runs, from the same schema, is what keeps "it passes locally" and
 * "it passes in CI" the same sentence.
 */
import { config } from 'dotenv';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../.env.test') });

if (!process.env.DATABASE_URL) {
  console.error('No DATABASE_URL in apps/api/.env.test — cannot migrate the test database.');
  process.exit(1);
}

execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
  cwd: resolve(here, '..'),
});
