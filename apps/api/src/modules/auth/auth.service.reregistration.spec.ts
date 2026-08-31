import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bcrypt from 'bcrypt';
import { AuthProvider } from '@prisma/client';

vi.mock('bcrypt', () => ({ compare: vi.fn(), hash: vi.fn() }));
const mockedHash = vi.mocked(bcrypt.hash);

import { AuthService } from './auth.service';
import { AccountDeletedException } from '../../common/exceptions/app.exceptions';

/**
 * Deletion left the identity claimed. Anonymising rewrites `User.email` and `User.username`
 * but leaves the `AuthAccount` rows standing, and those carry the real googleId and the real
 * address inside a unique index — so neither could ever be used to register again. The Google
 * half looped silently; the email half failed on a constraint naming an account the person
 * could not see.
 *
 * Telling them and letting them back in are different problems: a returning person must be
 * told the account was deleted, AND be able to make a new one. Testing only the refusal would
 * pass against a version that has locked them out permanently.
 */
function makeService(repo: Record<string, unknown>) {
  const service = Object.create(AuthService.prototype) as AuthService;
  const internals = service as unknown as Record<string, unknown>;
  internals['authRepository'] = repo;
  internals['sessionTtlDays'] = 30;
  internals['logger'] = { warn: vi.fn() };
  internals['configService'] = { get: vi.fn().mockReturnValue('http://localhost:3000') };
  // Sends moved to EmailQueueService (#141) — EmailService is transport only now.
  internals['emailQueue'] = {
    sendTransactional: vi.fn().mockResolvedValue(undefined),
    sendNotification: vi.fn(),
  };
  internals['emailService'] = {
    renderTemplate: vi.fn().mockResolvedValue({ html: '<p/>', text: 't' }),
    sendTransactional: vi.fn().mockResolvedValue(undefined),
  };
  return service;
}

const PROFILE = {
  googleId: 'google-abc',
  email: 'returning@example.com',
  name: 'Returning',
  emailVerified: true,
};

const NEW_USER = {
  id: 'u-new',
  email: PROFILE.email,
  displayName: 'Returning',
  username: 'returning',
  roles: [],
  emailVerifiedAt: new Date(),
  deletedAt: null,
  suspendedAt: null,
};

beforeEach(() => mockedHash.mockReset());

describe('Google re-registration after deletion', () => {
  it('releases the stale googleId and creates a fresh account', async () => {
    const releaseIdentityClaims = vi.fn().mockResolvedValue({ count: 1 });
    const createUserWithOAuthAccount = vi.fn().mockResolvedValue(NEW_USER);
    const repo = {
      findAuthAccount: vi.fn().mockResolvedValue({
        userId: 'u-old',
        user: { id: 'u-old', deletedAt: new Date('2026-08-28'), suspendedAt: null },
      }),
      releaseIdentityClaims,
      // The old row is gone by the time this runs, and the old user's address was rewritten to
      // the anon form, so nothing matches.
      findUserByEmail: vi.fn().mockResolvedValue(null),
      consumePendingSignup: vi.fn().mockResolvedValue({
        dob: new Date('1990-01-01'),
        username: 'returning',
        consents: [],
        language: 'EN',
      }),
      isUsernameTaken: vi.fn().mockResolvedValue(false),
      createUserWithOAuthAccount,
    };
    const service = makeService(repo);
    const internals = service as unknown as Record<string, unknown>;
    internals['createSession'] = vi.fn().mockResolvedValue('tok-new');
    internals['claimUsername'] = vi.fn().mockResolvedValue('returning');

    const result = await service.handleGoogleLogin(PROFILE, null, null, 'pending-1');

    expect(releaseIdentityClaims).toHaveBeenCalledWith('u-old');
    expect(createUserWithOAuthAccount).toHaveBeenCalled();
    expect('sessionToken' in result && result.sessionToken).toBe('tok-new');
  });

  it('without a pending signup it still refuses — sign-in is not re-registration', async () => {
    const releaseIdentityClaims = vi.fn();
    const repo = {
      findAuthAccount: vi.fn().mockResolvedValue({
        userId: 'u-old',
        user: { id: 'u-old', deletedAt: new Date('2026-08-28'), suspendedAt: null },
      }),
      releaseIdentityClaims,
    };
    const service = makeService(repo);

    // Nothing is released on a bare sign-in: the age gate and consent have not been answered,
    // and releasing here would silently discard the record on someone's behalf.
    await expect(service.handleGoogleLogin(PROFILE, null, null)).rejects.toBeInstanceOf(
      AccountDeletedException,
    );
    expect(releaseIdentityClaims).not.toHaveBeenCalled();
  });
});

describe('email re-registration after deletion', () => {
  it('releases the address the deleted account still claims', async () => {
    mockedHash.mockResolvedValue('hashed' as never);
    const releaseIdentityClaims = vi.fn().mockResolvedValue({ count: 1 });
    const repo = {
      findUserByEmail: vi.fn().mockResolvedValue(null),
      findEmailAccountByAddress: vi.fn().mockResolvedValue({
        userId: 'u-old',
        provider: AuthProvider.EMAIL,
        user: { id: 'u-old', deletedAt: new Date('2026-08-28') },
      }),
      releaseIdentityClaims,
      createUserWithEmailAccount: vi.fn().mockResolvedValue(NEW_USER),
      createVerificationToken: vi.fn().mockResolvedValue(undefined),
      currentPolicyVersions: vi.fn().mockResolvedValue(new Map()),
    };
    const service = makeService(repo);

    await service.register(
      PROFILE.email,
      'password123',
      'Returning',
      'returning',
      '1990-01-01',
      [],
    );

    expect(releaseIdentityClaims).toHaveBeenCalledWith('u-old');
  });

  it('leaves a LIVE account’s address alone — that is a genuine duplicate', async () => {
    const releaseIdentityClaims = vi.fn();
    const repo = {
      findUserByEmail: vi.fn().mockResolvedValue(null),
      // Belongs to somebody who has not deleted anything. Releasing it would hand their
      // sign-in address to whoever asked for it.
      findEmailAccountByAddress: vi.fn().mockResolvedValue({
        userId: 'u-live',
        provider: AuthProvider.EMAIL,
        user: { id: 'u-live', deletedAt: null },
      }),
      releaseIdentityClaims,
      createUserWithEmailAccount: vi.fn().mockResolvedValue(NEW_USER),
      createVerificationToken: vi.fn().mockResolvedValue(undefined),
      currentPolicyVersions: vi.fn().mockResolvedValue(new Map()),
    };
    mockedHash.mockResolvedValue('hashed' as never);
    const service = makeService(repo);

    await service.register(
      PROFILE.email,
      'password123',
      'Returning',
      'returning',
      '1990-01-01',
      [],
    );

    expect(releaseIdentityClaims).not.toHaveBeenCalled();
  });
});
