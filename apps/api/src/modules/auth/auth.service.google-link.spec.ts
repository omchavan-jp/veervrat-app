import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bcrypt from 'bcrypt';
import { AuthProvider, VerificationType } from '@prisma/client';
import { AuthService } from './auth.service';
import {
  InvalidCredentialsException,
  TokenInvalidException,
  TokenExpiredException,
} from '../../common/exceptions/app.exceptions';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

const USER = {
  id: 'user-1',
  email: 'om@example.com',
  displayName: 'Om',
  username: 'om_user',
  language: 'EN',
  gender: null,
  dob: null,
  roles: [{ role: 'VRATARTHI' }],
  emailVerifiedAt: new Date(),
  onboardingCompletedAt: null,
  deletedAt: null,
};

const GOOGLE_PROFILE = {
  googleId: 'gid-123',
  email: 'om@example.com',
  name: 'Om Chavan',
};

const LINK_TOKEN_ROW = {
  id: 'token-id-1',
  token: 'validtoken',
  type: VerificationType.GOOGLE_LINK,
  userId: 'user-1',
  expiresAt: new Date(Date.now() + 900_000),
  usedAt: null,
  metadata: { googleId: 'gid-123', googleEmail: 'om@example.com', displayName: 'Om Chavan' },
  user: USER,
};

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findAuthAccount: vi.fn().mockResolvedValue(null),
    findUserByEmail: vi.fn().mockResolvedValue(USER),
    invalidateTokensByUserAndType: vi.fn().mockResolvedValue(undefined),
    createVerificationToken: vi.fn().mockResolvedValue({}),
    findVerificationToken: vi.fn().mockResolvedValue(LINK_TOKEN_ROW),
    findEmailAccountByUserId: vi.fn().mockResolvedValue({ id: 'acc-1', passwordHash: '$2b$12$hash' }),
    addAuthAccount: vi.fn().mockResolvedValue({}),
    markTokenUsed: vi.fn().mockResolvedValue({}),
    createSession: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function makeService(repo: ReturnType<typeof makeRepo>) {
  const service = Object.create(AuthService.prototype) as AuthService;
  const internals = service as unknown as Record<string, unknown>;
  internals['authRepository'] = repo;
  internals['sessionTtlDays'] = 30;
  internals['logger'] = { warn: vi.fn() };
  internals['configService'] = { get: vi.fn().mockReturnValue('http://localhost:3000') };
  return service;
}

// ─── handleGoogleLogin — conflict branch ────────────────────────────────────

describe('AuthService — handleGoogleLogin (email conflict)', () => {
  it('POSITIVE: returns link_pending with token when email matches existing credentials account', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    const result = await service.handleGoogleLogin(GOOGLE_PROFILE, null, null);

    expect(result).toMatchObject({ action: 'link_pending' });
    expect(typeof (result as { token: string }).token).toBe('string');
    expect(repo.createVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: VerificationType.GOOGLE_LINK,
        metadata: expect.objectContaining({ googleId: 'gid-123' }),
      }),
    );
  });

  it('NEGATIVE: does not create a session when conflict is detected', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    await service.handleGoogleLogin(GOOGLE_PROFILE, null, null);

    expect(repo.createSession).not.toHaveBeenCalled();
  });

  it('invalidates any prior pending GOOGLE_LINK token before issuing new one', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    await service.handleGoogleLogin(GOOGLE_PROFILE, null, null);

    expect(repo.invalidateTokensByUserAndType).toHaveBeenCalledWith('user-1', VerificationType.GOOGLE_LINK);
  });
});

// ─── linkGoogleAccount ────────────────────────────────────────────────────────

describe('AuthService — linkGoogleAccount', () => {
  beforeEach(() => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
  });

  it('POSITIVE: creates AuthAccount, marks token used, and returns session', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    const result = await service.linkGoogleAccount('validtoken', 'password123', null, null);

    expect(repo.addAuthAccount).toHaveBeenCalledWith({
      userId: 'user-1',
      provider: AuthProvider.GOOGLE,
      providerAccountId: 'gid-123',
    });
    expect(repo.markTokenUsed).toHaveBeenCalledWith('token-id-1');
    expect(repo.createSession).toHaveBeenCalled();
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('sessionToken');
  });

  it('NEGATIVE: throws TokenInvalidException when token not found', async () => {
    const repo = makeRepo({ findVerificationToken: vi.fn().mockResolvedValue(null) });
    const service = makeService(repo);

    await expect(service.linkGoogleAccount('badtoken', 'password123', null, null)).rejects.toThrow(
      TokenInvalidException,
    );
    expect(repo.addAuthAccount).not.toHaveBeenCalled();
  });

  it('NEGATIVE: throws TokenExpiredException when the link token has expired', async () => {
    const expired = { ...LINK_TOKEN_ROW, expiresAt: new Date(Date.now() - 1000) };
    const repo = makeRepo({ findVerificationToken: vi.fn().mockResolvedValue(expired) });
    const service = makeService(repo);

    await expect(service.linkGoogleAccount('validtoken', 'password123', null, null)).rejects.toThrow(
      TokenExpiredException,
    );
    expect(repo.addAuthAccount).not.toHaveBeenCalled();
    expect(repo.createSession).not.toHaveBeenCalled();
  });

  it('NEGATIVE: throws InvalidCredentialsException on wrong password', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    const repo = makeRepo();
    const service = makeService(repo);

    await expect(service.linkGoogleAccount('validtoken', 'wrongpassword', null, null)).rejects.toThrow(
      InvalidCredentialsException,
    );
    expect(repo.addAuthAccount).not.toHaveBeenCalled();
  });

  it('NEGATIVE: throws InvalidCredentialsException when no email account exists', async () => {
    const repo = makeRepo({ findEmailAccountByUserId: vi.fn().mockResolvedValue(null) });
    const service = makeService(repo);

    await expect(service.linkGoogleAccount('validtoken', 'password123', null, null)).rejects.toThrow(
      InvalidCredentialsException,
    );
  });

  it('NEGATIVE: throws TokenInvalidException when metadata missing googleId', async () => {
    const badToken = { ...LINK_TOKEN_ROW, metadata: { googleEmail: 'om@example.com' } };
    const repo = makeRepo({ findVerificationToken: vi.fn().mockResolvedValue(badToken) });
    const service = makeService(repo);

    await expect(service.linkGoogleAccount('validtoken', 'password123', null, null)).rejects.toThrow(
      TokenInvalidException,
    );
  });
});
