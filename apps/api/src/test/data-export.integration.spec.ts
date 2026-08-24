import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, closeTestApp, getTestPrisma } from './helpers/app.helper';
import { randomUUID } from 'node:crypto';
import { DataExportRepository } from '../modules/data-export/data-export.repository';

/**
 * The two exclusions in DataExportRepository are decisions about a Prisma `select` clause, not
 * about application logic — a unit test with a mock repository cannot see whether the query
 * itself leaks a field the mock was never asked about. These run against real Postgres.
 */
describe('DataExportRepository — the two things it must never return', () => {
  let repo: DataExportRepository;
  const run = randomUUID().slice(0, 8);

  beforeAll(async () => {
    await createTestApp();
    repo = new DataExportRepository(getTestPrisma());
  }, 30_000);

  afterAll(async () => {
    // Namespaced per run (`run` above), so repeated local runs never collide on a unique
    // constraint the way the first version of this file did.
    const prisma = getTestPrisma();
    await prisma.vmSidenote.deleteMany({ where: { text: { contains: 'note' } } });
    await prisma.journeyExposure.deleteMany({
      where: { journey: { title: { startsWith: 'test journey' } } },
    });
    await prisma.journey.deleteMany({ where: { title: { startsWith: 'test journey' } } });
    await prisma.sentence.deleteMany({ where: { textEn: 'a test sentence' } });
    await prisma.subvirtue.deleteMany({ where: { nameEn: { startsWith: `Export Subvirtue` } } });
    await prisma.virtue.deleteMany({ where: { nameEn: { startsWith: `Export Virtue` } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: `export_${run}` } } });
    await closeTestApp();
  });

  async function makeSentence(run: string) {
    const prisma = getTestPrisma();
    const virtue = await prisma.virtue.create({ data: { nameEn: `Export Virtue ${run}` } });
    const subvirtue = await prisma.subvirtue.create({
      data: { virtueId: virtue.id, nameEn: `Export Subvirtue ${run}` },
    });
    return prisma.sentence.create({
      data: { subvirtueId: subvirtue.id, textEn: 'a test sentence' },
    });
  }

  async function makeUser(suffix: string) {
    const prisma = getTestPrisma();
    return prisma.user.create({
      data: {
        dob: new Date('1990-01-01'),
        email: `export_${run}_${suffix}@test.com`,
        displayName: `Export ${suffix}`,
        username: `export_${run}_${suffix}`,
        emailVerifiedAt: new Date(),
        authAccounts: {
          create: {
            provider: 'EMAIL',
            providerAccountId: `export_${run}_${suffix}@test.com`,
            passwordHash: 'super-secret-hash',
          },
        },
      },
    });
  }

  it('never includes the password hash, even for the account it belongs to', async () => {
    const user = await makeUser('pw');
    const accounts = await repo.authAccounts(user.id);

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(accounts)).not.toContain('super-secret-hash');
  });

  it('excludes a revoked mentor sidenote from a journey export', async () => {
    const prisma = getTestPrisma();
    const user = await makeUser('sn');
    const mentor = await makeUser('mentor');
    const sentence = await makeSentence(mentor.id);

    const journey = await prisma.journey.create({
      data: { vratarthiId: user.id, sentenceId: sentence.id, title: 'test journey' },
    });
    const exposure = await prisma.journeyExposure.create({
      data: {
        journeyId: journey.id,
        status: 'NOT_STARTED',
        tier: 'LOCAL',
        titleEn: 'test exposure',
      },
    });
    await prisma.vmSidenote.create({
      data: {
        vmId: mentor.id,
        entityType: 'EXPOSURE',
        journeyExposureId: exposure.id,
        text: 'a note that was later revoked',
        revokedAt: new Date(),
      },
    });

    const [result] = await repo.journeys(user.id);
    const exportedExposure = result.exposures.find((e) => e.id === exposure.id);

    // Matches what the person already sees in the app: a revoked sidenote is filtered out of
    // every other view of their own journey (erc.repository.ts), so the export must not show
    // more than the product does.
    expect(exportedExposure?.vmSidenote).toBeNull();
  });

  it('includes an active mentor sidenote — it is already visible to this person in-app', async () => {
    const prisma = getTestPrisma();
    const user = await makeUser('sn2');
    const mentor = await makeUser('mentor2');
    const sentence = await makeSentence(mentor.id);

    const journey = await prisma.journey.create({
      data: { vratarthiId: user.id, sentenceId: sentence.id, title: 'test journey 2' },
    });
    const exposure = await prisma.journeyExposure.create({
      data: {
        journeyId: journey.id,
        status: 'NOT_STARTED',
        tier: 'LOCAL',
        titleEn: 'test exposure',
      },
    });
    await prisma.vmSidenote.create({
      data: {
        vmId: mentor.id,
        entityType: 'EXPOSURE',
        journeyExposureId: exposure.id,
        text: 'an active note',
      },
    });

    const [result] = await repo.journeys(user.id);
    const exportedExposure = result.exposures.find((e) => e.id === exposure.id);

    expect(exportedExposure?.vmSidenote?.text).toBe('an active note');
  });
});
