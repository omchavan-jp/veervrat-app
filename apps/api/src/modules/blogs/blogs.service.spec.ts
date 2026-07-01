import { describe, it, expect, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BlogsService } from './blogs.service';
import {
  AccessDeniedException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const base: Omit<SessionUser, 'id' | 'roles'> = {
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
const AUTHOR: SessionUser = { ...base, id: 'author-1', roles: [Role.VRATARTHI] };
const OTHER: SessionUser = { ...base, id: 'other-1', roles: [Role.VRATARTHI] };
const MOD: SessionUser = { ...base, id: 'mod-1', roles: [Role.MODERATOR] };

const goodBody = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
};

function makeRepo(o: Record<string, any> = {}) {
  return {
    create: vi.fn().mockResolvedValue({
      id: 'b1',
      isDraft: true,
      title: 'T',
      body: goodBody,
      authorId: 'author-1',
    }),
    findById: vi.fn().mockResolvedValue({
      id: 'b1',
      authorId: 'author-1',
      isDraft: false,
      title: 'T',
      body: goodBody,
    }),
    update: vi.fn().mockResolvedValue({
      id: 'b1',
      isDraft: false,
      title: 'T',
      body: goodBody,
      authorId: 'author-1',
    }),
    softDelete: vi.fn().mockResolvedValue({ id: 'b1' }),
    findPublishedList: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    findManyPublishedByIds: vi.fn().mockResolvedValue([]),
    createComment: vi.fn().mockResolvedValue({ id: 'c1' }),
    findCommentById: vi.fn().mockResolvedValue({
      id: 'c1',
      blogId: 'b1',
      authorId: 'other-1',
      isHidden: false,
      reportedAt: null,
    }),
    listComments: vi.fn().mockResolvedValue([]),
    softDeleteComment: vi.fn().mockResolvedValue({ id: 'c1' }),
    hideComment: vi.fn().mockResolvedValue({ id: 'c1', isHidden: true }),
    markCommentReported: vi.fn().mockResolvedValue({ id: 'c1', reportedAt: new Date() }),
    findModeratorIds: vi.fn().mockResolvedValue(['mod-1']),
    ...o,
  } as any;
}
const makeIndex = () =>
  ({ upsert: vi.fn(), remove: vi.fn(), search: vi.fn().mockResolvedValue([]) }) as any;
const makeNotif = () => ({ create: vi.fn().mockResolvedValue(undefined) }) as any;

describe('BlogsService', () => {
  describe('blogs', () => {
    it('creates a draft (sanitized)', async () => {
      const repo = makeRepo();
      const svc = new BlogsService(repo, makeIndex(), makeNotif());
      await svc.create(AUTHOR, { title: 'T', body: goodBody });
      expect(repo.create).toHaveBeenCalledWith(
        'author-1',
        'T',
        expect.objectContaining({ type: 'doc' }),
      );
    });

    it('NEGATIVE: empty body rejected', async () => {
      const svc = new BlogsService(makeRepo(), makeIndex(), makeNotif());
      await expect(
        svc.create(AUTHOR, { title: 'T', body: { type: 'doc', content: [] } }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('publish sets publishedAt and indexes', async () => {
      const repo = makeRepo({
        findById: vi.fn().mockResolvedValue({
          id: 'b1',
          authorId: 'author-1',
          isDraft: true,
          title: 'T',
          body: goodBody,
        }),
      });
      const index = makeIndex();
      const svc = new BlogsService(repo, index, makeNotif());
      await svc.update(AUTHOR, 'b1', { isDraft: false });
      expect(repo.update.mock.calls[0][1].publishedAt).toBeInstanceOf(Date);
      expect(index.upsert).toHaveBeenCalled();
    });

    it('NEGATIVE: non-author cannot edit', async () => {
      const svc = new BlogsService(makeRepo(), makeIndex(), makeNotif());
      await expect(svc.update(OTHER, 'b1', { title: 'X' })).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
    });

    it('delete removes from index', async () => {
      const index = makeIndex();
      const svc = new BlogsService(makeRepo(), index, makeNotif());
      await svc.remove(AUTHOR, 'b1');
      expect(index.remove).toHaveBeenCalledWith('b1');
    });

    it('NEGATIVE: draft not readable by others', async () => {
      const repo = makeRepo({
        findById: vi.fn().mockResolvedValue({
          id: 'b1',
          authorId: 'author-1',
          isDraft: true,
          title: 'T',
          body: goodBody,
        }),
      });
      const svc = new BlogsService(repo, makeIndex(), makeNotif());
      await expect(svc.getOne(OTHER, 'b1')).rejects.toBeInstanceOf(EntityNotFoundException);
    });
  });

  describe('comments', () => {
    it('adds a comment + notifies blog author', async () => {
      const repo = makeRepo();
      const notif = makeNotif();
      const svc = new BlogsService(repo, makeIndex(), notif);
      await svc.addComment(OTHER, 'b1', 'nice');
      expect(repo.createComment).toHaveBeenCalledWith('b1', 'other-1', 'nice');
      expect(notif.create).toHaveBeenCalledWith(
        'author-1',
        'other-1',
        'BLOG_COMMENT_NEW',
        'blog',
        'b1',
      );
    });

    it('comment author deletes own comment', async () => {
      const repo = makeRepo({
        findCommentById: vi.fn().mockResolvedValue({
          id: 'c1',
          blogId: 'b1',
          authorId: 'other-1',
          isHidden: false,
          reportedAt: null,
        }),
      });
      const svc = new BlogsService(repo, makeIndex(), makeNotif());
      await svc.deleteComment(OTHER, 'b1', 'c1');
      expect(repo.softDeleteComment).toHaveBeenCalledWith('c1');
    });

    it('moderator deletes any comment', async () => {
      const repo = makeRepo();
      const svc = new BlogsService(repo, makeIndex(), makeNotif());
      await svc.deleteComment(MOD, 'b1', 'c1');
      expect(repo.softDeleteComment).toHaveBeenCalled();
    });

    it('NEGATIVE: unrelated user cannot delete', async () => {
      const stranger: SessionUser = { ...base, id: 'stranger', roles: [Role.VRATARTHI] };
      const svc = new BlogsService(makeRepo(), makeIndex(), makeNotif());
      await expect(svc.deleteComment(stranger, 'b1', 'c1')).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
    });

    it('blog author hides a comment', async () => {
      const repo = makeRepo();
      const svc = new BlogsService(repo, makeIndex(), makeNotif());
      await svc.hideComment(AUTHOR, 'b1', 'c1');
      expect(repo.hideComment).toHaveBeenCalledWith('c1', 'author-1');
    });

    it('report flags + notifies moderators', async () => {
      const repo = makeRepo();
      const notif = makeNotif();
      const svc = new BlogsService(repo, makeIndex(), notif);
      await svc.reportComment(OTHER, 'b1', 'c1');
      expect(repo.markCommentReported).toHaveBeenCalledWith('c1');
      expect(notif.create).toHaveBeenCalledWith(
        'mod-1',
        'other-1',
        'COMMENT_REPORTED',
        'blog_comment',
        'c1',
      );
    });

    it('report is idempotent (already reported)', async () => {
      const repo = makeRepo({
        findCommentById: vi.fn().mockResolvedValue({
          id: 'c1',
          blogId: 'b1',
          authorId: 'other-1',
          isHidden: false,
          reportedAt: new Date(),
        }),
      });
      const notif = makeNotif();
      const svc = new BlogsService(repo, makeIndex(), notif);
      await svc.reportComment(OTHER, 'b1', 'c1');
      expect(repo.markCommentReported).not.toHaveBeenCalled();
      expect(notif.create).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('returns empty for <2 chars', async () => {
      const svc = new BlogsService(makeRepo(), makeIndex(), makeNotif());
      expect(await svc.search('a')).toEqual([]);
    });

    it('hydrates index hits in order', async () => {
      const index = makeIndex();
      index.search = vi.fn().mockResolvedValue(['b2', 'b1']);
      const repo = makeRepo({
        findManyPublishedByIds: vi.fn().mockResolvedValue([
          { id: 'b1', title: 'One' },
          { id: 'b2', title: 'Two' },
        ]),
      });
      const svc = new BlogsService(repo, index, makeNotif());
      const res = await svc.search('veer');
      expect(res.map((b: any) => b.id)).toEqual(['b2', 'b1']);
    });
  });
});
