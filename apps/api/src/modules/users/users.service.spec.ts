import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from './users.service';
import {
  EntityNotFoundException,
  UserUsernameTakenException,
} from '../../common/exceptions/app.exceptions';

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'va@example.com',
  displayName: 'Test User',
  username: 'testuser',
  avatarUrl: null,
  gender: null,
  dob: null,
  language: 'EN',
  showLastActive: true,
  showOnlineIndicator: true,
  profilePrivate: false,
  lastActiveAt: new Date('2026-06-03T10:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
  journeysCompleted: 2,
  journeysActive: 1,
  testsTaken: 5,
  publicExperienceCount: 3,
  ...overrides,
});

function makeRepo(overrides: Partial<{
  findById: () => Promise<unknown>;
  findByUsername: () => Promise<unknown>;
  updateProfile: () => Promise<unknown>;
  isUsernameTaken: () => Promise<boolean>;
}> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(makeUser()),
    findByUsername: vi.fn().mockResolvedValue(makeUser()),
    updateProfile: vi.fn().mockResolvedValue(makeUser()),
    isUsernameTaken: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function makeService(repo: ReturnType<typeof makeRepo>) {
  const service = Object.create(UsersService.prototype) as UsersService;
  (service as unknown as Record<string, unknown>)['usersRepository'] = repo;
  return service;
}

describe('UsersService — getPublicProfile', () => {
  it('returns public profile when profilePrivate = false', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    const result = await service.getPublicProfile('testuser');

    expect(result.username).toBe('testuser');
    expect(result.journeysCompleted).toBe(2);
    expect(result.testsTaken).toBe(5);
  });

  it('throws EntityNotFoundException for private profile', async () => {
    const repo = makeRepo({
      findByUsername: vi.fn().mockResolvedValue(makeUser({ profilePrivate: true })),
    });
    const service = makeService(repo);

    await expect(service.getPublicProfile('testuser')).rejects.toThrow(EntityNotFoundException);
  });

  it('throws EntityNotFoundException for non-existent username', async () => {
    const repo = makeRepo({ findByUsername: vi.fn().mockResolvedValue(null) });
    const service = makeService(repo);

    await expect(service.getPublicProfile('nobody')).rejects.toThrow(EntityNotFoundException);
  });

  it('omits lastActive when showLastActive = false', async () => {
    const repo = makeRepo({
      findByUsername: vi.fn().mockResolvedValue(makeUser({ showLastActive: false })),
    });
    const service = makeService(repo);

    const result = await service.getPublicProfile('testuser');

    expect('lastActive' in result).toBe(false);
  });

  it('omits isOnline when showOnlineIndicator = false', async () => {
    const repo = makeRepo({
      findByUsername: vi.fn().mockResolvedValue(makeUser({ showOnlineIndicator: false })),
    });
    const service = makeService(repo);

    const result = await service.getPublicProfile('testuser');

    expect('isOnline' in result).toBe(false);
  });
});

describe('UsersService — updateOwnProfile', () => {
  it('throws UserUsernameTakenException when username taken by another user', async () => {
    const repo = makeRepo({ isUsernameTaken: vi.fn().mockResolvedValue(true) });
    const service = makeService(repo);

    await expect(
      service.updateOwnProfile('user-1', { username: 'taken' }),
    ).rejects.toThrow(UserUsernameTakenException);
  });

  it('succeeds when username is own current username (not taken by another)', async () => {
    const repo = makeRepo({ isUsernameTaken: vi.fn().mockResolvedValue(false) });
    const service = makeService(repo);

    await expect(
      service.updateOwnProfile('user-1', { username: 'testuser' }),
    ).resolves.not.toThrow();
    expect(repo.updateProfile).toHaveBeenCalledWith('user-1', expect.objectContaining({ username: 'testuser' }));
  });
});

describe('UsersService — checkUsernameAvailable', () => {
  it('returns true for own username (not taken by another)', async () => {
    const repo = makeRepo({ isUsernameTaken: vi.fn().mockResolvedValue(false) });
    const service = makeService(repo);

    const result = await service.checkUsernameAvailable('testuser', 'user-1');
    expect(result).toBe(true);
  });

  it('returns false for invalid format', async () => {
    const repo = makeRepo();
    const service = makeService(repo);

    const result = await service.checkUsernameAvailable('INVALID_CAPS', 'user-1');
    expect(result).toBe(false);
    expect(repo.isUsernameTaken).not.toHaveBeenCalled();
  });

  it('returns false when username taken by another user', async () => {
    const repo = makeRepo({ isUsernameTaken: vi.fn().mockResolvedValue(true) });
    const service = makeService(repo);

    const result = await service.checkUsernameAvailable('someone_else', 'user-1');
    expect(result).toBe(false);
  });
});

describe('UsersService — lastActiveAt field', () => {
  let service: UsersService;

  beforeEach(() => {
    const repo = makeRepo();
    service = makeService(repo);
  });

  it('returns ISO timestamp for lastActiveAt when showLastActive = true', async () => {
    const now = new Date();
    const repo = makeRepo({
      findByUsername: vi.fn().mockResolvedValue(makeUser({ lastActiveAt: now })),
    });
    const svc = makeService(repo);

    const result = await svc.getPublicProfile('testuser');
    expect(result.lastActiveAt).toBe(now.toISOString());
  });

  it('omits lastActiveAt when showLastActive = false', async () => {
    const repo = makeRepo({
      findByUsername: vi.fn().mockResolvedValue(makeUser({ showLastActive: false })),
    });
    const svc = makeService(repo);

    const result = await svc.getPublicProfile('testuser');
    expect('lastActiveAt' in result).toBe(false);
  });
});
