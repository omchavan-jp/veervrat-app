import { describe, it, expect, vi } from 'vitest';
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
  profileVisibility: {},
  lastActiveAt: new Date('2026-06-03T10:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
  journeysCompleted: 2,
  journeysActive: 1,
  testsTaken: 5,
  weaknessesWorkedOn: 4,
  exposuresActive: 1,
  exposuresCompleted: 2,
  resolutionsActive: 1,
  resolutionsCompleted: 1,
  challengesCompleted: 1,
  publicExperienceCount: 3,
  ...overrides,
});

function makeRepo(
  overrides: Partial<{
    findById: () => Promise<unknown>;
    findByUsername: () => Promise<unknown>;
    updateProfile: () => Promise<unknown>;
    updateVisibility: () => Promise<unknown>;
    isUsernameTaken: () => Promise<boolean>;
  }> = {},
) {
  return {
    findById: vi.fn().mockResolvedValue(makeUser()),
    findByUsername: vi.fn().mockResolvedValue(makeUser()),
    updateProfile: vi.fn().mockResolvedValue(makeUser()),
    updateVisibility: vi.fn().mockResolvedValue(makeUser()),
    isUsernameTaken: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function makeFollows() {
  return {
    getCounts: vi.fn().mockResolvedValue({ followers: 0, following: 0 }),
    getStatus: vi.fn().mockResolvedValue({ isFollowing: false, followsYou: false }),
    areMutualFollows: vi.fn().mockResolvedValue(false),
  };
}

function makeIndex() {
  return {
    upsert: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
  };
}

function makeService(
  repo: ReturnType<typeof makeRepo>,
  follows = makeFollows(),
  index = makeIndex(),
) {
  const service = Object.create(UsersService.prototype) as UsersService;
  const s = service as unknown as Record<string, unknown>;
  s['usersRepository'] = repo;
  s['followsService'] = follows;
  s['usersIndex'] = index;
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

  it('includes all stat fields when visibility map is empty (public default)', async () => {
    const result = await makeService(makeRepo()).getPublicProfile('testuser');
    expect(result.testsTaken).toBe(5);
    expect(result.weaknessesWorkedOn).toBe(4);
    expect(result.exposuresActive).toBe(1);
    expect(result.challengesCompleted).toBe(1);
    expect(result.publicExperienceCount).toBe(3);
  });

  it('omits a field entirely when toggled off in profileVisibility', async () => {
    const repo = makeRepo({
      findByUsername: vi
        .fn()
        .mockResolvedValue(
          makeUser({ profileVisibility: { testsTaken: false, exposures: false } }),
        ),
    });
    const result = await makeService(repo).getPublicProfile('testuser');
    expect('testsTaken' in result).toBe(false);
    expect('exposuresActive' in result).toBe(false);
    expect('exposuresCompleted' in result).toBe(false);
    // unaffected fields remain
    expect(result.journeysCompleted).toBe(2);
    expect(result.challengesCompleted).toBe(1);
  });

  it('always keeps username + displayName regardless of visibility', async () => {
    const repo = makeRepo({
      findByUsername: vi
        .fn()
        .mockResolvedValue(makeUser({ profileVisibility: { avatar: false, memberSince: false } })),
    });
    const result = await makeService(repo).getPublicProfile('testuser');
    expect(result.username).toBe('testuser');
    expect(result.displayName).toBe('Test User');
    expect('avatarUrl' in result).toBe(false);
    expect('memberSince' in result).toBe(false);
  });
});

describe('UsersService — updateVisibility', () => {
  it('merges partial field updates with existing visibility', async () => {
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(makeUser({ profileVisibility: { testsTaken: false } })),
    });
    const service = makeService(repo);

    await service.updateVisibility('user-1', { profileVisibility: { exposures: false } });

    expect(repo.updateVisibility).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        profileVisibility: { testsTaken: false, exposures: false },
      }),
    );
  });

  it('passes through profilePrivate toggle', async () => {
    const repo = makeRepo();
    const service = makeService(repo);
    await service.updateVisibility('user-1', { profilePrivate: true });
    expect(repo.updateVisibility).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ profilePrivate: true }),
    );
  });
});

