import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt', () => ({ compare: vi.fn(), hash: vi.fn() }));
const mockedHash = vi.mocked(bcrypt.hash);

import { AuthService } from './auth.service';

/**
 * A failed verification email must not cost somebody their account.
 *
 * `register` creates the user and the verification token and **commits**, then sends the mail. The
 * send used to be awaited with the failure allowed to propagate, on the reasoning that "a
 * verification email that never sent must not look like a successful registration". The ordering
 * inverts that reasoning: the account is already there, so failing the request does not prevent it
 * existing — it only hides it from the person who just created it.
 *
 * What followed from one SMTP hiccup:
 *
 *   - the person is told signup failed
 *   - the account exists, unverified, so they cannot sign in
 *   - the address is taken, so registering again is refused as a duplicate
 *   - resending the verification would fix it, and they have no reason to try, having been told
 *     there is no account
 *
 * #141 names "a lost send actually costs someone access" as the trigger for treating email
 * delivery as urgent. That trigger was already met — not by volume, but structurally, on every
 * signup.
 */
function makeService(repo: Record<string, unknown>, email: Record<string, unknown> = {}) {
  const service = Object.create(AuthService.prototype) as AuthService;
  const internals = service as unknown as Record<string, unknown>;
  internals['authRepository'] = repo;
  internals['sessionTtlDays'] = 30;
  internals['logger'] = { warn: vi.fn(), error: vi.fn(), log: vi.fn() };
  internals['configService'] = { get: vi.fn().mockReturnValue('http://localhost:3000') };
  internals['auditService'] = { record: vi.fn() };
  // Sends moved to EmailQueueService (#141) — EmailService is transport only now.
  internals['emailQueue'] = {
    sendTransactional: vi.fn().mockResolvedValue(undefined),
    sendNotification: vi.fn(),
    ...(email ?? {}),
  };
  internals['emailService'] = {
    renderTemplate: vi.fn().mockResolvedValue({ html: '<p/>', text: 't' }),
  };
  return { service, internals };
}

function makeRepo() {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(null),
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
}

const ARGS: Parameters<AuthService['register']> = [
  'me@example.com',
  'password123',
  'Me',
  'me',
  '1990-01-01',
  [],
];

beforeEach(() => {
  mockedHash.mockReset();
  mockedHash.mockResolvedValue('hashed' as never);
});

describe('register — when the verification email cannot be sent', () => {
  it('still returns the account rather than failing the request', async () => {
    const repo = makeRepo();
    const { service } = makeService(repo, {
      sendTransactional: vi.fn().mockRejectedValue(new Error('ECONNREFUSED smtp')),
    });

    // The assertion that matters. This used to reject, and the account existed anyway.
    const result = await service.register(...ARGS);

    expect(result.user).toMatchObject({ email: 'me@example.com' });
    expect(result.verificationEmailSent).toBe(false);
  });

  it('creates the account before the send, so failing the request could never have undone it', async () => {
    const repo = makeRepo();
    const { service } = makeService(repo, {
      sendTransactional: vi.fn().mockRejectedValue(new Error('ECONNREFUSED smtp')),
    });

    await service.register(...ARGS);

    // This is the fact the old design overlooked: there is no rollback here. The account is
    // committed whatever the mail does.
    expect(repo.createUserWithEmailAccount).toHaveBeenCalledOnce();
    expect(repo.createVerificationToken).toHaveBeenCalledOnce();
  });

  it('records the failure, so it is visible without waiting for someone to complain', async () => {
    const repo = makeRepo();
    const { service, internals } = makeService(repo, {
      sendTransactional: vi.fn().mockRejectedValue(new Error('ECONNREFUSED smtp')),
    });

    await service.register(...ARGS);

    const logger = internals['logger'] as { error: ReturnType<typeof vi.fn> };
    expect(logger.error).toHaveBeenCalledOnce();
    const [entry] = logger.error.mock.calls[0] as [Record<string, unknown>];
    // Named recipient and reason: without both, the log says only that something went wrong
    // somewhere, which is not something anyone can act on.
    expect(entry).toMatchObject({ userId: 'u1', email: 'me@example.com' });
    expect(String(entry['error'])).toContain('ECONNREFUSED');
  });

  it('reports success truthfully when the mail does go out', async () => {
    // The positive control. Without it, a `register` that always reported `false` would pass every
    // test above while telling every new user their email had failed.
    const repo = makeRepo();
    const { service, internals } = makeService(repo);

    const result = await service.register(...ARGS);

    expect(result.verificationEmailSent).toBe(true);
    const logger = internals['logger'] as { error: ReturnType<typeof vi.fn> };
    expect(logger.error).not.toHaveBeenCalled();
  });
});
