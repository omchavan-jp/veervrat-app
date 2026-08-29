import { describe, it, expect, vi } from 'vitest';
import { AuthProvider } from '@prisma/client';
import { AuthService } from './auth.service';
import {
  AccountDeletedException,
  AccountSuspendedException,
} from '../../common/exceptions/app.exceptions';

/**
 * A deleted account could sign in with Google, be given a session, and have it thrown away by
 * `validateSession` on the very next request — returning the person to /login with no error
 * parameter and therefore no message, on a loop, indefinitely.
 *
 * The two halves are tested apart on purpose: that a session is NOT created, and that what is
 * raised carries the deletion date. Asserting only the exception would have passed against a
 * version that still created the session first.
 */
function makeService(repo: Record<string, unknown>) {
  const service = Object.create(AuthService.prototype) as AuthService;
  const internals = service as unknown as Record<string, unknown>;
  internals['authRepository'] = repo;
  internals['sessionTtlDays'] = 30;
  internals['logger'] = { warn: vi.fn() };
  internals['configService'] = { get: vi.fn().mockReturnValue('http://localhost:3000') };
  return service;
}

const PROFILE = {
  googleId: 'google-abc',
  email: 'someone@example.com',
  name: 'Someone',
  emailVerified: true,
};

const DELETED_AT = new Date('2026-08-28T10:30:00.000Z');

function deletedAccount() {
  return {
    userId: 'u-deleted',
    provider: AuthProvider.GOOGLE,
    providerAccountId: PROFILE.googleId,
    user: { id: 'u-deleted', deletedAt: DELETED_AT, suspendedAt: DELETED_AT },
  };
}

describe('handleGoogleLogin — a deleted account', () => {
  it('refuses instead of issuing a session that dies on the next request', async () => {
    const createSession = vi.fn();
    const repo = {
      findAuthAccount: vi.fn().mockResolvedValue(deletedAccount()),
      createSession,
    };
    const service = makeService(repo);

    await expect(service.handleGoogleLogin(PROFILE, null, null)).rejects.toBeInstanceOf(
      AccountDeletedException,
    );

    // The defect was not the missing message — it was the session created before it.
    expect(createSession).not.toHaveBeenCalled();
  });

  it('carries the deletion date, so the person can tell their own action from a stranger’s', async () => {
    const repo = { findAuthAccount: vi.fn().mockResolvedValue(deletedAccount()) };
    const service = makeService(repo);

    const raised = await service.handleGoogleLogin(PROFILE, null, null).catch((e: unknown) => e);
    expect(raised).toBeInstanceOf(AccountDeletedException);

    const body = (raised as AccountDeletedException).getResponse() as {
      error: string;
      deletedAt: string;
    };
    expect(body.error).toBe('ACCOUNT_DELETED');
    expect(body.deletedAt).toBe(DELETED_AT.toISOString());
  });

  it('answers 410 Gone — the address is right and the account is not coming back', async () => {
    const repo = { findAuthAccount: vi.fn().mockResolvedValue(deletedAccount()) };
    const service = makeService(repo);

    const raised = (await service
      .handleGoogleLogin(PROFILE, null, null)
      .catch((e: unknown) => e)) as AccountDeletedException;
    expect(raised.getStatus()).toBe(410);
  });
});

describe('handleGoogleLogin — a suspended account', () => {
  it('is refused too, and is not reported as deleted', async () => {
    const createSession = vi.fn();
    const repo = {
      findAuthAccount: vi.fn().mockResolvedValue({
        userId: 'u-susp',
        user: { id: 'u-susp', deletedAt: null, suspendedAt: new Date('2026-08-01') },
      }),
      createSession,
    };
    const service = makeService(repo);

    // Suspension produced the same silent loop for a different reason: validateSession rejects
    // both. It is reversible by an administrator, so it must not be described as deletion.
    await expect(service.handleGoogleLogin(PROFILE, null, null)).rejects.toBeInstanceOf(
      AccountSuspendedException,
    );
    expect(createSession).not.toHaveBeenCalled();
  });
});

describe('handleGoogleLogin — a live account', () => {
  it('still signs in normally', async () => {
    const repo = {
      findAuthAccount: vi.fn().mockResolvedValue({
        userId: 'u-live',
        user: {
          id: 'u-live',
          email: 'live@example.com',
          displayName: 'Live',
          username: 'live',
          roles: [],
          emailVerifiedAt: new Date(),
          deletedAt: null,
          suspendedAt: null,
        },
      }),
    };
    const service = makeService(repo);
    const internals = service as unknown as Record<string, unknown>;
    internals['createSession'] = vi.fn().mockResolvedValue('tok-live');

    const result = await service.handleGoogleLogin(PROFILE, null, null);
    expect('sessionToken' in result && result.sessionToken).toBe('tok-live');
  });
});
