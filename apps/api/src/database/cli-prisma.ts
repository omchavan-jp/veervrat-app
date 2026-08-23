import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * The one way a standalone script connects to the database.
 *
 * Prisma 7 refuses a bare `new PrismaClient()` — it needs a driver adapter — and the failure
 * only appears when the script actually runs. Every job here injects a mock client into its
 * testable function, so a broken connection in `main()` is invisible to the unit tests. The
 * nightly cleanup job shipped with exactly that mistake and failed on its first execution; a
 * manually-run job would have been caught by whoever ran it, but a scheduled one would simply
 * have stopped working, quietly, at 02:00.
 *
 * So there is one construction, shared. `DATABASE_URL` is asserted rather than defaulted: a
 * script that silently connects to the wrong database is worse than one that refuses to start.
 */
export function createCliPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — refusing to guess which database to connect to.');
  }

  return new PrismaClient({ adapter: new PrismaPg(url) });
}
