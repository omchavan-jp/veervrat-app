import { describe, it, expect, vi } from 'vitest';
import { Capability, Role, FeedbackStatus, FeedbackType } from '@prisma/client';
import { FeedbackService } from './feedback.service';
import {
  AccessDeniedException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const ITEM_ID = '11111111-1111-4111-8111-111111111111';

function makeUser(roles: Role[] = [Role.VRATARTHI]): SessionUser {
  return {
    id: 'user-1',
    email: 'u@test.com',
    displayName: 'User One',
    username: 'userone',
    roles,
    language: 'EN',
    gender: null,
    dob: null,
    avatarUrl: null,
    emailVerifiedAt: new Date(),
  } as SessionUser;
}

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    type: FeedbackType.ISSUE,
    status: FeedbackStatus.NEW,
    title: 'Toggle broken',
    description: null,
    route: '/dashboard',
    locale: 'mr',
    commitSha: 'abc123',
    declineReason: null,
    doneNote: null,
    createdAt: new Date('2026-07-04T00:00:00Z'),
    reporter: { id: 'user-1', displayName: 'User One' },
    upvoteCount: 0,
    hasUpvoted: false,
    ...overrides,
  };
}

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    create: vi.fn().mockResolvedValue(makeRecord()),
    list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    findById: vi.fn().mockResolvedValue({ id: ITEM_ID, status: FeedbackStatus.NEW }),
    toggleUpvote: vi.fn().mockResolvedValue({ hasUpvoted: true, upvoteCount: 1 }),
    updateStatus: vi.fn().mockResolvedValue(makeRecord({ status: FeedbackStatus.DONE })),
    ...overrides,
  };
}

function makeCapabilities(mode: 'off' | 'all' | 'granted' = 'all', grants: string[] = []) {
  return {
    grantsFor: vi.fn().mockResolvedValue(grants),
    featureMode: vi.fn().mockReturnValue(mode),
  };
}

function makeService(repoOverrides: Record<string, unknown> = {}, caps = makeCapabilities()) {
  const repo = makeRepo(repoOverrides);

  return { service: new FeedbackService(repo as any, caps as any), repo, caps };
}

describe('FeedbackService', () => {
  describe('create', () => {
    it('stamps reporter identity and role snapshot from the session', async () => {
      const { service, repo } = makeService();
      const user = makeUser([Role.VRATARTHI, Role.VRATMITRA]);

      await service.create(user, { type: FeedbackType.ISSUE, title: 'T' }, 'Mozilla/5.0');

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reporterId: 'user-1',
          reporterRole: 'VRATARTHI,VRATMITRA',
          userAgent: 'Mozilla/5.0',
        }),
        'user-1',
      );
    });

    it('truncates user agent to 300 chars', async () => {
      const { service, repo } = makeService();
      await service.create(makeUser(), { type: FeedbackType.ISSUE, title: 'T' }, 'x'.repeat(500));
      const arg = repo.create.mock.calls[0][0] as { userAgent: string };
      expect(arg.userAgent).toHaveLength(300);
    });

    it.each([FeedbackType.MODIFICATION, FeedbackType.ADDITION])(
      'accepts the %s type',
      async (type) => {
        const { service, repo } = makeService();
        await service.create(makeUser(), { type, title: 'T' }, undefined);
        expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ type }), 'user-1');
      },
    );
  });

  describe('toggleUpvote', () => {
    it('404s on a missing item', async () => {
      const { service } = makeService({ findById: vi.fn().mockResolvedValue(null) });
      await expect(service.toggleUpvote(makeUser(), ITEM_ID)).rejects.toBeInstanceOf(
        EntityNotFoundException,
      );
    });

    it('returns the toggle result', async () => {
      const { service } = makeService();
      await expect(service.toggleUpvote(makeUser(), ITEM_ID)).resolves.toEqual({
        hasUpvoted: true,
        upvoteCount: 1,
      });
    });
  });

  describe('updateStatus (feedback.manage)', () => {
    it('denies non-admin roles', async () => {
      const { service, repo } = makeService();
      for (const roles of [[Role.VRATARTHI], [Role.VRATMITRA], [Role.MODERATOR]]) {
        await expect(
          service.updateStatus(makeUser(roles), ITEM_ID, { status: FeedbackStatus.TRIAGED }),
        ).rejects.toBeInstanceOf(AccessDeniedException);
      }
      expect(repo.updateStatus).not.toHaveBeenCalled();
    });

    it('allows admin, requires a doneNote when marking done, includes previous status for auditing', async () => {
      const { service, repo } = makeService();
      const result = await service.updateStatus(makeUser([Role.ADMIN]), ITEM_ID, {
        status: FeedbackStatus.DONE,
        doneNote: 'Shipped in PR #42',
      });
      expect(repo.updateStatus).toHaveBeenCalledWith(
        ITEM_ID,
        FeedbackStatus.DONE,
        { declineReason: null, doneNote: 'Shipped in PR #42' },
        'user-1',
      );
      expect(result.previousStatus).toBe(FeedbackStatus.NEW);
    });

    it('persists the decline reason only when declining, doneNote only when done', async () => {
      const { service, repo } = makeService();
      await service.updateStatus(makeUser([Role.ADMIN]), ITEM_ID, {
        status: FeedbackStatus.DECLINED,
        declineReason: 'Duplicate',
      });
      expect(repo.updateStatus).toHaveBeenCalledWith(
        ITEM_ID,
        FeedbackStatus.DECLINED,
        { declineReason: 'Duplicate', doneNote: null },
        'user-1',
      );

      await service.updateStatus(makeUser([Role.ADMIN]), ITEM_ID, {
        status: FeedbackStatus.TRIAGED,
        declineReason: 'should be ignored',
      });
      expect(repo.updateStatus).toHaveBeenLastCalledWith(
        ITEM_ID,
        FeedbackStatus.TRIAGED,
        { declineReason: null, doneNote: null },
        'user-1',
      );

      await service.updateStatus(makeUser([Role.ADMIN]), ITEM_ID, {
        status: FeedbackStatus.DONE,
        doneNote: 'Fixed',
        declineReason: 'should be ignored',
      });
      expect(repo.updateStatus).toHaveBeenLastCalledWith(
        ITEM_ID,
        FeedbackStatus.DONE,
        { declineReason: null, doneNote: 'Fixed' },
        'user-1',
      );
    });

    it('404s on a missing item', async () => {
      const { service } = makeService({ findById: vi.fn().mockResolvedValue(null) });
      await expect(
        service.updateStatus(makeUser([Role.ADMIN]), ITEM_ID, { status: FeedbackStatus.DONE }),
      ).rejects.toBeInstanceOf(EntityNotFoundException);
    });
  });

  describe('auth matrix — feedback permission rows', () => {
    // Positive + negative per row (create/read/upvote: any authenticated role; manage: admin only)
    it.each([[Role.VRATARTHI], [Role.VRATMITRA], [Role.MODERATOR], [Role.ADMIN]])(
      'create/read/upvote allowed for %s',
      async (role) => {
        const { service } = makeService();
        const user = makeUser([role]);
        await expect(
          service.create(user, { type: FeedbackType.IMPROVEMENT, title: 'T' }, undefined),
        ).resolves.toBeDefined();
        await expect(service.list(user, false)).resolves.toBeDefined();
        await expect(service.toggleUpvote(user, ITEM_ID)).resolves.toBeDefined();
      },
    );

    it('manage allowed for admin, denied for all other roles', async () => {
      const { service } = makeService();
      await expect(
        service.updateStatus(makeUser([Role.ADMIN]), ITEM_ID, { status: FeedbackStatus.TRIAGED }),
      ).resolves.toBeDefined();
      await expect(
        service.updateStatus(makeUser([Role.VRATARTHI, Role.VRATMITRA]), ITEM_ID, {
          status: FeedbackStatus.TRIAGED,
        }),
      ).rejects.toBeInstanceOf(AccessDeniedException);
    });
  });
});

