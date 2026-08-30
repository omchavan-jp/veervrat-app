import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt', () => ({ compare: vi.fn(), hash: vi.fn() }));
const mockedCompare = vi.mocked(bcrypt.compare);
const mockedHash = vi.mocked(bcrypt.hash);

import { AuthService } from './auth.service';

/**
 * `requestEmailChange` has always lowercased before storing; `register` did not. So the table
 * holds both forms, and an exact-match lookup refused a correct address depending on which path
 * had last written it — with `InvalidCredentialsException`, the same answer as a wrong password,
 * so nothing outside could tell the two apart.
 *
 * The lockout counter matters as much as the lookup: keyed on what was typed, `Me@x.com` and
 * `me@x.com` counted failures separately, so the attempt limit could be spent twice over on one
 * address just by shifting the shift key.
 */
function makeService(repo: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const service = Object.create(AuthService.prototype) as AuthService;
  const internals = service as unknown as Record<string, unknown>;
  internals['authRepository'] = repo;
  internals['sessionTtlDays'] = 30;
  internals['logger'] = { warn: vi.fn() };
  internals['configService'] = { get: vi.fn().mockReturnValue('http://localhost:3000') };
  internals['auditService'] = { record: vi.fn() };
  internals['emailService'] = {
    renderTemplate: vi.fn().mockResolvedValue({ html: '<p/>', text: 't' }),
    sendTransactional: vi.fn().mockResolvedValue(undefined),
  };
  internals['checkLockout'] = vi.fn().mockResolvedValue({ locked: false });
  internals['recordFailedLogin'] = vi.fn().mockResolvedValue(undefined);
  internals['createSession'] = vi.fn().mockResolvedValue('tok');
  Object.assign(internals, extra);
  return { service, internals };
}

beforeEach(() => {
  mockedCompare.mockReset();
  mockedHash.mockReset();
});

describe('login — address normalisation', () => {
  it('looks the address up in its canonical form', async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(null);
    const { service } = makeService({ findUserByEmail });

    await service.login('  Me@Example.COM  ', 'pw', null, null).catch(() => undefined);

    expect(findUserByEmail).toHaveBeenCalledWith('me@example.com');
  });

  it('counts lockout against the canonical form, so casing cannot buy extra attempts', async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(null);
    const checkLockout = vi.fn().mockResolvedValue({ locked: false });
    const { service } = makeService({ findUserByEmail }, { checkLockout });

    await service.login('ME@EXAMPLE.COM', 'pw', null, null).catch(() => undefined);
    await service.login('me@example.com', 'pw', null, null).catch(() => undefined);

    // Both spellings must reach the same counter, or the limit is per-spelling and unbounded.
    expect(checkLockout).toHaveBeenNthCalledWith(1, 'me@example.com');
    expect(checkLockout).toHaveBeenNthCalledWith(2, 'me@example.com');
  });

  it('records a failure against the canonical form too', async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(null);
    const recordFailedLogin = vi.fn().mockResolvedValue(undefined);
    const { service } = makeService({ findUserByEmail }, { recordFailedLogin });

    await service.login('Me@Example.com', 'pw', null, null).catch(() => undefined);

    expect(recordFailedLogin).toHaveBeenCalledWith('me@example.com', null, null, 'no_account');
  });
});

describe('register — address normalisation', () => {
  it('stores the canonical form, so signup stops adding mixed-case rows', async () => {
    mockedHash.mockResolvedValue('hashed' as never);
    const createUserWithEmailAccount = vi.fn().mockResolvedValue({
      id: 'u1',
      email: 'me@example.com',
      displayName: 'Me',
      username: 'me',
      roles: [],
      emailVerifiedAt: null,
    });
    const repo = {
      findUserByEmail: vi.fn().mockResolvedValue(null),
      findEmailAccountByAddress: vi.fn().mockResolvedValue(null),
      createUserWithEmailAccount,
      createVerificationToken: vi.fn().mockResolvedValue(undefined),
      currentPolicyVersions: vi.fn().mockResolvedValue(new Map()),
    };
    const { service } = makeService(repo);

    await service.register(' Me@Example.COM ', 'password123', 'Me', 'me', '1990-01-01', []);

    expect(createUserWithEmailAccount).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'me@example.com' }),
    );
  });

  it('checks for a duplicate using the canonical form', async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(null);
    mockedHash.mockResolvedValue('hashed' as never);
    const repo = {
      findUserByEmail,
      findEmailAccountByAddress: vi.fn().mockResolvedValue(null),
      createUserWithEmailAccount: vi.fn().mockResolvedValue({
        id: 'u1',
        email: 'me@example.com',
        displayName: 'Me',
        username: 'me',
        roles: [],
        emailVerifiedAt: null,
      }),
      createVerificationToken: vi.fn().mockResolvedValue(undefined),
      currentPolicyVersions: vi.fn().mockResolvedValue(new Map()),
    };
    const { service } = makeService(repo);

    await service.register('ME@EXAMPLE.COM', 'password123', 'Me', 'me', '1990-01-01', []);

    expect(findUserByEmail).toHaveBeenCalledWith('me@example.com');
  });
});

