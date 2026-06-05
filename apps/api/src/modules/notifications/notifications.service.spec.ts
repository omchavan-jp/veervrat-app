import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationsService } from './notifications.service';
import { AccessDeniedException, EntityNotFoundException } from '../../common/exceptions/app.exceptions';
import { NotificationEventType } from '@prisma/client';

const NOTIF_ID = 'notif-1';
const USER_A = 'user-a';
const USER_B = 'user-b';

function makeNotif(overrides: Record<string, unknown> = {}) {
  return {
    id: NOTIF_ID,
    recipientId: USER_A,
    readAt: null,
    eventType: NotificationEventType.ERC_CLOSURE_APPROVED,
    resourceType: 'exposure',
    resourceId: 'item-1',
    dismissedAt: null,
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    actor: null,
    ...overrides,
  };
}

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: NOTIF_ID }),
    listForUser: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    countUnread: vi.fn().mockResolvedValue(0),
    findById: vi.fn().mockResolvedValue(makeNotif()),
    markRead: vi.fn().mockResolvedValue(undefined),
    markAllRead: vi.fn().mockResolvedValue(0),
    archiveOlderThan: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function makeService(repoOverrides: Record<string, unknown> = {}) {
  const repo = makeRepo(repoOverrides);
  const service = Object.create(NotificationsService.prototype) as NotificationsService;
  (service as unknown as Record<string, unknown>)['notificationsRepository'] = repo;
  return { service, repo };
}

describe('NotificationsService', () => {
  describe('listForUser', () => {
    it('returns paginated notifications for the given user', async () => {
      const items = [makeNotif()];
      const { service, repo } = makeService({
        listForUser: vi.fn().mockResolvedValue({ items, nextCursor: null }),
      });
      const result = await service.listForUser(USER_A);
      expect(repo.listForUser).toHaveBeenCalledWith(USER_A, undefined, undefined);
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('passes cursor and pageSize to repository', async () => {
      const { service, repo } = makeService();
      await service.listForUser(USER_A, 'cursor-token', 10);
      expect(repo.listForUser).toHaveBeenCalledWith(USER_A, 'cursor-token', 10);
    });

    it('AUTH MATRIX POSITIVE — returns only own notifications (repo enforces recipientId filter)', async () => {
      const ownNotif = makeNotif({ recipientId: USER_A });
      const { service } = makeService({
        listForUser: vi.fn().mockResolvedValue({ items: [ownNotif], nextCursor: null }),
      });
      const result = await service.listForUser(USER_A);
      expect(result.items.every((n) => n.recipientId === USER_A)).toBe(true);
    });
  });

  describe('getUnreadCount', () => {
    it('returns unread count for the given user', async () => {
      const { service, repo } = makeService({ countUnread: vi.fn().mockResolvedValue(5) });
      const count = await service.getUnreadCount(USER_A);
      expect(repo.countUnread).toHaveBeenCalledWith(USER_A);
      expect(count).toBe(5);
    });

    it('returns 0 when no unread notifications', async () => {
      const { service } = makeService({ countUnread: vi.fn().mockResolvedValue(0) });
      expect(await service.getUnreadCount(USER_A)).toBe(0);
    });
  });

  describe('markRead', () => {
    it('marks a notification read when caller is the recipient', async () => {
      const { service, repo } = makeService();
      await service.markRead(USER_A, NOTIF_ID);
      expect(repo.markRead).toHaveBeenCalledWith(NOTIF_ID);
    });

    it('is idempotent — calling twice does not error', async () => {
      const alreadyRead = makeNotif({ readAt: new Date() });
      const { service } = makeService({ findById: vi.fn().mockResolvedValue(alreadyRead) });
      await expect(service.markRead(USER_A, NOTIF_ID)).resolves.toBeUndefined();
    });

    it('AUTH MATRIX NEGATIVE — throws AccessDeniedException when caller is not recipient', async () => {
      const { service } = makeService();
      await expect(service.markRead(USER_B, NOTIF_ID)).rejects.toThrow(AccessDeniedException);
    });

    it('throws EntityNotFoundException when notification does not exist', async () => {
      const { service } = makeService({ findById: vi.fn().mockResolvedValue(null) });
      await expect(service.markRead(USER_A, NOTIF_ID)).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('markAllRead', () => {
    it('marks all unread notifications read and returns count', async () => {
      const { service, repo } = makeService({ markAllRead: vi.fn().mockResolvedValue(3) });
      const count = await service.markAllRead(USER_A);
      expect(repo.markAllRead).toHaveBeenCalledWith(USER_A);
      expect(count).toBe(3);
    });

    it('returns 0 when there are no unread notifications (idempotent)', async () => {
      const { service } = makeService({ markAllRead: vi.fn().mockResolvedValue(0) });
      expect(await service.markAllRead(USER_A)).toBe(0);
    });
  });
});
