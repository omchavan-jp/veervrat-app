import { describe, it, expect, vi } from 'vitest';
import { VerificationType } from '@prisma/client';
import { AuthService } from './auth.service';

vi.mock('bcrypt', () => ({ compare: vi.fn(), hash: vi.fn().mockResolvedValue('$2b$12$new') }));

const USER = {
  id: 'user-1',
  email: 'om@example.com',
  displayName: 'Om',
  username: 'om_user',
  language: 'EN',
  emailVerifiedAt: new Date(),
  roles: [{ role: 'VRATARTHI' }],
};

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(USER),
    findUserById: vi.fn().mockResolvedValue(USER),
    findEmailAccountByUserId: vi.fn().mockResolvedValue({ id: 'acc-1', passwordHash: '$2b$12$h' }),
    invalidateTokensByUserAndType: vi.fn().mockResolvedValue(undefined),
    createVerificationToken: vi.fn().mockResolvedValue({}),
    findVerificationToken: vi.fn(),
    markTokenUsed: vi.fn().mockResolvedValue({}),
    markEmailVerified: vi.fn().mockResolvedValue({}),
    updatePasswordHash: vi.fn().mockResolvedValue({}),
    createEmailAccountWithPassword: vi.fn().mockResolvedValue({}),
    deleteAllUserSessions: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function makeService(repo: ReturnType<typeof makeRepo>, email = { sendTransactional: vi.fn() }) {
  const service = Object.create(AuthService.prototype) as AuthService;
  const i = service as unknown as Record<string, unknown>;
  i['authRepository'] = repo;
  i['sessionTtlDays'] = 30;
  i['logger'] = { warn: vi.fn(), log: vi.fn() };
  i['configService'] = { get: vi.fn().mockReturnValue('http://localhost:3000') };
  i['emailService'] = {
    ...email,
    renderTemplate: vi.fn().mockResolvedValue({ html: '<p/>', text: 't' }),
  };
  return service;
}

describe('forgotPassword — three honest answers (#196)', () => {
  it('says plainly when no account exists', async () => {
    // It used to answer 'sent' here, to conceal whether the address is registered. That
    // concealment never worked — `register()` refuses a duplicate address and says so — while a
    // person who mistyped waited for mail that would never arrive.
    const repo = makeRepo({ findUserByEmail: vi.fn().mockResolvedValue(null) });
    const email = { sendTransactional: vi.fn() };

    await expect(makeService(repo, email).forgotPassword('nobody@example.com')).resolves.toBe(
      'no_account',
    );
    expect(email.sendTransactional).not.toHaveBeenCalled();
  });

  it('sends a reset for an account that has a password', async () => {
    const repo = makeRepo();
    const email = { sendTransactional: vi.fn() };

    await expect(makeService(repo, email).forgotPassword('om@example.com')).resolves.toBe(
      'reset_sent',
    );
    expect(email.sendTransactional).toHaveBeenCalledTimes(1);
  });

  it('sends a SET-password mail for a Google-only account, instead of nothing at all', async () => {
    // The defect: this returned 'sent' and sent nothing, so a Google-only account could never
    // acquire a password by any route. Confirmed in production on 2026-08-25.
    const repo = makeRepo({ findEmailAccountByUserId: vi.fn().mockResolvedValue(null) });
    const email = { sendTransactional: vi.fn() };

    await expect(makeService(repo, email).forgotPassword('om@example.com')).resolves.toBe(
      'set_password_sent',
    );
    expect(email.sendTransactional).toHaveBeenCalledTimes(1);
    expect(repo.createVerificationToken).toHaveBeenCalled();
  });

  it('treats an EMAIL account with no hash as having no password', async () => {
    // Not the same shape as a Google signup (which has no EMAIL row at all), but the same
    // situation from the person's point of view — and it must not be mistaken for a reset.
    const repo = makeRepo({
      findEmailAccountByUserId: vi.fn().mockResolvedValue({ id: 'acc-1', passwordHash: null }),
    });

    await expect(makeService(repo).forgotPassword('om@example.com')).resolves.toBe(
      'set_password_sent',
    );
  });
});

describe('resetPassword — setting a first password is the same operation', () => {
  const validToken = {
    id: 'tok-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 3_600_000),
  };

  it('updates the hash when the account already has a password', async () => {
    const repo = makeRepo({ findVerificationToken: vi.fn().mockResolvedValue(validToken) });

    await makeService(repo).resetPassword('tok', 'NewPassw0rd!');

    expect(repo.updatePasswordHash).toHaveBeenCalledWith('acc-1', '$2b$12$new');
    expect(repo.createEmailAccountWithPassword).not.toHaveBeenCalled();
  });

  it('CREATES the account when there is no password yet, rather than refusing', async () => {
    // This is the whole fix. It used to throw EntityNotFoundException('AuthAccount'), which is
    // why no Google-only account could ever have a password.
    const repo = makeRepo({
      findVerificationToken: vi.fn().mockResolvedValue(validToken),
      findEmailAccountByUserId: vi.fn().mockResolvedValue(null),
    });

    await makeService(repo).resetPassword('tok', 'NewPassw0rd!');

    expect(repo.createEmailAccountWithPassword).toHaveBeenCalledWith(
      'user-1',
      'om@example.com',
      '$2b$12$new',
    );
    expect(repo.updatePasswordHash).not.toHaveBeenCalled();
  });

  it('still invalidates every session, however the password arrived', async () => {
    // A new credential must not leave older sessions authorised — that is what makes a reset a
    // recovery rather than an addition.
    const repo = makeRepo({
      findVerificationToken: vi.fn().mockResolvedValue(validToken),
      findEmailAccountByUserId: vi.fn().mockResolvedValue(null),
    });

    await makeService(repo).resetPassword('tok', 'NewPassw0rd!');

    expect(repo.deleteAllUserSessions).toHaveBeenCalledWith('user-1');
    expect(repo.markTokenUsed).toHaveBeenCalledWith('tok-1');
  });

  it('refuses an expired token, and creates nothing', async () => {
    const repo = makeRepo({
      findVerificationToken: vi.fn().mockResolvedValue({
        ...validToken,
        expiresAt: new Date(Date.now() - 1000),
      }),
      findEmailAccountByUserId: vi.fn().mockResolvedValue(null),
    });

    await expect(makeService(repo).resetPassword('tok', 'NewPassw0rd!')).rejects.toThrow();
    expect(repo.createEmailAccountWithPassword).not.toHaveBeenCalled();
  });

  it('refuses a token that does not exist', async () => {
    const repo = makeRepo({ findVerificationToken: vi.fn().mockResolvedValue(null) });
    await expect(makeService(repo).resetPassword('nope', 'NewPassw0rd!')).rejects.toThrow();
  });
});

describe('the token type is unchanged', () => {
  it('reuses PASSWORD_RESET rather than inventing a parallel type', async () => {
    // Setting and resetting are the same operation: a token proving control of the mailbox,
    // exchanged for a credential. A second type would need its own expiry, its own invalidation
    // and its own chance to drift.
    const repo = makeRepo({ findEmailAccountByUserId: vi.fn().mockResolvedValue(null) });

    await makeService(repo).forgotPassword('om@example.com');

    expect(repo.createVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({ type: VerificationType.PASSWORD_RESET }),
    );
  });
});
