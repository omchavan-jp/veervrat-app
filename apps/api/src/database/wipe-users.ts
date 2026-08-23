/**
 * Removes every user and everything belonging to them, leaving seeded reference content and the
 * policy documents intact. For resetting a pre-launch environment.
 *
 * ⚠️ THIS IS THE MOST DESTRUCTIVE THING IN THE REPOSITORY. Read the guards below before running
 * it anywhere, and read `DEPLOYMENT.md` → "Wiping an environment's users" before running it on
 * production.
 *
 * Why a truncate rather than deleting users: most relations to `User` are `Restrict`, not
 * `Cascade` — deleting a user who has a journey, a blog post or an audit event simply fails.
 * That is deliberate, and is why the application *anonymises* an account rather than deleting
 * it. A wipe is a different operation with a different tool: `TRUNCATE ... CASCADE` lets
 * Postgres work out the dependency closure, which is 31 tables here.
 *
 * Verified: the closure contains only user-owned data. `cms_pages` is absent — `updated_by_id`
 * carries no foreign key — so the terms and privacy documents survive, as does every seeded
 * table (virtues, weaknesses, sentences, shlokas, resources).
 */

import * as path from 'node:path';
import * as dotenv from 'dotenv';
import type { PrismaClient } from '@prisma/client';
import { createCliPrisma } from './cli-prisma';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Above this many accounts, refuse. The decision to wipe is only defensible while the data is
 * disposable, and a number this small cannot be a real user base. Same reasoning as the guard in
 * the age-gate migration: encode the assumption so it fails loudly when it stops being true.
 */
export const MAX_USERS_TO_WIPE = 50;

export type WipeConfig = { confirm: string; environment: string };

export function readConfig(env: NodeJS.ProcessEnv = process.env): WipeConfig {
  return {
    confirm: (env.WIPE_USERS_CONFIRM ?? '').trim(),
    environment: (env.ENVIRONMENT ?? '').trim(),
  };
}

/** Returns an exit code rather than calling process.exit, so it is testable. */
export async function wipeUsers(
  prisma: Pick<PrismaClient, 'user' | '$executeRawUnsafe'>,
  config: WipeConfig,
): Promise<number> {
  if (!config.confirm) {
    console.log('WIPE_USERS_CONFIRM is not set — nothing to do.');
    return 0;
  }

  // The confirmation must NAME the environment being wiped. A boolean flag, or a value like
  // "yes", could be left set in one environment's configuration and then carried into another
  // by a copied file. Naming the target means a value that leaks somewhere else does nothing.
  if (config.confirm !== config.environment) {
    console.error(
      `Refusing: WIPE_USERS_CONFIRM is ${JSON.stringify(config.confirm)} but this environment is ` +
        `${JSON.stringify(config.environment)}. Set it to the environment you intend to wipe.`,
    );
    return 1;
  }

  const count = await prisma.user.count();

  if (count > MAX_USERS_TO_WIPE) {
    console.error(
      `Refusing: ${count} accounts exist, which is more than ${MAX_USERS_TO_WIPE}. This is meant ` +
        'for resetting an environment whose data is disposable. If this is deliberate, it needs ' +
        'a human decision and not a raised threshold.',
    );
    return 1;
  }

  if (count === 0) {
    console.log('No users to remove.');
    return 0;
  }

  console.log(
    `Removing ${count} account(s) and all data belonging to them, in ${config.environment}.`,
  );

  // CASCADE resolves the dependency closure. Naming only `users` keeps this correct as the
  // schema grows: a table added later that references a user is included automatically, whereas
  // a hand-maintained list would silently miss it.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');

  const remaining = await prisma.user.count();
  console.log(`Done. Users remaining: ${remaining}.`);
  console.log('Seeded reference content and the policy documents are untouched.');

  return remaining === 0 ? 0 : 1;
}

async function main(): Promise<void> {
  const prisma = createCliPrisma();
  await prisma.$connect();
  try {
    process.exitCode = await wipeUsers(prisma, readConfig());
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
