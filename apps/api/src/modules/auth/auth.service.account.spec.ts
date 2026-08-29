import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bcrypt from 'bcrypt';
import { AuthProvider, VerificationType } from '@prisma/client';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

const mockedCompare = vi.mocked(bcrypt.compare);
const mockedHash = vi.mocked(bcrypt.hash);
import { AuthService } from './auth.service';
import {
  InvalidCredentialsException,
  DuplicateEntityException,
  EntityInUseException,
  NoPasswordSetException,
  TokenInvalidException,
} from '../../common/exceptions/app.exceptions';

function makeService(repo: Record<string, unknown>, email?: Record<string, unknown>) {
  const service = Object.create(AuthService.prototype) as AuthService;
  const internals = service as unknown as Record<string, unknown>;
  internals['authRepository'] = repo;
  internals['sessionTtlDays'] = 30;
  internals['logger'] = { warn: vi.fn() };
  internals['configService'] = { get: vi.fn().mockReturnValue('http://localhost:3000') };
  internals['emailService'] = {
    renderTemplate: vi.fn().mockResolvedValue({ html: '<p/>', text: 't' }),
    sendTransactional: vi.fn().mockResolvedValue(undefined),
    ...email,
  };
  return service;
}

const HASH = '$2b$10$abcdefghijklmnopqrstuv'; // shape only; bcrypt.compare is mocked

beforeEach(() => {
  mockedCompare.mockReset();
  mockedHash.mockReset();
});

describe('AuthService — changePassword', () => {
  it('rejects a wrong current password', async () => {
    mockedCompare.mockResolvedValue(false as never);
    const repo = {
      findEmailAccountByUserId: vi.fn().mockResolvedValue({ id: 'a1', passwordHash: HASH }),
      // A wrong password no longer fails outright — it falls through to the Google proof (#196).
      // `false` is "and there isn't one either", which is what makes the refusal correct.
      consumeSessionReauthentication: vi.fn().mockResolvedValue(false),
    };
    const service = makeService(repo);
    await expect(service.changePassword('u1', 'wrong', 'newpassword1')).rejects.toBeInstanceOf(
      InvalidCredentialsException,
    );
  });

  it('updates hash + re-issues a session on success', async () => {
    mockedCompare.mockResolvedValue(true as never);
    mockedHash.mockResolvedValue('newhash' as never);
    const repo = {
      findEmailAccountByUserId: vi.fn().mockResolvedValue({ id: 'a1', passwordHash: HASH }),
      // A wrong password no longer fails outright — it falls through to the Google proof (#196).
      // `false` is "and there isn't one either", which is what makes the refusal correct.
      consumeSessionReauthentication: vi.fn().mockResolvedValue(false),
      updatePasswordHash: vi.fn().mockResolvedValue({}),
      deleteAllUserSessions: vi.fn().mockResolvedValue({}),
      createSession: vi.fn().mockResolvedValue({}),
    };
    const service = makeService(repo);
    const r = await service.changePassword('u1', 'correct', 'newpassword1');
    expect(repo.updatePasswordHash).toHaveBeenCalledWith('a1', 'newhash');
    expect(repo.deleteAllUserSessions).toHaveBeenCalledWith('u1');
    expect(typeof r.sessionToken).toBe('string');
  });

  it('rejects when there is no credential account (Google-only)', async () => {
    const repo = {
      findEmailAccountByUserId: vi.fn().mockResolvedValue(null),
      consumeSessionReauthentication: vi.fn().mockResolvedValue(false),
    };
    const service = makeService(repo);
    await expect(service.changePassword('u1', 'x', 'newpassword1')).rejects.toBeInstanceOf(
      NoPasswordSetException,
    );
  });
});

