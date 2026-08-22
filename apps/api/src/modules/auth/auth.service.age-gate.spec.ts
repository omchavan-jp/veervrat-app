import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';

/**
 * The age gate and the Google signup/sign-in split.
 *
 * The case these exist for: before this change, Google sign-in created an account when none
 * matched. Under an 18+ policy that means a row exists for someone whose age was never checked —
 * and a "tell us your date of birth" step afterwards does not undo it. So the tests below assert
 * that **nothing is created**, not merely that an error is returned.
 */

const CONSENTS = [{ documentKey: 'terms', version: 1 }];

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(null),
    findUserByUsername: vi.fn().mockResolvedValue(null),
    findAuthAccount: vi.fn().mockResolvedValue(null),
    createUserWithEmailAccount: vi.fn().mockResolvedValue({ id: 'u1', roles: [] }),
    createUserWithOAuthAccount: vi.fn().mockResolvedValue({ id: 'u2', roles: [] }),
    createVerificationToken: vi.fn().mockResolvedValue({}),
    createPendingSignup: vi.fn().mockResolvedValue({ id: 'pending-1' }),
    currentPolicyVersions: vi.fn().mockResolvedValue(
      new Map([
        ['terms', 1],
        ['privacy', 1],
      ]),
    ),
    consumePendingSignup: vi.fn().mockResolvedValue(null),
    createSession: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function makeService(repo: ReturnType<typeof makeRepo>) {
  const service = Object.create(AuthService.prototype) as AuthService;
  const set = (k: string, v: unknown) => ((service as unknown as Record<string, unknown>)[k] = v);
  set('authRepository', repo);
  set('configService', { get: vi.fn((_k: string, d?: unknown) => d) });
  set('emailService', {
    renderTemplate: vi.fn().mockResolvedValue({ html: '', text: '' }),
    sendTransactional: vi.fn().mockResolvedValue(undefined),
  });
  set('logger', { warn: vi.fn(), log: vi.fn() });
  set('usersIndex', { upsert: vi.fn() });
  set('sessionTtlDays', 30);
  return service;
}

const UNDER_18 = '2015-06-01';
const OVER_18 = '1995-06-15';

beforeEach(() => vi.restoreAllMocks());

describe('register — the email path', () => {
  it('refuses an underage date of birth and creates no user', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    await expect(
      service.register('a@b.c', 'Password!1', 'A', 'a_user', UNDER_18, CONSENTS),
    ).rejects.toThrow();

    expect(repo.createUserWithEmailAccount).not.toHaveBeenCalled();
  });

  it('checks age before the duplicate-email lookup', async () => {
    // An underage visitor should not learn whether an address is already registered.
    const repo = makeRepo();
    const service = makeService(repo);

    await expect(
      service.register('a@b.c', 'Password!1', 'A', 'a_user', UNDER_18, CONSENTS),
    ).rejects.toThrow();

    expect(repo.findUserByEmail).not.toHaveBeenCalled();
  });

  it('refuses an unparseable date rather than treating it as absent', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    await expect(
      service.register('a@b.c', 'Password!1', 'A', 'a_user', 'not-a-date', CONSENTS),
    ).rejects.toThrow();

    expect(repo.createUserWithEmailAccount).not.toHaveBeenCalled();
  });

  it('creates the account with the date of birth and the consents together', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    await service.register('a@b.c', 'Password!1', 'A', 'a_user', OVER_18, CONSENTS);

    const args = repo.createUserWithEmailAccount.mock.calls[0][0];
    expect(args.dob).toBeInstanceOf(Date);
    expect(args.consents).toEqual(CONSENTS);
  });
});

