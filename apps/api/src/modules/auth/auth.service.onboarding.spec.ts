import { describe, it, expect, vi } from 'vitest';
import { AuthService } from './auth.service';
import { DuplicateEntityException } from '../../common/exceptions/app.exceptions';

const dob = new Date('1995-06-15');

const userFixture = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  username: 'test_user',
  language: 'EN',
  gender: null,
  dob: null,
  avatarUrl: null,
  roles: [{ role: 'VRATARTHI' }],
  emailVerifiedAt: new Date(),
  accountSetupCompletedAt: new Date(),
  onboardingCompletedAt: null,
  deletedAt: null,
};

function makeRepo(overrides: Partial<{
  findUserByUsername: (username: string) => Promise<{ id: string } | null>;
  markAccountSetupComplete: () => Promise<unknown>;
  markOnboardingComplete: () => Promise<unknown>;
}> = {}) {
  return {
    findUserByUsername: vi.fn().mockResolvedValue(null),
    markAccountSetupComplete: vi.fn().mockResolvedValue(userFixture),
    markOnboardingComplete: vi
      .fn()
      .mockResolvedValue({ ...userFixture, onboardingCompletedAt: new Date() }),
    ...overrides,
  };
}

function makeService(repo: ReturnType<typeof makeRepo>) {
  const service = Object.create(AuthService.prototype) as AuthService;
  (service as unknown as Record<string, unknown>)['authRepository'] = repo;
  (service as unknown as Record<string, unknown>)['redis'] = { del: vi.fn() };
  (service as unknown as Record<string, unknown>)['logger'] = { warn: vi.fn() };
  (service as unknown as Record<string, unknown>)['usersIndex'] = { upsert: vi.fn().mockResolvedValue(undefined) };
  return service;
}

describe('AuthService — completeOnboarding', () => {
  it('persists displayName, username, language, gender, and dob', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    await service.completeOnboarding('user-1', 'New Name', 'new_username', 'MR', 'Male', '1995-06-15');

    expect(repo.markAccountSetupComplete).toHaveBeenCalledWith('user-1', {
      displayName: 'New Name',
      username: 'new_username',
      language: 'MR',
      gender: 'Male',
      dob,
    });
  });

  it('works with only required fields — gender and dob remain undefined', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    await service.completeOnboarding('user-1', 'New Name', 'new_username', 'EN');

    expect(repo.markAccountSetupComplete).toHaveBeenCalledWith('user-1', {
      displayName: 'New Name',
      username: 'new_username',
      language: 'EN',
      gender: undefined,
      dob: undefined,
    });
  });

  it('works with partial fields (only language)', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    await service.completeOnboarding('user-1', undefined, undefined, 'EN');

    expect(repo.markAccountSetupComplete).toHaveBeenCalledWith('user-1', {
      displayName: undefined,
      username: undefined,
      language: 'EN',
      gender: undefined,
      dob: undefined,
    });
  });

  it('throws DuplicateEntityException when username is taken by another user', async () => {
    const repo = makeRepo({
      findUserByUsername: vi.fn().mockResolvedValue({ id: 'other-user' }),
    });
    const service = makeService(repo);

    await expect(
      service.completeOnboarding('user-1', undefined, 'taken_name', undefined),
    ).rejects.toThrow(DuplicateEntityException);
  });

  it('allows using own username (no conflict)', async () => {
    const repo = makeRepo({
      findUserByUsername: vi.fn().mockResolvedValue({ id: 'user-1' }),
    });
    const service = makeService(repo);

    await expect(
      service.completeOnboarding('user-1', undefined, 'own_username', undefined),
    ).resolves.not.toThrow();
  });

  it('completeOnboarding does NOT mark the whole onboarding complete (framework still required)', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    const result = await service.completeOnboarding('user-1', 'New Name', 'new_username', 'EN');

    expect(repo.markOnboardingComplete).not.toHaveBeenCalled();
    expect(result.onboardingCompletedAt).toBeNull();
    expect(result.accountSetupCompletedAt).not.toBeNull();
  });
});

describe('AuthService — completeFramework', () => {
  it('marks onboarding complete (grants app access)', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    const result = await service.completeFramework('user-1');

    expect(repo.markOnboardingComplete).toHaveBeenCalledWith('user-1');
    expect(result.onboardingCompletedAt).not.toBeNull();
  });
});

// Auth matrix — permission row: POST /auth/complete-onboarding
// Positive: authenticated user with all fields — covered by unit tests above
// Negative: unauthenticated → 401 — covered by integration test in src/test/auth.integration.spec.ts
//           "NEGATIVE — returns 401 when no session cookie is present"
