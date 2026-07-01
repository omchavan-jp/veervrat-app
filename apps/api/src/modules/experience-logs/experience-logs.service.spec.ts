import { describe, it, expect, vi } from 'vitest';
import { ExperienceVisibility, Role } from '@prisma/client';
import { ExperienceLogsService } from './experience-logs.service';
import {
  AccessDeniedException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import { BadRequestException } from '@nestjs/common';
import type { SessionUser } from '../auth/types/auth.types';

const baseUser: Omit<SessionUser, 'id' | 'roles'> = {
  email: 'u@example.com',
  displayName: 'U',
  username: 'u',
  language: 'EN',
  gender: null,
  dob: null,
  avatarUrl: null,
  emailVerifiedAt: new Date(),
  accountSetupCompletedAt: new Date(),
  onboardingCompletedAt: new Date(),
};

const VA: SessionUser = { ...baseUser, id: 'va-1', roles: [Role.VRATARTHI] };
const OTHER_VA: SessionUser = { ...baseUser, id: 'va-2', roles: [Role.VRATARTHI] };
const VM: SessionUser = { ...baseUser, id: 'vm-1', roles: [Role.VRATMITRA] };

const goodBody = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
};

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    create: vi
      .fn()
      .mockResolvedValue({ id: 'log-1', isDraft: true, visibility: ExperienceVisibility.ONLY_ME }),
    findSlim: vi.fn(),
    findById: vi.fn(),
    update: vi.fn().mockResolvedValue({ id: 'log-1' }),
    softDelete: vi.fn().mockResolvedValue({ id: 'log-1' }),
    findOwn: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    findPublicPool: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    ...overrides,
  } as any;
}

function makeJourneys(slim: any = null) {
  return { getJourneySlim: vi.fn().mockResolvedValue(slim) } as any;
}

function makeFollows(mutual = false) {
  return { areMutualFollows: vi.fn().mockResolvedValue(mutual) } as any;
}

const ownJourneySlim = {
  id: 'j1',
  vratarthiId: 'va-1',
  vmAssignments: [],
  globalVmRelationship: null,
};