describe('startGoogleSignup', () => {
  it('refuses an underage date before any redirect, so no round trip happens', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    await expect(service.startGoogleSignup('chosen_name', UNDER_18, CONSENTS)).rejects.toThrow();
    expect(repo.createPendingSignup).not.toHaveBeenCalled();
  });

  it('stores the date of birth server-side and returns only an opaque id', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    const result = await service.startGoogleSignup('chosen_name', OVER_18, CONSENTS);

    expect(result).toEqual({ pendingId: 'pending-1' });
    // The date of birth must not be part of what travels onward.
    expect(JSON.stringify(result)).not.toContain(OVER_18);
    expect(repo.createPendingSignup.mock.calls[0][0].dob).toBeInstanceOf(Date);
  });
});

describe('handleGoogleLogin — signup and sign-in are different things', () => {
  const profile = { email: 'new@example.com', googleId: 'g-1', name: 'New', emailVerified: true };

  it('creates NOTHING when there is no account and no pending signup', async () => {
    // This is the defect the split exists to fix: sign-in used to create an account here.
    const repo = makeRepo();
    const service = makeService(repo);

    await expect(service.handleGoogleLogin(profile as never, null, null)).rejects.toThrow();

    expect(repo.createUserWithOAuthAccount).not.toHaveBeenCalled();
  });

  it('creates NOTHING when the pending signup has expired', async () => {
    const repo = makeRepo({ consumePendingSignup: vi.fn().mockResolvedValue(null) });
    const service = makeService(repo);

    await expect(service.handleGoogleLogin(profile, null, null, 'expired-id')).rejects.toThrow();

    expect(repo.createUserWithOAuthAccount).not.toHaveBeenCalled();
  });

  it('re-checks age after the round trip rather than trusting the earlier check', async () => {
    const repo = makeRepo({
      consumePendingSignup: vi.fn().mockResolvedValue({
        username: 'chosen_name',
        dob: new Date('2015-06-01'),
        consents: CONSENTS,
        language: 'EN',
      }),
    });
    const service = makeService(repo);

    await expect(service.handleGoogleLogin(profile, null, null, 'pending-1')).rejects.toThrow();

    expect(repo.createUserWithOAuthAccount).not.toHaveBeenCalled();
  });

  it('creates the account when a valid pending signup is presented', async () => {
    const repo = makeRepo({
      consumePendingSignup: vi.fn().mockResolvedValue({
        username: 'chosen_name',
        dob: new Date('1995-06-15'),
        consents: CONSENTS,
        language: 'MR',
      }),
      generateUsername: vi.fn(),
    });
    const service = makeService(repo);
    (service as unknown as Record<string, unknown>)['generateUsername'] = vi
      .fn()
      .mockResolvedValue('new_user');
    (service as unknown as Record<string, unknown>)['createSession'] = vi
      .fn()
      .mockResolvedValue('token');
    (service as unknown as Record<string, unknown>)['toSessionUser'] = vi.fn((u: unknown) => u);

    await service.handleGoogleLogin(profile, null, null, 'pending-1');

    const args = repo.createUserWithOAuthAccount.mock.calls[0][0];
    expect(args.dob).toBeInstanceOf(Date);
    expect(args.consents).toEqual(CONSENTS);
    expect(args.language).toBe('MR');
  });

  it('signs an existing account in without needing a pending signup', async () => {
    const repo = makeRepo({
      findAuthAccount: vi.fn().mockResolvedValue({ userId: 'u9', user: { id: 'u9', roles: [] } }),
    });
    const service = makeService(repo);
    (service as unknown as Record<string, unknown>)['createSession'] = vi
      .fn()
      .mockResolvedValue('token');
    (service as unknown as Record<string, unknown>)['toSessionUser'] = vi.fn((u: unknown) => u);

    await service.handleGoogleLogin(profile, null, null);

    expect(repo.createUserWithOAuthAccount).not.toHaveBeenCalled();
  });
});

