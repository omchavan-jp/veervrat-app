import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AuthProvider } from '@prisma/client';
import { createTestApp, closeTestApp, getTestPrisma, cleanTestDb } from './helpers/app.helper';
import { VerificationType } from '@prisma/client';
import { AuthRepository } from '../modules/auth/auth.repository';
import { AuthService } from '../modules/auth/auth.service';
import { DuplicateEntityException } from '../common/exceptions/app.exceptions';

/**
 * Reproduces a regression found on UAT: changing an email to an address that a *deleted* account
 * still claims failed, and the person was told the confirmation link was invalid.
 *
 * `applyEmailChange` moves the EMAIL `AuthAccount` onto the new address so the old one stops
 * being claimed. But anonymising rewrites `User.email` and leaves the `AuthAccount` row standing,
 * so a deleted account goes on holding the real address inside `@@unique([provider,
 * providerAccountId])`. `emailInUse` cannot see it — it looks at `User.email`, which by then
 * reads `anon-…@deleted.invalid` — so the guard passes and the write fails.
 *
 * Integration rather than unit: the defect is a unique index rejecting a write. Mocked Prisma
 * has no indexes, so this is exactly the class of thing a unit test cannot see.
 */
describe('email change onto an address a deleted account still claims', () => {
  let repo: AuthRepository;

  beforeAll(async () => {
    await createTestApp();
    await cleanTestDb();
    repo = new AuthRepository(getTestPrisma());
  }, 30_000);

  afterAll(async () => {
    await cleanTestDb();
    await closeTestApp();
  });

  async function makeUser(email: string, opts: { deleted?: boolean } = {}) {
    const prisma = getTestPrisma();
    const suffix = randomUUID().slice(0, 8);
    const user = await prisma.user.create({
      data: {
        email: opts.deleted ? `anon-${suffix}@deleted.invalid` : email,
        displayName: opts.deleted ? '[Deleted user]' : `User ${suffix}`,
        username: opts.deleted ? `deleted_${suffix}` : `user_${suffix}`,
        dob: new Date('1990-01-01'),
        ...(opts.deleted ? { deletedAt: new Date(), anonymisedAt: new Date() } : {}),
      },
    });
    // The row anonymisation leaves behind: it still carries the REAL address.
    await prisma.authAccount.create({
      data: {
        userId: user.id,
        provider: AuthProvider.EMAIL,
        providerAccountId: email,
        passwordHash: opts.deleted ? null : 'x',
      },
    });
    return user;
  }

  it('the stale claim is invisible to emailInUse — which is why the guard lets it through', async () => {
    const taken = 'stale-claim-target@example.com';
    await makeUser(taken, { deleted: true });

    // The guard confirmEmailChange relies on. It answers "free" because the deleted account's
    // User.email was rewritten — while the AuthAccount row still holds the address.
    expect(await repo.emailInUse(taken)).toBe(false);

    const claim = await repo.findEmailAccountByAddress(taken);
    expect(claim).not.toBeNull();
    expect(claim?.user.deletedAt).not.toBeNull();
  });

  it('REGRESSION: applyEmailChange onto that address fails on the unique index', async () => {
    const taken = 'stale-claim-collide@example.com';
    await makeUser(taken, { deleted: true });
    const mover = await makeUser('mover@example.com');

    // Before the AuthAccount was moved in step with the user, this silently succeeded and left
    // the old address claimed. Now it collides — which is the UAT symptom: the change does not
    // apply, and the confirmation page reports an invalid link.
    await expect(repo.applyEmailChange(mover.id, taken)).rejects.toMatchObject({ code: 'P2002' });

    const after = await getTestPrisma().user.findUnique({ where: { id: mover.id } });
    expect(after?.email).toBe('mover@example.com');
  });

  it('releasing the dead account’s claim first lets the change through', async () => {
    const taken = 'stale-claim-released@example.com';
    const dead = await makeUser(taken, { deleted: true });
    const mover = await makeUser('mover2@example.com');

    await repo.releaseIdentityClaims(dead.id);
    const moved = await repo.applyEmailChange(mover.id, taken);

    expect(moved.email).toBe(taken);
    const acct = await repo.findEmailAccountByAddress(taken);
    expect(acct?.userId).toBe(mover.id);
  });
});

