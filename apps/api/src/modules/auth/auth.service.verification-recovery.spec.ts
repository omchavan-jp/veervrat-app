import { describe, it, expect, vi } from 'vitest';
import { VerificationType } from '@prisma/client';
import { AuthService } from './auth.service';

vi.mock('bcrypt', () => ({ compare: vi.fn(), hash: vi.fn().mockResolvedValue('$2b$12$new') }));

const UNVERIFIED_USER = {
  id: 'user-1',
  email: 'om@example.com',
  displayName: 'Om',
  username: 'om_user',
  language: 'EN',
  emailVerifiedAt: null,
  roles: [{ role: 'VRATARTHI' }],
};

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(UNVERIFIED_USER),
    findEmailAccountByUserId: vi.fn().mockResolvedValue({ id: 'acc-1', passwordHash: '$2b$12$h' }),
    invalidateTokensByUserAndType: vi.fn().mockResolvedValue(undefined),
    createVerificationToken: vi.fn().mockResolvedValue({}),
    findVerificationToken: vi.fn(),
    markTokenUsed: vi.fn().mockResolvedValue({}),
    markEmailVerified: vi.fn().mockResolvedValue({}),
    updatePasswordHash: vi.fn().mockResolvedValue({}),
    deleteAllUserSessions: vi.fn().mockResolvedValue({}),
    addAuthAccount: vi.fn().mockResolvedValue({}),
    createSession: vi.fn().mockResolvedValue({}),
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
  // The send spy now belongs to EmailQueueService (#141); EmailService only renders.
  i['emailQueue'] = { sendNotification: vi.fn(), ...email };
  i['emailService'] = {
    renderTemplate: vi.fn().mockResolvedValue({ html: '<p/>', text: 't' }),
  };
  return service;
}

describe('resendVerification — anti-enumeration', () => {
  // These four assert the SAME return value, not merely success. A test that only checked for
  // a 200 would pass while a body or shape difference silently reintroduced enumeration.
  it('unknown address: returns sent, sends nothing', async () => {
    const repo = makeRepo({ findUserByEmail: vi.fn().mockResolvedValue(null) });
    const mail = { sendTransactional: vi.fn() };
    const service = makeService(repo, mail);

    await expect(service.resendVerification('nobody@example.com')).resolves.toBe('sent');
    expect(mail.sendTransactional).not.toHaveBeenCalled();
  });

  it('already-verified address: returns sent, sends nothing', async () => {
    const repo = makeRepo({
      findUserByEmail: vi
        .fn()
        .mockResolvedValue({ ...UNVERIFIED_USER, emailVerifiedAt: new Date() }),
    });
    const mail = { sendTransactional: vi.fn() };
    const service = makeService(repo, mail);

    await expect(service.resendVerification('om@example.com')).resolves.toBe('sent');
    expect(mail.sendTransactional).not.toHaveBeenCalled();
  });

  it('Google-only account: returns sent, sends nothing', async () => {
    const repo = makeRepo({ findEmailAccountByUserId: vi.fn().mockResolvedValue(null) });
    const mail = { sendTransactional: vi.fn() };
    const service = makeService(repo, mail);

    await expect(service.resendVerification('om@example.com')).resolves.toBe('sent');
    expect(mail.sendTransactional).not.toHaveBeenCalled();
  });

  it('genuinely unverified account: returns sent AND sends', async () => {
    const repo = makeRepo();
    const mail = { sendTransactional: vi.fn() };
    const service = makeService(repo, mail);

    await expect(service.resendVerification('om@example.com')).resolves.toBe('sent');
    expect(mail.sendTransactional).toHaveBeenCalledWith(
      'om@example.com',
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
  });

  it('invalidates prior tokens so a burst cannot leave several live links', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    await service.resendVerification('om@example.com');

    expect(repo.invalidateTokensByUserAndType).toHaveBeenCalledWith(
      'user-1',
      VerificationType.EMAIL_VERIFICATION,
    );
    // ordering matters: invalidate must precede issuing the replacement
    const inv = repo.invalidateTokensByUserAndType.mock.invocationCallOrder[0];
    const create = repo.createVerificationToken.mock.invocationCallOrder[0];
    expect(inv).toBeLessThan(create);
  });
});

describe('resetPassword marks the address verified', () => {
  const RESET_TOKEN_ROW = {
    id: 'tok-1',
    token: 'valid',
    type: VerificationType.PASSWORD_RESET,
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 900_000),
    usedAt: null,
    user: UNVERIFIED_USER,
  };

  it('receiving the reset token proves mailbox control, so the address is verified', async () => {
    const repo = makeRepo({ findVerificationToken: vi.fn().mockResolvedValue(RESET_TOKEN_ROW) });
    const service = makeService(repo);

    await service.resetPassword('valid', 'NewPassw0rd!');

    expect(repo.markEmailVerified).toHaveBeenCalledWith('user-1');
    expect(repo.updatePasswordHash).toHaveBeenCalled();
  });
});

describe("linkGoogleAccount honours Google's email_verified claim", () => {
  const linkRow = (emailVerified: unknown) => ({
    id: 'tok-2',
    token: 'valid',
    type: VerificationType.GOOGLE_LINK,
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 900_000),
    usedAt: null,
    metadata: {
      googleId: 'gid-1',
      googleEmail: 'om@example.com',
      displayName: 'Om',
      ...(emailVerified === undefined ? {} : { emailVerified }),
    },
    user: UNVERIFIED_USER,
  });

  it('POSITIVE: Google says verified -> address is marked verified', async () => {
    const bcrypt = await import('bcrypt');
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const repo = makeRepo({ findVerificationToken: vi.fn().mockResolvedValue(linkRow(true)) });
    const service = makeService(repo);

    await service.linkGoogleAccount('valid', 'password', null, null);

    expect(repo.markEmailVerified).toHaveBeenCalledWith('user-1');
  });

  it('NEGATIVE: Google says NOT verified -> links, but does not verify', async () => {
    const bcrypt = await import('bcrypt');
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const repo = makeRepo({ findVerificationToken: vi.fn().mockResolvedValue(linkRow(false)) });
    const service = makeService(repo);

    await service.linkGoogleAccount('valid', 'password', null, null);

    expect(repo.addAuthAccount).toHaveBeenCalled();
    expect(repo.markEmailVerified).not.toHaveBeenCalled();
  });

  it('NEGATIVE: claim absent (older token) -> links, but does not verify', async () => {
    const bcrypt = await import('bcrypt');
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const repo = makeRepo({ findVerificationToken: vi.fn().mockResolvedValue(linkRow(undefined)) });
    const service = makeService(repo);

    await service.linkGoogleAccount('valid', 'password', null, null);

    expect(repo.markEmailVerified).not.toHaveBeenCalled();
  });
});