describe('AuthService — requestEmailChange', () => {
  it('rejects a duplicate email', async () => {
    mockedCompare.mockResolvedValue(true as never);
    const repo = {
      findUserById: vi
        .fn()
        .mockResolvedValue({ id: 'u1', email: 'old@x.com', displayName: 'U', language: 'EN' }),
      findEmailAccountByUserId: vi.fn().mockResolvedValue({ id: 'a1', passwordHash: HASH }),
      // A wrong password no longer fails outright — it falls through to the Google proof (#196).
      // `false` is "and there isn't one either", which is what makes the refusal correct.
      consumeSessionReauthentication: vi.fn().mockResolvedValue(false),
      emailInUse: vi.fn().mockResolvedValue(true),
    };
    const service = makeService(repo);
    await expect(
      service.requestEmailChange('u1', 'sess-1', 'taken@x.com', 'pw'),
    ).rejects.toBeInstanceOf(DuplicateEntityException);
  });

  it('rejects a wrong password', async () => {
    mockedCompare.mockResolvedValue(false as never);
    const repo = {
      findUserById: vi
        .fn()
        .mockResolvedValue({ id: 'u1', email: 'old@x.com', displayName: 'U', language: 'EN' }),
      findEmailAccountByUserId: vi.fn().mockResolvedValue({ id: 'a1', passwordHash: HASH }),
      // A wrong password no longer fails outright — it falls through to the Google proof (#196).
      // `false` is "and there isn't one either", which is what makes the refusal correct.
      consumeSessionReauthentication: vi.fn().mockResolvedValue(false),
    };
    const service = makeService(repo);
    await expect(
      service.requestEmailChange('u1', 'sess-1', 'new@x.com', 'wrong'),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('stores pendingEmail + issues a token + emails the new address', async () => {
    mockedCompare.mockResolvedValue(true as never);
    const repo = {
      findUserById: vi
        .fn()
        .mockResolvedValue({ id: 'u1', email: 'old@x.com', displayName: 'U', language: 'EN' }),
      findEmailAccountByUserId: vi.fn().mockResolvedValue({ id: 'a1', passwordHash: HASH }),
      // A wrong password no longer fails outright — it falls through to the Google proof (#196).
      // `false` is "and there isn't one either", which is what makes the refusal correct.
      consumeSessionReauthentication: vi.fn().mockResolvedValue(false),
      emailInUse: vi.fn().mockResolvedValue(false),
      // Nobody holds the address through an EMAIL AuthAccount either — the second place an
      // address is spoken for, and the one `emailInUse` cannot see.
      findEmailAccountByAddress: vi.fn().mockResolvedValue(null),
      setPendingEmail: vi.fn().mockResolvedValue({ id: 'u1' }),
      invalidateTokensByUserAndType: vi.fn().mockResolvedValue({}),
      createVerificationToken: vi.fn().mockResolvedValue({}),
    };
    const sendTransactional = vi.fn().mockResolvedValue(undefined);
    const service = makeService(repo, { sendTransactional });
    const r = await service.requestEmailChange('u1', 'sess-1', 'New@x.com', 'pw');
    expect(r).toBe('sent');
    expect(repo.setPendingEmail).toHaveBeenCalledWith('u1', 'new@x.com');
    expect(repo.createVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({
        type: VerificationType.EMAIL_CHANGE,
        metadata: { newEmail: 'new@x.com' },
      }),
    );
    expect(sendTransactional).toHaveBeenCalledWith(
      'new@x.com',
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
  });
});

describe('AuthService — email change onto a claimed address', () => {
  const TOKEN = {
    id: 't1',
    userId: 'u1',
    expiresAt: new Date(Date.now() + 60000),
    metadata: { newEmail: 'new@x.com' },
  };

  function base(extra: Record<string, unknown>) {
    return {
      findVerificationToken: vi.fn().mockResolvedValue(TOKEN),
      getPendingEmail: vi.fn().mockResolvedValue('new@x.com'),
      emailInUse: vi.fn().mockResolvedValue(false),
      markTokenUsed: vi.fn().mockResolvedValue({}),
      ...extra,
    };
  }

  it('releases a claim held by a deleted account, then applies the change', async () => {
    const releaseIdentityClaims = vi.fn().mockResolvedValue({ count: 1 });
    const applyEmailChange = vi.fn().mockResolvedValue({
      id: 'u1',
      email: 'new@x.com',
      displayName: 'U',
      username: 'u',
      roles: [],
      emailVerifiedAt: new Date(),
    });
    const repo = base({
      findEmailAccountByAddress: vi
        .fn()
        .mockResolvedValue({ userId: 'u-dead', user: { id: 'u-dead', deletedAt: new Date() } }),
      releaseIdentityClaims,
      applyEmailChange,
    });
    const service = makeService(repo);

    await service.confirmEmailChange('tok');

    expect(releaseIdentityClaims).toHaveBeenCalledWith('u-dead');
    expect(applyEmailChange).toHaveBeenCalledWith('u1', 'new@x.com');
  });

  it('refuses a claim held by a LIVE account, and does not write', async () => {
    const releaseIdentityClaims = vi.fn();
    const applyEmailChange = vi.fn();
    const repo = base({
      findEmailAccountByAddress: vi
        .fn()
        .mockResolvedValue({ userId: 'u-live', user: { id: 'u-live', deletedAt: null } }),
      releaseIdentityClaims,
      applyEmailChange,
    });
    const service = makeService(repo);

    await expect(service.confirmEmailChange('tok')).rejects.toBeInstanceOf(
      DuplicateEntityException,
    );
    // Neither released nor written: the live holder keeps a working sign-in.
    expect(releaseIdentityClaims).not.toHaveBeenCalled();
    expect(applyEmailChange).not.toHaveBeenCalled();
  });

  it('does not treat the mover own row as somebody else claim', async () => {
    const applyEmailChange = vi.fn().mockResolvedValue({
      id: 'u1',
      email: 'new@x.com',
      displayName: 'U',
      username: 'u',
      roles: [],
      emailVerifiedAt: new Date(),
    });
    const releaseIdentityClaims = vi.fn();
    const repo = base({
      findEmailAccountByAddress: vi
        .fn()
        .mockResolvedValue({ userId: 'u1', user: { id: 'u1', deletedAt: null } }),
      releaseIdentityClaims,
      applyEmailChange,
    });
    const service = makeService(repo);

    await service.confirmEmailChange('tok');

    expect(releaseIdentityClaims).not.toHaveBeenCalled();
    expect(applyEmailChange).toHaveBeenCalled();
  });
});

describe('AuthService — confirmEmailChange', () => {
  it('applies the change when token + pending email match', async () => {
    const repo = {
      findVerificationToken: vi.fn().mockResolvedValue({
        id: 't1',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 60000),
        metadata: { newEmail: 'new@x.com' },
      }),
      getPendingEmail: vi.fn().mockResolvedValue('new@x.com'),
      emailInUse: vi.fn().mockResolvedValue(false),
      findEmailAccountByAddress: vi.fn().mockResolvedValue(null),
      releaseIdentityClaims: vi.fn().mockResolvedValue({ count: 0 }),
      applyEmailChange: vi.fn().mockResolvedValue({
        id: 'u1',
        email: 'new@x.com',
        displayName: 'U',
        username: 'u',
        language: 'EN',
        gender: null,
        dob: null,
        avatarUrl: null,
        roles: [{ role: 'VRATARTHI' }],
        emailVerifiedAt: new Date(),
        accountSetupCompletedAt: new Date(),
        onboardingCompletedAt: new Date(),
      }),
      markTokenUsed: vi.fn().mockResolvedValue({}),
    };
    const service = makeService(repo);
    const r = await service.confirmEmailChange('tok');
    expect(repo.applyEmailChange).toHaveBeenCalledWith('u1', 'new@x.com');
    expect(repo.markTokenUsed).toHaveBeenCalledWith('t1');
    expect(r.user.email).toBe('new@x.com');
  });

  it('rejects when pending email no longer matches the token', async () => {
    const repo = {
      findVerificationToken: vi.fn().mockResolvedValue({
        id: 't1',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 60000),
        metadata: { newEmail: 'new@x.com' },
      }),
      getPendingEmail: vi.fn().mockResolvedValue(null),
    };
    const service = makeService(repo);
    await expect(service.confirmEmailChange('tok')).rejects.toBeInstanceOf(TokenInvalidException);
  });
});

describe('AuthService — disconnectAccount', () => {
  it('blocks removing the only login method', async () => {
    const repo = {
      listAuthAccounts: vi
        .fn()
        .mockResolvedValue([{ id: 'g1', provider: AuthProvider.GOOGLE, passwordHash: null }]),
    };
    const service = makeService(repo);
    await expect(service.disconnectAccount('u1', AuthProvider.GOOGLE)).rejects.toBeInstanceOf(
      EntityInUseException,
    );
  });

  it('disconnects when another login method remains', async () => {
    const repo = {
      listAuthAccounts: vi.fn().mockResolvedValue([
        { id: 'g1', provider: AuthProvider.GOOGLE, passwordHash: null },
        { id: 'e1', provider: AuthProvider.EMAIL, passwordHash: '$2b$10$xxx' },
      ]),
      deleteAuthAccount: vi.fn().mockResolvedValue({ id: 'g1' }),
    };
    const service = makeService(repo);
    const r = await service.disconnectAccount('u1', AuthProvider.GOOGLE);
    expect(repo.deleteAuthAccount).toHaveBeenCalledWith('g1');
    expect(r.provider).toBe(AuthProvider.GOOGLE);
  });
});