/**
 * The same scenario driven through the real `AuthService.confirmEmailChange`, resolved out of the
 * Nest container.
 *
 * An earlier version of this block reimplemented the service's decision inside the test and
 * asserted against that. It passed, and proved nothing about the service — the thing under test
 * has to be the thing that runs.
 */
describe('confirmEmailChange handles the stale claim', () => {
  let repo: AuthRepository;
  let service: AuthService;

  beforeAll(async () => {
    const app = await createTestApp();
    await cleanTestDb();
    repo = new AuthRepository(getTestPrisma());
    service = app.get(AuthService);
  }, 30_000);

  afterAll(async () => {
    await cleanTestDb();
    await closeTestApp();
  });

  async function seed(email: string, opts: { deleted?: boolean } = {}) {
    const prisma = getTestPrisma();
    const suffix = randomUUID().slice(0, 8);
    const user = await prisma.user.create({
      data: {
        email: opts.deleted ? `anon-${suffix}@deleted.invalid` : email,
        displayName: opts.deleted ? '[Deleted user]' : `User ${suffix}`,
        username: opts.deleted ? `deleted_${suffix}` : `user_${suffix}`,
        dob: new Date('1990-01-01'),
        ...(opts.deleted ? { deletedAt: new Date(), anonymisedAt: new Date() } : {}),
      },
    });
    await prisma.authAccount.create({
      data: {
        userId: user.id,
        provider: AuthProvider.EMAIL,
        providerAccountId: email,
        passwordHash: opts.deleted ? null : 'x',
      },
    });
    return user;
  }

  /** Puts a user mid-change: pendingEmail set, and a live EMAIL_CHANGE token pointing at it. */
  async function armChange(userId: string, target: string) {
    const prisma = getTestPrisma();
    const token = randomUUID().replace(/-/g, '');
    await prisma.user.update({ where: { id: userId }, data: { pendingEmail: target } });
    await prisma.verificationToken.create({
      data: {
        userId,
        token,
        type: VerificationType.EMAIL_CHANGE,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        metadata: { newEmail: target },
      },
    });
    return token;
  }

  it('applies the change onto an address only a deleted account was holding', async () => {
    const target = 'svc-dead-claim@example.com';
    const dead = await seed(target, { deleted: true });
    const mover = await seed('svc-mover@example.com');
    const token = await armChange(mover.id, target);

    const { user } = await service.confirmEmailChange(token);

    expect(user.email).toBe(target);
    // The dead account's claim is gone, and the address now belongs to the mover.
    const acct = await repo.findEmailAccountByAddress(target);
    expect(acct?.userId).toBe(mover.id);
    expect(await getTestPrisma().authAccount.count({ where: { userId: dead.id } })).toBe(0);
  });

  it('refuses when a LIVE account holds the address, and says so legibly', async () => {
    const target = 'svc-live-claim@example.com';
    const holder = await seed(target);
    const mover = await seed('svc-mover2@example.com');
    // The holder's User.email has moved on, so `emailInUse` cannot see the claim — only the
    // AuthAccount row still carries it. This is the case that produced a raw P2002.
    await getTestPrisma().user.update({
      where: { id: holder.id },
      data: { email: 'holder-moved-on@example.com' },
    });
    const token = await armChange(mover.id, target);

    await expect(service.confirmEmailChange(token)).rejects.toBeInstanceOf(
      DuplicateEntityException,
    );

    // Refused, not released: the live holder keeps a working sign-in.
    const still = await repo.findEmailAccountByAddress(target);
    expect(still?.userId).toBe(holder.id);
  });

  it('leaves the address unchanged when it refuses', async () => {
    const target = 'svc-live-claim-2@example.com';
    const holder = await seed(target);
    await getTestPrisma().user.update({
      where: { id: holder.id },
      data: { email: 'holder-moved-2@example.com' },
    });
    const mover = await seed('svc-mover3@example.com');
    const token = await armChange(mover.id, target);

    await service.confirmEmailChange(token).catch(() => undefined);

    const after = await getTestPrisma().user.findUnique({ where: { id: mover.id } });
    expect(after?.email).toBe('svc-mover3@example.com');
  });
});
