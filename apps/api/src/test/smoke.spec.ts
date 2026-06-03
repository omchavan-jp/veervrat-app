import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, closeTestApp, getTestPrisma } from './helpers/app.helper';

describe('DB Connection Smoke Test', () => {
  beforeAll(async () => {
    await createTestApp();
  }, 30_000); // NestJS bootstrap can take 10–20s on cold CI

  afterAll(async () => {
    await closeTestApp();
  });

  it('connects to the test database and finds migrations', async () => {
    const prisma = getTestPrisma();
    const migrations = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "_prisma_migrations" LIMIT 1
    `;
    expect(migrations.length).toBeGreaterThan(0);
  });
});