// ── The cosmetic-gating regression guard ─────────────────────────────────────
//
// Until 2026-08-21 the feedback widget was hidden by FEEDBACK_MODE on the WEB container, while
// the API granted feedback.* to any authenticated user. The control was hidden, not denied:
// anyone signed in could call the API directly.
//
// These assert the SERVICE refuses — deliberately not that the widget is hidden. A test that
// only checks the UI would have passed throughout the entire period the bug existed.

describe('FeedbackService — server-side capability enforcement', () => {
  const user = makeUser([Role.VRATARTHI]);

  it('refuses create for an ungranted user when the mode is `granted`', async () => {
    const { service, repo } = makeService({}, makeCapabilities('granted', []));

    await expect(
      service.create(user, { type: FeedbackType.ISSUE, title: 'T' }, 'ua'),
    ).rejects.toThrow();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('refuses read for an ungranted user when the mode is `granted`', async () => {
    const { service, repo } = makeService({}, makeCapabilities('granted', []));

    await expect(service.list(user, false)).rejects.toThrow();
    expect(repo.list).not.toHaveBeenCalled();
  });

  it('refuses upvote for an ungranted user when the mode is `granted`', async () => {
    const { service, repo } = makeService({}, makeCapabilities('granted', []));

    await expect(service.toggleUpvote(user, 'item-1')).rejects.toThrow();
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('allows a granted user when the mode is `granted`', async () => {
    const { service, repo } = makeService(
      {},
      makeCapabilities('granted', [Capability.FEEDBACK_WIDGET]),
    );

    await service.create(user, { type: FeedbackType.ISSUE, title: 'T' }, 'ua');
    expect(repo.create).toHaveBeenCalled();
  });

  it('refuses everyone when the environment has feedback off', async () => {
    const { service, repo } = makeService(
      {},
      makeCapabilities('off', [Capability.FEEDBACK_WIDGET]),
    );

    await expect(
      service.create(user, { type: FeedbackType.ISSUE, title: 'T' }, 'ua'),
    ).rejects.toThrow();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('reads grants per request, so a revoke takes effect without re-login', async () => {
    const caps = makeCapabilities('granted', [Capability.FEEDBACK_WIDGET]);
    const { service } = makeService({}, caps);

    await service.create(user, { type: FeedbackType.ISSUE, title: 'T' }, 'ua');
    expect(caps.grantsFor).toHaveBeenCalledWith(user.id);
  });
});