describe('consent versions are resolved by the server, not claimed by the client', () => {
  const live = new Map([
    ['terms', 3],
    ['privacy', 2],
  ]);

  it('records the published version, ignoring what the client sent', async () => {
    // A page loaded before an administrator bumped a document would otherwise record agreement
    // to text the person never read — a record that looks authoritative and is false.
    const repo = makeRepo({ currentPolicyVersions: vi.fn().mockResolvedValue(live) });
    const service = makeService(repo);

    await service.register('a@b.c', 'Password!1', 'A', 'a_user', OVER_18, [
      { documentKey: 'terms', version: 1 },
      { documentKey: 'privacy', version: 1 },
    ]);

    expect(repo.createUserWithEmailAccount.mock.calls[0][0].consents).toEqual([
      { documentKey: 'terms', version: 3 },
      { documentKey: 'privacy', version: 2 },
    ]);
  });

  it('refuses a document that does not exist — consent to nothing is not consent', async () => {
    const repo = makeRepo({ currentPolicyVersions: vi.fn().mockResolvedValue(new Map()) });
    const service = makeService(repo);

    await expect(
      service.register('a@b.c', 'Password!1', 'A', 'a_user', OVER_18, CONSENTS),
    ).rejects.toThrow();

    expect(repo.createUserWithEmailAccount).not.toHaveBeenCalled();
  });

  it('resolves before the Google redirect, not after the round trip', async () => {
    const repo = makeRepo({ currentPolicyVersions: vi.fn().mockResolvedValue(live) });
    const service = makeService(repo);

    await service.startGoogleSignup('chosen_name', OVER_18, [{ documentKey: 'terms', version: 1 }]);

    expect(repo.createPendingSignup.mock.calls[0][0].consents).toEqual([
      { documentKey: 'terms', version: 3 },
    ]);
  });
});

describe('the username is the person’s choice, not derived from their email', () => {
  const profile = { email: 'new@example.com', googleId: 'g-1', name: 'New', emailVerified: true };

  it('refuses a taken username before the redirect, so they learn immediately', async () => {
    const repo = makeRepo({ findUserByUsername: vi.fn().mockResolvedValue({ id: 'someone' }) });
    const service = makeService(repo);

    await expect(service.startGoogleSignup('taken', OVER_18, CONSENTS)).rejects.toThrow();
    expect(repo.createPendingSignup).not.toHaveBeenCalled();
  });

  it('uses the chosen username when the account is created', async () => {
    const repo = makeRepo({
      consumePendingSignup: vi.fn().mockResolvedValue({
        username: 'my_choice',
        dob: new Date('1995-06-15'),
        consents: CONSENTS,
        language: 'EN',
      }),
    });
    const service = makeService(repo);
    (service as unknown as Record<string, unknown>)['createSession'] = vi
      .fn()
      .mockResolvedValue('token');
    (service as unknown as Record<string, unknown>)['toSessionUser'] = vi.fn((u: unknown) => u);

    await service.handleGoogleLogin(profile, null, null, 'pending-1');

    expect(repo.createUserWithOAuthAccount.mock.calls[0][0].username).toBe('my_choice');
  });

  it('varies THEIR choice if it was taken during the round trip, rather than failing', async () => {
    // Refusing here would discard a completed Google sign-in over a name collision, and
    // deriving a fresh name from their email address would discard the choice they made.
    const taken = new Set(['my_choice']);
    const repo = makeRepo({
      findUserByUsername: vi.fn((u: string) => Promise.resolve(taken.has(u) ? { id: 'x' } : null)),
      consumePendingSignup: vi.fn().mockResolvedValue({
        username: 'my_choice',
        dob: new Date('1995-06-15'),
        consents: CONSENTS,
        language: 'EN',
      }),
    });
    const service = makeService(repo);
    (service as unknown as Record<string, unknown>)['createSession'] = vi
      .fn()
      .mockResolvedValue('token');
    (service as unknown as Record<string, unknown>)['toSessionUser'] = vi.fn((u: unknown) => u);

    await service.handleGoogleLogin(profile, null, null, 'pending-1');

    expect(repo.createUserWithOAuthAccount.mock.calls[0][0].username).toBe('my_choice_2');
  });
});
