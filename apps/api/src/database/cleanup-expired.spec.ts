import { describe, it, expect, vi } from 'vitest';
import { cleanupExpired, type CleanupPrisma } from './cleanup-expired';

function makePrisma(counts = { session: 3, verificationToken: 2, pendingSignup: 1 }) {
  return {
    session: { deleteMany: vi.fn().mockResolvedValue({ count: counts.session }) },
    verificationToken: {
      deleteMany: vi.fn().mockResolvedValue({ count: counts.verificationToken }),
    },
    pendingSignup: { deleteMany: vi.fn().mockResolvedValue({ count: counts.pendingSignup }) },
  };
}

const NOW = new Date('2026-08-22T12:00:00Z');

describe('cleanupExpired', () => {
  it('reports what it removed from each table', async () => {
    const prisma = makePrisma();

    expect(await cleanupExpired(prisma as unknown as CleanupPrisma, NOW)).toEqual({
      sessions: 3,
      verificationTokens: 2,
      pendingSignups: 1,
    });
  });

  it('deletes strictly what has already expired', async () => {
    // `lt`, not `lte`: a row expiring exactly now is not yet expired, and deleting it would end
    // a session a millisecond early for no reason.
    const prisma = makePrisma();
    await cleanupExpired(prisma as unknown as CleanupPrisma, NOW);

    for (const table of [prisma.session, prisma.verificationToken, prisma.pendingSignup]) {
      expect(table.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: NOW } } });
    }
  });

  it('never deletes a row that is still valid', async () => {
    const prisma = makePrisma();
    await cleanupExpired(prisma as unknown as CleanupPrisma, NOW);

    const where = prisma.session.deleteMany.mock.calls[0][0] as { where: { expiresAt: unknown } };
    expect(where.where.expiresAt).toEqual({ lt: NOW });
    expect(JSON.stringify(where)).not.toContain('gt');
  });

  it('leaves invitations alone', async () => {
    // They have `expires_at` too, but an expired invitation is a record someone can still see
    // explained. This asserts the table is not reachable from here at all.
    const prisma = makePrisma() as Record<string, unknown>;
    prisma.invitation = { deleteMany: vi.fn() };

    await cleanupExpired(prisma as unknown as CleanupPrisma, NOW);

    expect(
      (prisma.invitation as { deleteMany: ReturnType<typeof vi.fn> }).deleteMany,
    ).not.toHaveBeenCalled();
  });

  it('is a no-op when there is nothing expired', async () => {
    const prisma = makePrisma({ session: 0, verificationToken: 0, pendingSignup: 0 });

    expect(await cleanupExpired(prisma as unknown as CleanupPrisma, NOW)).toEqual({
      sessions: 0,
      verificationTokens: 0,
      pendingSignups: 0,
    });
  });

  it('defaults to the current time when none is supplied', async () => {
    const prisma = makePrisma();
    const before = Date.now();
    await cleanupExpired(prisma as unknown as CleanupPrisma);

    const arg = prisma.session.deleteMany.mock.calls[0][0] as {
      where: { expiresAt: { lt: Date } };
    };
    expect(arg.where.expiresAt.lt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
