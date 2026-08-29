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
