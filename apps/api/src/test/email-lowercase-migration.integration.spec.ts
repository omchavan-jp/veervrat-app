import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createTestApp, closeTestApp, getTestPrisma, cleanTestDb } from './helpers/app.helper';

/**
 * Covers `20260830080000_lowercase_email_storage` (#241) and the exact-match read it exists to
 * make safe.
 *
 * The migration itself is the test subject, not a reimplementation of it: the SQL is read off
 * disk and executed. Retyping the statements here would let the file and the test drift, and the
 * test would go on passing about a migration nobody runs.
 *
 * Integration rather than unit for two reasons the mocked client cannot supply: the collision
 * case is a unique index rejecting a write, and the index case is the query planner's decision.
 * Neither exists outside a real Postgres.
 */

const MIGRATION_SQL = readFileSync(
  resolve(
    __dirname,
    '../../prisma/migrations/20260830080000_lowercase_email_storage/migration.sql',
  ),
  'utf8',
);

/** Split on statement boundaries; `--` comments carry the reasoning and are not executable. */
function statements(): string[] {
  return MIGRATION_SQL.split(';')
    .map((s) =>
      s
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter((s) => s.length > 0);
}

async function runMigration(): Promise<void> {
  const prisma = getTestPrisma();
  // One transaction, which is how Prisma applies it — so a rejected statement rolls the whole
  // thing back rather than leaving half the table converted.
  await prisma.$transaction(async (tx) => {
    for (const s of statements()) await tx.$executeRawUnsafe(s);
  });
}

describe('lowercase_email_storage migration', () => {
  beforeAll(async () => {
    await createTestApp();
  }, 30_000);

  afterAll(async () => {
    await cleanTestDb();
    await closeTestApp();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  async function makeUser(email: string, opts: { google?: string } = {}) {
    const prisma = getTestPrisma();
    const suffix = randomUUID().slice(0, 8);
    const user = await prisma.user.create({
      data: {
        email,
        displayName: `User ${suffix}`,
        username: `user_${suffix}`,
        dob: new Date('1990-01-01'),
      },
    });
    // Raw, because Prisma's enum member names are `EMAIL`/`GOOGLE` while the column stores
    // `email`/`google` — and this test is partly about that gap.
    if (opts.google) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO auth_accounts (id, user_id, provider, provider_account_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1::uuid, 'google', $2, now(), now())`,
        user.id,
        opts.google,
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO auth_accounts (id, user_id, provider, provider_account_id, password_hash, created_at, updated_at)
         VALUES (gen_random_uuid(), $1::uuid, 'email', $2, 'x', now(), now())`,
        user.id,
        email,
      );
    }
    return user;
  }

  it('lowercases a mixed-case address in both the user row and its email login method', async () => {
    const prisma = getTestPrisma();
    const user = await makeUser('Mixed.Case@Example.COM');

    await runMigration();

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.email).toBe('mixed.case@example.com');

    const [account] = await prisma.$queryRawUnsafe<{ provider_account_id: string }[]>(
      `SELECT provider_account_id FROM auth_accounts WHERE user_id = $1::uuid`,
      user.id,
    );
    // Both, or neither is any use: the user row is what a lookup reads, the auth_accounts row is
    // what holds the address inside the unique index that decides whether it is still claimed.
    expect(account.provider_account_id).toBe('mixed.case@example.com');
  });

  it('leaves a google login method alone — its provider_account_id is an ID, not an address', async () => {
    const prisma = getTestPrisma();
    // A real Google subject identifier is a digit string, but a mixed-case one is what makes the
    // failure visible: lowercased, this person is detached from their own account, and the only
    // symptom is that Google sign-in silently starts creating a second one.
    const googleId = 'GoogleSubject-AbC123';
    const user = await makeUser('Some.One@Example.COM', { google: googleId });

    await runMigration();

    const [account] = await prisma.$queryRawUnsafe<{ provider_account_id: string }[]>(
      `SELECT provider_account_id FROM auth_accounts WHERE user_id = $1::uuid`,
      user.id,
    );
    expect(account.provider_account_id).toBe(googleId);
    // …while the address on the user row still converts.
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.email).toBe('some.one@example.com');
  });

  it('is a no-op on data that is already canonical', async () => {
    const prisma = getTestPrisma();
    const user = await makeUser('already@example.com');

    await runMigration();

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.email).toBe('already@example.com');
  });

  it('FAILS LOUDLY on a collision rather than silently merging two accounts', async () => {
    const prisma = getTestPrisma();
    // Two accounts differing only by case are two people, or one person with a duplicate. Either
    // way it is not something a migration may decide on its own — and the alternative to failing
    // is one of them losing their address without being told.
    const a = await makeUser('Clash@Example.com');
    const b = await makeUser('clash@example.com');

    await expect(runMigration()).rejects.toThrow();

    // Rolled back, not half-applied. A migration that fails partway through is worse than one
    // that fails: it leaves a table nobody can reason about.
    const rowA = await prisma.user.findUniqueOrThrow({ where: { id: a.id } });
    const rowB = await prisma.user.findUniqueOrThrow({ where: { id: b.id } });
    expect(rowA.email).toBe('Clash@Example.com');
    expect(rowB.email).toBe('clash@example.com');
  });
});

describe('the email index the exact-match read exists to restore', () => {
  beforeAll(async () => {
    await createTestApp();
    await cleanTestDb();
    const prisma = getTestPrisma();
    // Enough rows that the planner has a real choice. On a handful it picks a sequential scan
    // whatever indexes exist, so a small table would have "proved" the index unusable in both
    // forms — a check that cannot distinguish the two is not a check.
    await prisma.$executeRawUnsafe(`
      INSERT INTO users (id, email, display_name, username, dob, created_at, updated_at)
      SELECT gen_random_uuid(),
             'user' || i || '@example.com',
             'User ' || i,
             'user_idx_' || i,
             '1990-01-01'::timestamp,
             now(), now()
      FROM generate_series(1, 3000) AS i
    `);
    await prisma.$executeRawUnsafe('ANALYZE users');
  }, 60_000);

  afterAll(async () => {
    await cleanTestDb();
    await closeTestApp();
  });

  async function planFor(sql: string): Promise<string> {
    const rows = await getTestPrisma().$queryRawUnsafe<Record<string, string>[]>(`EXPLAIN ${sql}`);
    return rows.map((r) => Object.values(r)[0]).join('\n');
  }

  it('uses an index for the exact match the repository now issues', async () => {
    const plan = await planFor(
      `SELECT id FROM users WHERE email = 'user1500@example.com' AND deleted_at IS NULL`,
    );
    expect(plan).toMatch(/Index/);
    expect(plan).not.toMatch(/Seq Scan/);
  });

  it('and would not have, in the case-insensitive form it replaced', async () => {
    // The positive control for the assertion above. Without it, "the plan says Index" could just
    // mean this table always uses one, and the gate would pass no matter which query shipped.
    const plan = await planFor(
      `SELECT id FROM users WHERE email ILIKE 'user1500@example.com' AND deleted_at IS NULL`,
    );
    expect(plan).toMatch(/Seq Scan/);
  });
});
