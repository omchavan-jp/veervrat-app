import { describe, it, expect, vi } from 'vitest';
import { NotificationsService } from './notifications.service';
import {
  AccessDeniedException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
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
    findEmailRecipient: vi
      .fn()
      .mockResolvedValue({ email: 'r@test.com', language: 'EN', notificationPrefs: {} }),
    listForUser: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    countUnread: vi.fn().mockResolvedValue(0),
    findById: vi.fn().mockResolvedValue(makeNotif()),
    markRead: vi.fn().mockResolvedValue(undefined),
    markAllRead: vi.fn().mockResolvedValue(0),
    archiveOlderThan: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function makeEmail(overrides: Record<string, unknown> = {}) {
  return {
    renderTemplate: vi.fn().mockResolvedValue({ html: '<p>x</p>', text: 'x' }),
    sendNotification: vi.fn(),
    ...overrides,
  };
}

function makeService(
  repoOverrides: Record<string, unknown> = {},
  emailOverrides: Record<string, unknown> = {},
) {
  const repo = makeRepo(repoOverrides);
  const email = makeEmail(emailOverrides);
  const service = Object.create(NotificationsService.prototype) as NotificationsService;
  (service as unknown as Record<string, unknown>)['notificationsRepository'] = repo;
  (service as unknown as Record<string, unknown>)['emailService'] = email;
  // Sending moved to EmailQueueService (#141); the same double serves both so existing
  // assertions on `email.sendNotification` keep pointing at the spy that is actually called.
  (service as unknown as Record<string, unknown>)['emailQueue'] = email;
  (service as unknown as Record<string, unknown>)['frontendUrl'] = 'http://localhost:3000';
  (service as unknown as Record<string, unknown>)['logger'] = { warn: vi.fn(), log: vi.fn() };
  return { service, repo, email };
}

// Lets fire-and-forget email dispatch (void promise inside create) settle before assertions.
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('NotificationsService', () => {
  describe('create — email delivery', () => {
    it('sends an email for an emailable event when the recipient is active and not opted out', async () => {
      const { service, repo, email } = makeService();
      await service.create(
        USER_A,
        USER_B,
        NotificationEventType.ERC_CLOSURE_APPROVED,
        'exposure',
        'item-1',
      );
      await flush();
      expect(repo.create).toHaveBeenCalledOnce();
      expect(repo.findEmailRecipient).toHaveBeenCalledWith(USER_A);
      expect(email.sendNotification).toHaveBeenCalledOnce();
    });

    it('does NOT email an in-app-only event', async () => {
      const { service, email } = makeService();
      await service.create(USER_A, USER_B, NotificationEventType.NEW_FOLLOWER, 'user', USER_B);
      await flush();
      expect(email.sendNotification).not.toHaveBeenCalled();
    });

    it('does NOT email when the recipient opted out of that event', async () => {
      const { service, email } = makeService({
        findEmailRecipient: vi.fn().mockResolvedValue({
          email: 'r@test.com',
          language: 'EN',
          notificationPrefs: { ERC_CLOSURE_APPROVED: false },
        }),
      });
      await service.create(
        USER_A,
        USER_B,
        NotificationEventType.ERC_CLOSURE_APPROVED,
        'exposure',
        'item-1',
      );
      await flush();
      expect(email.sendNotification).not.toHaveBeenCalled();
    });

    it('does NOT email an inactive (deleted/suspended) recipient', async () => {
      const { service, email } = makeService({
        findEmailRecipient: vi.fn().mockResolvedValue(null),
      });
      await service.create(
        USER_A,
        USER_B,
        NotificationEventType.ERC_CLOSURE_APPROVED,
        'exposure',
        'item-1',
      );
      await flush();
      expect(email.sendNotification).not.toHaveBeenCalled();
    });

    it('skips email when skipEmail is set (caller sends its own bespoke email)', async () => {
      const { service, repo, email } = makeService();
      await service.create(
        USER_A,
        USER_B,
        NotificationEventType.VM_INVITATION_RECEIVED,
        'invitation',
        'inv-1',
        {
          skipEmail: true,
        },
      );
      await flush();
      expect(repo.create).toHaveBeenCalledOnce();
      expect(repo.findEmailRecipient).not.toHaveBeenCalled();
      expect(email.sendNotification).not.toHaveBeenCalled();
    });

    it('renders in Marathi when the recipient language is mr', async () => {
      const { service, email } = makeService({
        findEmailRecipient: vi
          .fn()
          .mockResolvedValue({ email: 'r@test.com', language: 'mr', notificationPrefs: {} }),
      });
      await service.create(
        USER_A,
        USER_B,
        NotificationEventType.JOURNEY_COMPLETION_APPROVED,
        'journey',
        'j-1',
      );
      await flush();
      expect(email.sendNotification).toHaveBeenCalledOnce();
      // subject is the MR subject for this event
      const subjectArg = (email.sendNotification as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(subjectArg).toContain('मंजूर');
    });

    it('still creates the in-app notification when email rendering throws', async () => {
      const { service, repo, email } = makeService(
        {},
        {
          renderTemplate: vi.fn().mockRejectedValue(new Error('render boom')),
        },
      );
      const result = await service.create(
        USER_A,
        USER_B,
        NotificationEventType.ERC_CLOSURE_APPROVED,
        'exposure',
        'i',
      );
      await flush();
      expect(repo.create).toHaveBeenCalledOnce();
      expect(result).toEqual({ id: NOTIF_ID });
      expect(email.sendNotification).not.toHaveBeenCalled();
    });
  });

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

    it('AUTH MATRIX POSITIVE — scopes the query to the caller (repo enforces recipientId filter)', async () => {
      const ownNotif = makeNotif({ recipientId: USER_A });
      const listForUser = vi.fn().mockResolvedValue({ items: [ownNotif], nextCursor: null });
      const { service } = makeService({ listForUser });
      const result = await service.listForUser(USER_A);
      expect(listForUser).toHaveBeenCalledWith(USER_A, undefined, undefined);
      expect(result.items).toEqual([ownNotif]);
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