describe('ExperienceLogsService', () => {
  describe('create', () => {
    it('creates a global draft for a VA (forced draft/only_me)', async () => {
      const repo = makeRepo();
      const service = new ExperienceLogsService(repo, makeJourneys(), makeFollows());
      await service.create(VA, { body: goodBody });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: 'va-1', journeyId: null }),
      );
    });

    it('NEGATIVE: rejects an empty/invalid body', async () => {
      const service = new ExperienceLogsService(makeRepo(), makeJourneys(), makeFollows());
      await expect(
        service.create(VA, { body: { type: 'doc', content: [] } }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("NEGATIVE: VA cannot create a journey-scoped entry on another VA's journey", async () => {
      const otherJourney = {
        id: 'j2',
        vratarthiId: 'va-2',
        vmAssignments: [],
        globalVmRelationship: null,
      };
      const service = new ExperienceLogsService(
        makeRepo(),
        makeJourneys(otherJourney),
        makeFollows(),
      );
      await expect(service.create(VA, { body: goodBody, journeyId: 'j2' })).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
    });

    it('creates a journey-scoped entry for the journey owner', async () => {
      const repo = makeRepo();
      const service = new ExperienceLogsService(repo, makeJourneys(ownJourneySlim), makeFollows());
      await service.create(VA, { body: goodBody, journeyId: 'j1' });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ journeyId: 'j1' }));
    });

    it('NEGATIVE: VM cannot create an experience log', async () => {
      const service = new ExperienceLogsService(makeRepo(), makeJourneys(), makeFollows());
      await expect(service.create(VM, { body: goodBody })).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
    });
  });

  describe('update / publish', () => {
    it('publishing a draft sets publishedAt and applies visibility', async () => {
      const repo = makeRepo({
        findSlim: vi.fn().mockResolvedValue({
          id: 'log-1',
          authorId: 'va-1',
          journeyId: null,
          visibility: ExperienceVisibility.ONLY_ME,
          isDraft: true,
        }),
      });
      const service = new ExperienceLogsService(repo, makeJourneys(), makeFollows());
      await service.update(VA, 'log-1', {
        isDraft: false,
        visibility: ExperienceVisibility.PUBLIC,
      });
      const arg = repo.update.mock.calls[0][1];
      expect(arg.isDraft).toBe(false);
      expect(arg.visibility).toBe(ExperienceVisibility.PUBLIC);
      expect(arg.publishedAt).toBeInstanceOf(Date);
    });

    it('NEGATIVE: non-author cannot edit', async () => {
      const repo = makeRepo({
        findSlim: vi.fn().mockResolvedValue({
          id: 'log-1',
          authorId: 'va-1',
          journeyId: null,
          visibility: ExperienceVisibility.ONLY_ME,
          isDraft: false,
        }),
      });
      const service = new ExperienceLogsService(repo, makeJourneys(), makeFollows());
      await expect(
        service.update(OTHER_VA, 'log-1', { visibility: ExperienceVisibility.PUBLIC }),
      ).rejects.toBeInstanceOf(AccessDeniedException);
    });
  });

  describe('remove', () => {
    it('author soft-deletes own entry', async () => {
      const repo = makeRepo({
        findSlim: vi.fn().mockResolvedValue({
          id: 'log-1',
          authorId: 'va-1',
          journeyId: null,
          visibility: ExperienceVisibility.ONLY_ME,
          isDraft: false,
        }),
      });
      const service = new ExperienceLogsService(repo, makeJourneys(), makeFollows());
      await service.remove(VA, 'log-1');
      expect(repo.softDelete).toHaveBeenCalledWith('log-1');
    });

    it('NEGATIVE: non-author cannot delete', async () => {
      const repo = makeRepo({
        findSlim: vi.fn().mockResolvedValue({
          id: 'log-1',
          authorId: 'va-1',
          journeyId: null,
          visibility: ExperienceVisibility.ONLY_ME,
          isDraft: false,
        }),
      });
      const service = new ExperienceLogsService(repo, makeJourneys(), makeFollows());
      await expect(service.remove(OTHER_VA, 'log-1')).rejects.toBeInstanceOf(AccessDeniedException);
    });
  });

  describe('getOne (visibility)', () => {
    const publicEntry = {
      id: 'log-1',
      authorId: 'va-1',
      journeyId: null,
      visibility: ExperienceVisibility.PUBLIC,
      isDraft: false,
    };
    const onlyMeEntry = {
      id: 'log-1',
      authorId: 'va-1',
      journeyId: null,
      visibility: ExperienceVisibility.ONLY_ME,
      isDraft: false,
    };

    it('anyone reads a public entry', async () => {
      const repo = makeRepo({ findById: vi.fn().mockResolvedValue(publicEntry) });
      const service = new ExperienceLogsService(repo, makeJourneys(), makeFollows());
      await expect(service.getOne(OTHER_VA, 'log-1')).resolves.toEqual(publicEntry);
    });

    it('guest reads a public entry', async () => {
      const repo = makeRepo({ findById: vi.fn().mockResolvedValue(publicEntry) });
      const service = new ExperienceLogsService(repo, makeJourneys(), makeFollows());
      await expect(service.getOne(undefined, 'log-1')).resolves.toEqual(publicEntry);
    });

    it('NEGATIVE: guest cannot read an only-me entry (404, no leak)', async () => {
      const repo = makeRepo({ findById: vi.fn().mockResolvedValue(onlyMeEntry) });
      const service = new ExperienceLogsService(repo, makeJourneys(), makeFollows());
      await expect(service.getOne(undefined, 'log-1')).rejects.toBeInstanceOf(
        EntityNotFoundException,
      );
    });

    it('NEGATIVE: third-party cannot read an only-me entry', async () => {
      const repo = makeRepo({ findById: vi.fn().mockResolvedValue(onlyMeEntry) });
      const service = new ExperienceLogsService(repo, makeJourneys(), makeFollows());
      await expect(service.getOne(OTHER_VA, 'log-1')).rejects.toBeInstanceOf(
        EntityNotFoundException,
      );
    });

    it('author reads own only-me entry', async () => {
      const repo = makeRepo({ findById: vi.fn().mockResolvedValue(onlyMeEntry) });
      const service = new ExperienceLogsService(repo, makeJourneys(), makeFollows());
      await expect(service.getOne(VA, 'log-1')).resolves.toEqual(onlyMeEntry);
    });

    const friendsEntry = {
      id: 'log-1',
      authorId: 'va-1',
      journeyId: null,
      visibility: ExperienceVisibility.FRIENDS,
      isDraft: false,
    };

    it('mutual follower reads a FRIENDS entry', async () => {
      const repo = makeRepo({ findById: vi.fn().mockResolvedValue(friendsEntry) });
      const service = new ExperienceLogsService(repo, makeJourneys(), makeFollows(true));
      await expect(service.getOne(OTHER_VA, 'log-1')).resolves.toEqual(friendsEntry);
    });

    it('NEGATIVE: non-mutual viewer cannot read a FRIENDS entry', async () => {
      const repo = makeRepo({ findById: vi.fn().mockResolvedValue(friendsEntry) });
      const service = new ExperienceLogsService(repo, makeJourneys(), makeFollows(false));
      await expect(service.getOne(OTHER_VA, 'log-1')).rejects.toBeInstanceOf(
        EntityNotFoundException,
      );
    });
  });
});
