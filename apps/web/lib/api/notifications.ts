import { api } from './client';

type Wrapped<T> = { data: T };

export type NotificationActor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type NotificationItem = {
  id: string;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  actor: NotificationActor | null;
};

export type NotificationsListResponse = {
  items: NotificationItem[];
  nextCursor: string | null;
};

export type UnreadCountResponse = {
  count: number;
};

export const notificationsApi = {
  list: (cursor?: string): Promise<NotificationsListResponse> => {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return api
      .get<Wrapped<NotificationsListResponse>>(`/notifications${params}`)
      .then((r) => r.data);
  },

  getUnreadCount: (): Promise<UnreadCountResponse> =>
    api.get<Wrapped<UnreadCountResponse>>('/notifications/unread-count').then((r) => r.data),

  markRead: (id: string): Promise<object> =>
    api.patch<Wrapped<object>>(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: (): Promise<{ updated: number }> =>
    api.post<Wrapped<{ updated: number }>>('/notifications/read-all').then((r) => r.data),
};