/**
 * The Google paths, which are the ones the migration to canonical storage actually depended on.
 *
 * `profile.email` is the only address in the system that never passed through a form of ours —
 * it is whatever the person typed when they created their Google account, years ago, somewhere
 * else. So `handleGoogleLogin` was both the last writer that could still add a mixed-case row and
 * the last reader that could still miss one, and neither showed up while the lookup was ILIKE.
 *
 * Both failures below are silent in the worst way: no error, no log, a plausible-looking success.
 */
describe('Google — address normalisation', () => {
  const PROFILE = {
    googleId: 'g-123',
    email: '  Me@Example.COM ',
    name: 'Me',
    emailVerified: true,
  };

  it('looks an existing credentials account up in the canonical form, so Google sign-in offers to link rather than creating a second account', async () => {
    const findUserByEmail = vi.fn().mockResolvedValue({ id: 'u1', email: 'me@example.com' });
    const createUserWithOAuthAccount = vi.fn();
    const repo = {
      findAuthAccount: vi.fn().mockResolvedValue(null),
      findUserByEmail,
      invalidateTokensByUserAndType: vi.fn().mockResolvedValue(undefined),
      createVerificationToken: vi.fn().mockResolvedValue(undefined),
      createUserWithOAuthAccount,
    };
    const { service } = makeService(repo);

    const result = await service.handleGoogleLogin(PROFILE, null, null);

    expect(findUserByEmail).toHaveBeenCalledWith('me@example.com');
    // The half that matters. Missing the existing user does not fail — it falls through to the
    // branch that creates one, so the person quietly ends up with two accounts and no way to
    // tell which holds their data.
    expect(createUserWithOAuthAccount).not.toHaveBeenCalled();
    expect(result).toMatchObject({ action: 'link_pending' });
  });

  it('stores the canonical form on Google signup, so a mixed-case Google address cannot create an account nobody can sign in to', async () => {
    const createUserWithOAuthAccount = vi.fn().mockResolvedValue({
      id: 'u2',
      email: 'me@example.com',
      displayName: 'Me',
      username: 'me',
      roles: [],
      emailVerifiedAt: new Date(),
    });
    const repo = {
      findAuthAccount: vi.fn().mockResolvedValue(null),
      findUserByEmail: vi.fn().mockResolvedValue(null),
      consumePendingSignup: vi.fn().mockResolvedValue({
        dob: new Date('1990-01-01'),
        username: 'me',
        consents: [],
        language: 'en',
      }),
      createUserWithOAuthAccount,
    };
    const { service } = makeService(repo, {
      claimUsername: vi.fn().mockResolvedValue('me'),
      toSessionUser: (u: unknown) => u,
    });

    await service.handleGoogleLogin(PROFILE, null, null, 'pending-1');

    expect(createUserWithOAuthAccount).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'me@example.com' }),
    );
  });
});

/**
 * The two readers that take an address straight from a request body. Both were unnormalised, and
 * both fail in a way that looks like a correct answer.
 */
describe('recovery endpoints — address normalisation', () => {
  it('forgotPassword finds the account regardless of casing, instead of telling a real user no account exists', async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(null);
    const { service } = makeService({ findUserByEmail });

    // #196 made this endpoint report `no_account` out loud rather than an unconditional "sent".
    // Unnormalised, that improvement turns into a confident lie for anyone who capitalises.
    await service.forgotPassword(' ME@Example.com ');

    expect(findUserByEmail).toHaveBeenCalledWith('me@example.com');
  });

  it('resendVerification finds the account regardless of casing, instead of reporting sent and sending nothing', async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(null);
    const { service } = makeService({ findUserByEmail });

    await service.resendVerification('Me@EXAMPLE.com');

    expect(findUserByEmail).toHaveBeenCalledWith('me@example.com');
  });
});
