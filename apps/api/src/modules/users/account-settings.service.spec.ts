import { describe, it, expect, vi } from 'vitest';
import { UsersService } from './users.service';
import { InvalidCredentialsException } from '../../common/exceptions/app.exceptions';
import { parseNotificationPrefs } from './notification-prefs';

// Manual injection (mirrors users.service.spec) — construct the prototype and set fields.
function makeService(parts: {
  repo?: Record<string, unknown>;
  auth?: Record<string, unknown>;
  index?: Record<string, unknown>;
}) {
  const service = Object.create(UsersService.prototype) as UsersService;
  const s = service as unknown as Record<string, unknown>;
  s['usersRepository'] = {
    findById: vi.fn().mockResolvedValue({ id: 'u1', notificationPrefs: {} }),
    updateSettings: vi.fn().mockResolvedValue({
      id: 'u1',
      email: 'u@x.com',
      displayName: 'U',
      username: 'u',
      avatarUrl: null,
      gender: null,
      dob: null,
      language: 'EN',
      showLastActive: true,
      showOnlineIndicator: true,
      profilePrivate: false,
      profileVisibility: {},
      notificationPrefs: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    anonymise: vi.fn().mockResolvedValue({ id: 'u1', anonymisedAt: new Date() }),
    cancelPendingInvitations: vi.fn().mockResolvedValue({ count: 0 }),
    setTourReset: vi.fn().mockResolvedValue({
      id: 'u1',
      email: 'u@x.com',
      displayName: 'U',
      username: 'u',
      avatarUrl: null,
      gender: null,
      dob: null,
      language: 'EN',
      showLastActive: true,
      showOnlineIndicator: true,
      profilePrivate: false,
      profileVisibility: {},
      notificationPrefs: {},
      tourResetAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    ...parts.repo,
  };
  s['usersIndex'] = { upsert: vi.fn(), remove: vi.fn(), search: vi.fn() };
  if (parts.index) Object.assign(s['usersIndex'] as object, parts.index);
  s['authService'] = {
    forceLogout: vi.fn().mockResolvedValue(undefined),
    verifyPassword: vi.fn().mockResolvedValue(true),
    ...parts.auth,
  };
  return { service, s };
}

describe('UsersService — settings', () => {
  it('updateSettings merges notificationPrefs and re-syncs the index', async () => {
    const { service, s } = makeService({});
    await service.updateSettings('u1', {
      profilePrivate: true,
      notificationPrefs: { JOURNEY_DORMANT: false },
    });
    const repo = s['usersRepository'] as Record<string, ReturnType<typeof vi.fn>>;
    expect(repo['updateSettings']).toHaveBeenCalled();
    expect(
      (s['usersIndex'] as Record<string, ReturnType<typeof vi.fn>>)['upsert'],
    ).toHaveBeenCalled();
  });
});

describe('UsersService — anonymiseAccount', () => {
  it('replaces PII, force-logs-out, cancels invites, drops from index', async () => {
    const { service, s } = makeService({});
    await service.anonymiseAccount('11111111-1111-1111-1111-111111111111');
    const repo = s['usersRepository'] as Record<string, ReturnType<typeof vi.fn>>;
    expect(repo['anonymise']).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      expect.objectContaining({ displayName: '[Deleted user]' }),
      expect.any(Date),
    );
    expect(
      (s['authService'] as Record<string, ReturnType<typeof vi.fn>>)['forceLogout'],
    ).toHaveBeenCalled();
    expect(repo['cancelPendingInvitations']).toHaveBeenCalled();
    expect(
      (s['usersIndex'] as Record<string, ReturnType<typeof vi.fn>>)['remove'],
    ).toHaveBeenCalled();
  });
});

describe('UsersService — selfDelete', () => {
  it('anonymises when the password is correct', async () => {
    const { service, s } = makeService({
      auth: { verifyPassword: vi.fn().mockResolvedValue(true) },
    });
    await service.selfDelete('u1', 'correct');
    expect(
      (s['usersRepository'] as Record<string, ReturnType<typeof vi.fn>>)['anonymise'],
    ).toHaveBeenCalled();
  });

  it('rejects a wrong password without anonymising', async () => {
    const { service, s } = makeService({
      auth: { verifyPassword: vi.fn().mockResolvedValue(false) },
    });
    await expect(service.selfDelete('u1', 'wrong')).rejects.toBeInstanceOf(
      InvalidCredentialsException,
    );
    expect(
      (s['usersRepository'] as Record<string, ReturnType<typeof vi.fn>>)['anonymise'],
    ).not.toHaveBeenCalled();
  });
});

describe('UsersService — restartTour', () => {
  it('sets tourResetAt without resetting onboarding', async () => {
    const { service, s } = makeService({});
    const result = await service.restartTour('u1');
    expect(
      (s['usersRepository'] as Record<string, ReturnType<typeof vi.fn>>)['setTourReset'],
    ).toHaveBeenCalledWith('u1', expect.any(Date));
    expect(result.tourResetAt).not.toBeNull();
  });
});

describe('parseNotificationPrefs', () => {
  it('keeps known emailable keys with boolean values', () => {
    expect(parseNotificationPrefs({ JOURNEY_DORMANT: false, CUSTOM_ERC_APPROVED: true })).toEqual({
      JOURNEY_DORMANT: false,
      CUSTOM_ERC_APPROVED: true,
    });
  });

  it('drops unknown keys, non-booleans, and in-app-only events', () => {
    expect(
      parseNotificationPrefs({ NEW_FOLLOWER: false, BOGUS: true, JOURNEY_DORMANT: 'no' }),
    ).toEqual({});
  });
});
