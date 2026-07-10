import { describe, it, expect, vi } from 'vitest';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ContentOverridesService } from './content-overrides.service';
import { AccessDeniedException, ValidationException } from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const EDITOR_ID = 'editor-1';

function makeUser(id = EDITOR_ID, roles: Role[] = [Role.VRATARTHI]): SessionUser {
  return {
    id,
    email: 'u@test.com',
    displayName: 'U',
    username: 'u',
    roles,
    language: 'EN',
    gender: null,
    dob: null,
    avatarUrl: null,
    emailVerifiedAt: new Date(),
  } as SessionUser;
}

function makeRepo(over: Record<string, unknown> = {}) {
  return {
    readLocale: vi.fn().mockResolvedValue({}),
    readAll: vi.fn().mockResolvedValue({ en: {}, mr: {} }),
    writeLocale: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
}

function makePublisher(over: Record<string, unknown> = {}) {
  return {
    configured: true,
    getMessageFiles: vi.fn().mockResolvedValue({ en: {}, mr: {} }),
    openPullRequest: vi.fn().mockResolvedValue({
      prUrl: 'https://github.com/veer-vrat/veervrat-app/pull/1',
      branch: 'content/edits-1',
    }),
    ...over,
  };
}

function makeConfig(values: Record<string, unknown>) {
  return { get: (key: string, def?: unknown) => (key in values ? values[key] : def) };
}

function makeService(
  opts: {
    enabled?: boolean;
    editorIds?: string;
    repo?: ReturnType<typeof makeRepo>;
    publisher?: ReturnType<typeof makePublisher>;
  } = {},
) {
  const repo = opts.repo ?? makeRepo();
  const publisher = opts.publisher ?? makePublisher();
  const config = makeConfig({
    CONTENT_EDIT_ENABLED: opts.enabled ?? true,
    CONTENT_EDITOR_USER_IDS: opts.editorIds ?? EDITOR_ID,
  });
  const service = new ContentOverridesService(repo as any, publisher as any, config as any);
  return { service, repo, publisher };
}

describe('ContentOverridesService', () => {
  describe('feature gate', () => {
    it('behaves as not-found when disabled', async () => {
      const { service, repo, publisher } = makeService({ enabled: false });
      await expect(service.getAllForMerge(makeUser())).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.upsert(makeUser(), { key: 'a.b', locale: 'en', value: 'x', baseValue: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.publish(makeUser())).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.writeLocale).not.toHaveBeenCalled();
      expect(publisher.openPullRequest).not.toHaveBeenCalled();
    });

    it('returns staged overrides for an allowlisted editor', async () => {
      const readAll = vi.fn().mockResolvedValue({ en: { 'a.b': 'Hi' }, mr: {} });
      const { service } = makeService({ repo: makeRepo({ readAll }) });
      await expect(service.getAllForMerge(makeUser())).resolves.toEqual({
        en: { 'a.b': 'Hi' },
        mr: {},
      });
    });

    it('denies a non-allowlisted user from reading staged overrides', async () => {
      const { service } = makeService({ editorIds: 'someone-else' });
      await expect(service.getAllForMerge(makeUser('outsider'))).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
    });
  });

  describe('upsert (content.edit)', () => {
    it('stages an edit for an allowlisted editor', async () => {
      const { service, repo } = makeService();
      const res = await service.upsert(makeUser(), {
        key: 'feedback.buttonLabel',
        locale: 'mr',
        value: 'Navīn',
        baseValue: 'Junā',
      });
      expect(res).toEqual({ key: 'feedback.buttonLabel', locale: 'mr' });
      expect(repo.writeLocale).toHaveBeenCalledWith('mr', { 'feedback.buttonLabel': 'Navīn' });
    });

    it('denies a non-allowlisted authenticated user', async () => {
      const { service, repo } = makeService({ editorIds: 'someone-else' });
      await expect(
        service.upsert(makeUser('outsider'), {
          key: 'a.b',
          locale: 'en',
          value: 'x',
          baseValue: 'y',
        }),
      ).rejects.toBeInstanceOf(AccessDeniedException);
      expect(repo.writeLocale).not.toHaveBeenCalled();
    });

    it('denies an admin who is not on the allowlist (least privilege)', async () => {
      const { service } = makeService({ editorIds: EDITOR_ID });
      await expect(
        service.upsert(makeUser('admin-x', [Role.ADMIN]), {
          key: 'a.b',
          locale: 'en',
          value: 'x',
          baseValue: 'y',
        }),
      ).rejects.toBeInstanceOf(AccessDeniedException);
    });

    it('rejects an edit that changes the ICU placeholders', async () => {
      const { service, repo } = makeService();
      await expect(
        service.upsert(makeUser(), {
          key: 'welcome',
          locale: 'en',
          value: 'Hello there',
          baseValue: 'Hello {name}',
        }),
      ).rejects.toBeInstanceOf(ValidationException);
      expect(repo.writeLocale).not.toHaveBeenCalled();
    });

    it('allows an edit that preserves the ICU placeholders', async () => {
      const { service, repo } = makeService();
      await service.upsert(makeUser(), {
        key: 'welcome',
        locale: 'en',
        value: 'Hi {name}!',
        baseValue: 'Hello {name}',
      });
      expect(repo.writeLocale).toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('opens a PR with the merged files for an allowlisted editor', async () => {
      const repo = makeRepo({
        readAll: vi.fn().mockResolvedValue({ en: { 'a.b': 'New' }, mr: {} }),
      });
      const publisher = makePublisher({
        getMessageFiles: vi.fn().mockResolvedValue({ en: { a: { b: 'Old' } }, mr: {} }),
      });
      const { service } = makeService({ repo, publisher });

      const res = await service.publish(makeUser());
      expect(res.prUrl).toContain('/pull/');
      expect(publisher.openPullRequest).toHaveBeenCalledTimes(1);
      const arg = publisher.openPullRequest.mock.calls[0][0] as { files: { path: string }[] };
      expect(arg.files.map((f) => f.path)).toContain('apps/web/messages/en.json');
    });

    it('denies a non-allowlisted user', async () => {
      const { service, publisher } = makeService({ editorIds: 'someone-else' });
      await expect(service.publish(makeUser('outsider'))).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
      expect(publisher.openPullRequest).not.toHaveBeenCalled();
    });

    it('rejects when there are no staged edits', async () => {
      const { service } = makeService(); // readAll defaults to empty maps
      await expect(service.publish(makeUser())).rejects.toBeInstanceOf(ValidationException);
    });

    it('refuses to open a PR when an override breaks placeholders vs the git baseline', async () => {
      const repo = makeRepo({
        readAll: vi.fn().mockResolvedValue({ en: { greeting: 'Hi' }, mr: {} }),
      });
      const publisher = makePublisher({
        getMessageFiles: vi.fn().mockResolvedValue({ en: { greeting: 'Hi {name}' }, mr: {} }),
      });
      const { service } = makeService({ repo, publisher });
      await expect(service.publish(makeUser())).rejects.toBeInstanceOf(ValidationException);
      expect(publisher.openPullRequest).not.toHaveBeenCalled();
    });

    it('fails clearly when publishing is not configured', async () => {
      const repo = makeRepo({
        readAll: vi.fn().mockResolvedValue({ en: { 'a.b': 'New' }, mr: {} }),
      });
      const publisher = makePublisher({ configured: false });
      const { service } = makeService({ repo, publisher });
      await expect(service.publish(makeUser())).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
