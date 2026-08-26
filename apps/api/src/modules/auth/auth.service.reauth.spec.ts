import { describe, it, expect, vi } from 'vitest';
import { AuthProvider } from '@prisma/client';
import { AuthService } from './auth.service';
import { InvalidCredentialsException } from '../../common/exceptions/app.exceptions';

vi.mock('bcrypt', () => ({ compare: vi.fn(), hash: vi.fn() }));
import * as bcrypt from 'bcrypt';

function makeService(repo: Record<string, unknown>) {
  const service = Object.create(AuthService.prototype) as AuthService;
  (service as unknown as Record<string, unknown>)['authRepository'] = repo;
  return service;
}

const SESSION = 'session-1';
const USER = 'user-1';

describe('assertRecentlyAuthenticated — either proof, and only once (#196)', () => {
  it('accepts a correct password', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const repo = {
      findEmailAccountByUserId: vi.fn().mockResolvedValue({ passwordHash: '$2b$12$h' }),
      consumeSessionReauthentication: vi.fn(),
    };

    await expect(
      makeService(repo).assertRecentlyAuthenticated(USER, SESSION, 'correct'),
    ).resolves.toBeUndefined();
    // The Google path is never reached when the password already proved it.
    expect(repo.consumeSessionReauthentication).not.toHaveBeenCalled();
  });

  it('accepts a recent Google re-authentication when there is no password at all', async () => {
    // The case the whole change exists for: an account created with Google has no password, so
    // deleting it or changing its email used to be impossible.
    const repo = {
      findEmailAccountByUserId: vi.fn().mockResolvedValue(null),
      consumeSessionReauthentication: vi.fn().mockResolvedValue(true),
    };

    await expect(
      makeService(repo).assertRecentlyAuthenticated(USER, SESSION),
    ).resolves.toBeUndefined();
  });

  it('CONSUMES the proof, so one re-authentication authorises one action', async () => {
    // Left in place it would authorise every sensitive action for the rest of its window —
    // one re-authentication, unlimited consequences.
    const repo = {
      findEmailAccountByUserId: vi.fn().mockResolvedValue(null),
      consumeSessionReauthentication: vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false),
    };
    const service = makeService(repo);

    await expect(service.assertRecentlyAuthenticated(USER, SESSION)).resolves.toBeUndefined();
    await expect(service.assertRecentlyAuthenticated(USER, SESSION)).rejects.toBeInstanceOf(
      InvalidCredentialsException,
    );
  });

  it('refuses when neither proof is offered', async () => {
    const repo = {
      findEmailAccountByUserId: vi.fn().mockResolvedValue(null),
      consumeSessionReauthentication: vi.fn().mockResolvedValue(false),
    };

    await expect(
      makeService(repo).assertRecentlyAuthenticated(USER, SESSION),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('falls back to the Google proof when the password is wrong, and still refuses without one', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    const repo = {
      findEmailAccountByUserId: vi.fn().mockResolvedValue({ passwordHash: '$2b$12$h' }),
      consumeSessionReauthentication: vi.fn().mockResolvedValue(false),
    };

    await expect(
      makeService(repo).assertRecentlyAuthenticated(USER, SESSION, 'wrong'),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('asks only for a proof no older than the window', async () => {
    const repo = {
      findEmailAccountByUserId: vi.fn().mockResolvedValue(null),
      consumeSessionReauthentication: vi.fn().mockResolvedValue(true),
    };

    await makeService(repo).assertRecentlyAuthenticated(USER, SESSION);

    const [, notBefore] = repo.consumeSessionReauthentication.mock.calls[0] as [string, Date];
    const ageMinutes = (Date.now() - notBefore.getTime()) / 60_000;
    // Not asserting the exact constant — asserting that a bound is applied at all, and is short.
    expect(ageMinutes).toBeGreaterThan(0);
    expect(ageMinutes).toBeLessThanOrEqual(15);
  });
});

describe('reauthenticateWithGoogle — proves this account, not just some account', () => {
  it('stamps the session when the Google identity belongs to this user', async () => {
    const repo = {
      findAuthAccount: vi.fn().mockResolvedValue({ userId: USER }),
      markSessionReauthenticated: vi.fn().mockResolvedValue({}),
    };

    await expect(
      makeService(repo).reauthenticateWithGoogle(USER, SESSION, 'google-123'),
    ).resolves.toBe(true);
    expect(repo.markSessionReauthenticated).toHaveBeenCalledWith(SESSION);
    expect(repo.findAuthAccount).toHaveBeenCalledWith(AuthProvider.GOOGLE, 'google-123');
  });

  it('REFUSES a Google account belonging to somebody else, and stamps nothing', async () => {
    // The dangerous case. Falling through to the ordinary sign-in path here would sign the
    // person in as the other account; stamping anyway would let any Google account authorise a
    // deletion of this one.
    const repo = {
      findAuthAccount: vi.fn().mockResolvedValue({ userId: 'someone-else' }),
      markSessionReauthenticated: vi.fn(),
    };

    await expect(
      makeService(repo).reauthenticateWithGoogle(USER, SESSION, 'google-999'),
    ).resolves.toBe(false);
    expect(repo.markSessionReauthenticated).not.toHaveBeenCalled();
  });

  it('refuses a Google identity linked to no account here', async () => {
    const repo = {
      findAuthAccount: vi.fn().mockResolvedValue(null),
      markSessionReauthenticated: vi.fn(),
    };

    await expect(
      makeService(repo).reauthenticateWithGoogle(USER, SESSION, 'unknown'),
    ).resolves.toBe(false);
    expect(repo.markSessionReauthenticated).not.toHaveBeenCalled();
  });
});
