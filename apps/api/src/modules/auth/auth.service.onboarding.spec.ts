import { describe, it, expect, vi } from 'vitest';
import { AuthService } from './auth.service';
import { DuplicateEntityException } from '../../common/exceptions/app.exceptions';

function makeRepo(overrides: Partial<{
  findUserByUsername: (username: string) => Promise<{ id: string } | null>;
  markOnboardingComplete: () => Promise<unknown>;
}> = {}) {
  return {
    findUserByUsername: vi.fn().mockResolvedValue(null),
    markOnboardingComplete: vi.fn().mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      username: 'test_user',
      language: 'EN',
      roles: [{ role: 'VRATARTHI' }],
      emailVerifiedAt: new Date(),
      onboardingCompletedAt: new Date(),
    }),
    ...overrides,
  };
}

function makeService(repo: ReturnType<typeof makeRepo>) {
  const service = Object.create(AuthService.prototype) as AuthService;
  (service as unknown as Record<string, unknown>)['authRepository'] = repo;
  (service as unknown as Record<string, unknown>)['redis'] = { del: vi.fn() };
  (service as unknown as Record<string, unknown>)['logger'] = { warn: vi.fn() };
  return service;
}

describe('AuthService — completeOnboarding', () => {
  it('persists displayName, username, and language', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    await service.completeOnboarding('user-1', 'New Name', 'new_username', 'MR');

    expect(repo.markOnboardingComplete).toHaveBeenCalledWith('user-1', {
      displayName: 'New Name',
      username: 'new_username',
      language: 'MR',
    });
  });

  it('works with partial fields (only language)', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    await service.completeOnboarding('user-1', undefined, undefined, 'EN');

    expect(repo.markOnboardingComplete).toHaveBeenCalledWith('user-1', {
      displayName: undefined,
      username: undefined,
      language: 'EN',
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
});
