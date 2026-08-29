import { describe, it, expect, vi } from 'vitest';
import { AuthProvider } from '@prisma/client';
import { AuthRepository } from './auth.repository';

/**
 * Asserts WHICH writes an email change performs.
 *
 * `AuthAccount.providerAccountId` holds the address for an EMAIL account and
 * `(provider, providerAccountId)` is unique. Updating only `User.email` left the previous
 * address claimed by a row nothing reads back — `findEmailAccountByUserId` looks accounts up by
 * user id, so sign-in kept working and the drift stayed invisible until somebody tried to
 * register with an address that looked free and hit a constraint failure instead.
 *
 * Testing the writes rather than a round trip because the defect was never a wrong answer: it
 * was a write that did not happen.
 */
function makeRepo() {
  const userUpdate = vi.fn().mockReturnValue({ __op: 'user.update' });
  const accountUpdateMany = vi.fn().mockReturnValue({ __op: 'authAccount.updateMany' });
  const $transaction = vi
    .fn()
    .mockResolvedValue([{ id: 'u1', email: 'new@example.com' }, { count: 1 }]);

  const prisma = {
    user: { update: userUpdate },
    authAccount: { updateMany: accountUpdateMany, findUnique: vi.fn(), deleteMany: vi.fn() },
    $transaction,
  };
  const repo = new AuthRepository(prisma as never);
  return { repo, userUpdate, accountUpdateMany, $transaction, prisma };
}

describe('applyEmailChange', () => {
  it('moves the EMAIL AuthAccount to the new address', async () => {
    const { repo, accountUpdateMany } = makeRepo();

    await repo.applyEmailChange('u1', 'new@example.com');

    expect(accountUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', provider: AuthProvider.EMAIL },
      data: { providerAccountId: 'new@example.com' },
    });
  });

  it('still updates the user row and clears pendingEmail', async () => {
    const { repo, userUpdate } = makeRepo();

    await repo.applyEmailChange('u1', 'new@example.com');

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { email: 'new@example.com', pendingEmail: null },
      }),
    );
  });

  it('does both in one transaction — a half-applied change is the defect in a new form', async () => {
    const { repo, $transaction } = makeRepo();

    await repo.applyEmailChange('u1', 'new@example.com');

    expect($transaction).toHaveBeenCalledTimes(1);
    expect($transaction.mock.calls[0][0]).toHaveLength(2);
  });

  it('returns the updated user, not the update-count', async () => {
    const { repo } = makeRepo();

    const result = await repo.applyEmailChange('u1', 'new@example.com');

    expect(result).toEqual({ id: 'u1', email: 'new@example.com' });
  });
});

describe('findUserByEmail', () => {
  it('matches case-insensitively, so a stored-lowercase address accepts typed capitals', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'u1' });
    const prisma = { user: { findFirst }, authAccount: {} };
    const repo = new AuthRepository(prisma as never);

    await repo.findUserByEmail('Me@Example.COM');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: { equals: 'Me@Example.COM', mode: 'insensitive' },
          deletedAt: null,
        }),
      }),
    );
  });

  it('still excludes deleted accounts', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = { user: { findFirst }, authAccount: {} };
    const repo = new AuthRepository(prisma as never);

    await repo.findUserByEmail('gone@example.com');

    const where = findFirst.mock.calls[0][0].where as { deletedAt: null };
    expect(where.deletedAt).toBeNull();
  });
});

describe('releaseIdentityClaims', () => {
  it('removes every AuthAccount row the account still holds', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 2 });
    const prisma = { user: {}, authAccount: { deleteMany } };
    const repo = new AuthRepository(prisma as never);

    await repo.releaseIdentityClaims('u-old');

    // Both providers, not just the one being re-registered with: a deleted account holding
    // either is a deleted account somebody can still be blocked by.
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'u-old' } });
  });
});
