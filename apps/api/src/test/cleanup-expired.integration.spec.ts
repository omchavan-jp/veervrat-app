import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, closeTestApp, getTestPrisma } from './helpers/app.helper';
import { cleanupExpired } from '../database/cleanup-expired';

/**
 * Runs the sweep against a real database.
 *
 * The unit tests use a mock client, so they prove the `where` clause is the right *shape* and
 * nothing more. When the job was first run on UAT it printed
 *
 *   Cleanup complete:
 *     sessions: 0
 *     verification_tokens: 0
 *     pending_signups: 0
 *
 * which is exactly what a completely broken query prints. The environment had been wiped hours
 * earlier, so there was genuinely nothing to delete — and no way to tell those two cases apart
 * from outside. These tests create rows that really are expired and check they really go.
 */
describe('cleanupExpired against a real database', () => {
  // Rows outlive a run, so every fixture is namespaced to this one. Sharing fixed identifiers
  // made the first run pass and every run after it fail on a unique constraint.
  const run = randomUUID().slice(0, 8);

  beforeAll(async () => {
    await createTestApp();
  }, 30_000);

  afterAll(async () => {
    const prisma = getTestPrisma();
    await prisma.pendingSignup.deleteMany({ where: { username: { startsWith: `ps_${run}` } } });
    // Invitations first: `inviter_id` is RESTRICT, so the user delete below fails while one
    // exists. That constraint is exactly why the app anonymises accounts instead of deleting
    // them, and why the wipe job has to TRUNCATE ... CASCADE.
    await prisma.invitation.deleteMany({ where: { token: { startsWith: `inv-${run}` } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: `cleanup_${run}` } } });
    await closeTestApp();
  });

  const past = new Date(Date.now() - 60 * 60 * 1000);
  const future = new Date(Date.now() + 60 * 60 * 1000);

  async function makeUser(suffix: string) {
    const prisma = getTestPrisma();
    return prisma.user.create({
      data: {
        dob: new Date('1990-01-01'),
        email: `cleanup_${run}_${suffix}@test.com`,
        displayName: `Cleanup ${suffix}`,
        username: `cleanup_${run}_${suffix}`,
        emailVerifiedAt: new Date(),
      },
    });
  }

  it('deletes expired sessions and keeps live ones', async () => {
    const prisma = getTestPrisma();
    const user = await makeUser('sess');
    await prisma.session.createMany({
      data: [
        { userId: user.id, token: `tok-dead-${user.id}`, expiresAt: past },
        { userId: user.id, token: `tok-live-${user.id}`, expiresAt: future },
      ],
    });

    const counts = await cleanupExpired(prisma, new Date());

    expect(counts.sessions).toBeGreaterThanOrEqual(1);
    const remaining = await prisma.session.findMany({ where: { userId: user.id } });
    expect(remaining.map((s) => s.token)).toEqual([`tok-live-${user.id}`]);
  });

  it('deletes expired verification tokens and keeps live ones', async () => {
    const prisma = getTestPrisma();
    const user = await makeUser('vt');
    await prisma.verificationToken.createMany({
      data: [
        {
          userId: user.id,
          token: `vt-dead-${user.id}`,
          type: 'EMAIL_VERIFICATION',
          expiresAt: past,
        },
        {
          userId: user.id,
          token: `vt-live-${user.id}`,
          type: 'EMAIL_VERIFICATION',
          expiresAt: future,
        },
      ],
    });

    await cleanupExpired(prisma, new Date());

    const remaining = await prisma.verificationToken.findMany({ where: { userId: user.id } });
    expect(remaining.map((t) => t.token)).toEqual([`vt-live-${user.id}`]);
  });

  it('deletes expired pending signups and keeps live ones', async () => {
    // The table whose leftover rows broke a migration on UAT while passing locally.
    const prisma = getTestPrisma();
    await prisma.pendingSignup.createMany({
      data: [
        { username: `ps_${run}_dead`, dob: new Date('1990-01-01'), consents: {}, expiresAt: past },
        {
          username: `ps_${run}_live`,
          dob: new Date('1990-01-01'),
          consents: {},
          expiresAt: future,
        },
      ],
    });

    await cleanupExpired(prisma, new Date());

    const remaining = await prisma.pendingSignup.findMany({
      where: { username: { in: [`ps_${run}_dead`, `ps_${run}_live`] } },
    });
    expect(remaining.map((p) => p.username)).toEqual([`ps_${run}_live`]);
  });

  it('leaves expired invitations alone', async () => {
    // They carry `expires_at` too, but an expired invitation is a record someone can still see
    // explained. A sweep that quietly widened to this table would destroy history.
    const prisma = getTestPrisma();
    const inviter = await makeUser('inv');
    await prisma.invitation.create({
      data: {
        inviterId: inviter.id,
        inviteeEmail: 'invitee@test.com',
        type: 'VM_JOURNEY',
        token: `inv-${run}-${inviter.id}`,
        expiresAt: past,
      },
    });

    await cleanupExpired(prisma, new Date());

    expect(
      await prisma.invitation.findUnique({ where: { token: `inv-${run}-${inviter.id}` } }),
    ).not.toBeNull();
  });
});