describe('UsersService — updateOwnProfile', () => {
  it('throws UserUsernameTakenException when username taken by another user', async () => {
    const repo = makeRepo({ isUsernameTaken: vi.fn().mockResolvedValue(true) });
    const service = makeService(repo);

    await expect(service.updateOwnProfile('user-1', { username: 'taken' })).rejects.toThrow(
      UserUsernameTakenException,
    );
  });

  it('succeeds when username is own current username (not taken by another)', async () => {
    const repo = makeRepo({ isUsernameTaken: vi.fn().mockResolvedValue(false) });
    const service = makeService(repo);

    await expect(
      service.updateOwnProfile('user-1', { username: 'testuser' }),
    ).resolves.not.toThrow();
    expect(repo.updateProfile).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ username: 'testuser' }),
    );
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

describe('UsersService — searchUsers', () => {
  const REQUESTER = { id: 'req-1' } as Parameters<UsersService['searchUsers']>[0];

  function makeSearchService(opts: {
    indexIds?: string[];
    substringIds?: string[];
    many?: Array<Record<string, unknown>>;
  }) {
    const service = Object.create(UsersService.prototype) as UsersService;
    const s = service as unknown as Record<string, unknown>;
    s['usersRepository'] = {
      findIdsBySubstring: vi.fn().mockResolvedValue(opts.substringIds ?? []),
      findManyByIds: vi.fn().mockResolvedValue(opts.many ?? []),
    };
    s['usersIndex'] = { search: vi.fn().mockResolvedValue(opts.indexIds ?? []) };
    s['followsService'] = {
      getStatus: vi.fn().mockResolvedValue({ isFollowing: false, followsYou: false }),
    };
    return service;
  }

  it('returns empty for a query shorter than 2 chars', async () => {
    const svc = makeSearchService({});
    expect(await svc.searchUsers(REQUESTER, 'a')).toEqual([]);
  });

  it('matches a partial email via the DB substring search, prepended before index hits', async () => {
    const svc = makeSearchService({
      substringIds: ['email-hit'],
      indexIds: ['fuzzy-hit'],
      many: [
        {
          id: 'email-hit',
          username: 'om',
          displayName: 'Om',
          avatarUrl: null,
          profilePrivate: false,
          showLastActive: false,
          showOnlineIndicator: false,
          lastActiveAt: null,
        },
        {
          id: 'fuzzy-hit',
          username: 'omkar',
          displayName: 'Omkar',
          avatarUrl: null,
          profilePrivate: false,
          showLastActive: false,
          showOnlineIndicator: false,
          lastActiveAt: null,
        },
      ],
    });
    // "om@exa" is a partial email — not a full valid address, so only the substring
    // path (not a strict email-format check) can match it.
    const res = await svc.searchUsers(REQUESTER, 'om@exa');
    expect(res.map((r) => r.username)).toEqual(['om', 'omkar']);
  });

  it('matches username/displayName via the DB baseline even when Meili yields nothing', async () => {
    const svc = makeSearchService({
      substringIds: ['pu'],
      indexIds: [],
      many: [
        {
          id: 'pu',
          username: 'purvi',
          displayName: 'Purvi',
          avatarUrl: null,
          profilePrivate: false,
          showLastActive: false,
          showOnlineIndicator: false,
          lastActiveAt: null,
        },
      ],
    });
    const res = await svc.searchUsers(REQUESTER, 'pu');
    expect(res.map((r) => r.username)).toEqual(['purvi']);
  });

  it('excludes private profiles from hydrated results', async () => {
    const svc = makeSearchService({
      indexIds: ['pub', 'priv'],
      many: [
        {
          id: 'pub',
          username: 'pub',
          displayName: 'Pub',
          avatarUrl: null,
          profilePrivate: false,
          showLastActive: false,
          showOnlineIndicator: false,
          lastActiveAt: null,
        },
        {
          id: 'priv',
          username: 'priv',
          displayName: 'Priv',
          avatarUrl: null,
          profilePrivate: true,
          showLastActive: false,
          showOnlineIndicator: false,
          lastActiveAt: null,
        },
      ],
    });
    const res = await svc.searchUsers(REQUESTER, 'pu');
    expect(res.map((r) => r.username)).toEqual(['pub']);
  });

  it('returns empty when neither the DB baseline nor the index yields a match', async () => {
    const svc = makeSearchService({ indexIds: [], substringIds: [] });
    expect(await svc.searchUsers(REQUESTER, 'zzz')).toEqual([]);
  });
});
