'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations, useFormatter } from 'next-intl';
import { queryKeys } from '@/lib/api/query-keys';
import { notificationsApi, type NotificationItem } from '@/lib/api/notifications';

// Canonical event types whose labels are resolved through i18n; unknown server-side
// types fall back to the raw eventType string.
const KNOWN_EVENT_TYPES = new Set<string>([
  'VM_INVITATION_RECEIVED',
  'VM_INVITATION_ACCEPTED',
  'VM_INVITATION_DECLINED',
  'VM_INVITATION_EXPIRED',
  'INVITEE_JOINED_PLATFORM',
  'JOURNEY_DORMANT',
  'NEW_ERC_AVAILABLE',
  'ERC_CLOSURE_SUBMITTED',
  'ERC_CLOSURE_APPROVED',
  'ERC_RETURNED_FOR_REVISIT',
  'JOURNEY_COMPLETION_SUBMITTED',
  'JOURNEY_COMPLETION_APPROVED',
  'CUSTOM_ERC_REVIEW_REQUESTED',
  'CUSTOM_ERC_APPROVED',
  'CUSTOM_ERC_REJECTED',
  'VM_SUGGESTION_NEW',
  'VM_SUGGESTION_DISMISSED',
  'BLOG_COMMENT_NEW',
  'COMMENT_REPORTED',
  'NEW_FOLLOWER',
  'CHAT_MESSAGE_RECEIVED',
  'VM_WITHDREW',
]);

function eventTypeToPath(eventType: string, resourceId: string | null): string | null {
  if (!resourceId) return null;
  switch (eventType) {
    // Matches notification-link.ts (the email deep-link map) on the backend — this map
    // had drifted to '/dashboard', which isn't where a pending invitation is visible.
    case 'VM_INVITATION_RECEIVED':
    case 'VM_INVITATION_ACCEPTED':
    case 'VM_INVITATION_DECLINED':
    case 'VM_INVITATION_EXPIRED':
    case 'INVITEE_JOINED_PLATFORM':
      return '/invitations';
    case 'ERC_CLOSURE_SUBMITTED':
    case 'ERC_CLOSURE_APPROVED':
    case 'ERC_RETURNED_FOR_REVISIT':
    case 'NEW_ERC_AVAILABLE':
      return `/journeys`;
    case 'JOURNEY_COMPLETION_SUBMITTED':
    case 'JOURNEY_COMPLETION_APPROVED':
    case 'JOURNEY_DORMANT':
      return `/journeys/${resourceId}`;
    default:
      return null;
  }
}

function NotificationRow({
  item,
  onRead,
}: {
  item: NotificationItem;
  onRead: (id: string, path: string | null) => void;
}) {
  const t = useTranslations('notifications');
  const format = useFormatter();
  const label = KNOWN_EVENT_TYPES.has(item.eventType)
    ? t(`event_${item.eventType}` as never)
    : item.eventType;
  const path = eventTypeToPath(item.eventType, item.resourceId);
  const isUnread = item.readAt === null;
  const relativeTime = format.relativeTime(new Date(item.createdAt));

  return (
    <button
      onClick={() => onRead(item.id, path)}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isUnread ? 'bg-accent' : 'bg-transparent'}`}
      >
        {isUnread && <span className="sr-only">{t('unread')}</span>}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{item.actor?.displayName ?? t('system')}</p>
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 text-xs text-muted">{relativeTime}</p>
      </div>
    </button>
  );
}

export function NotificationPanel() {
  const t = useTranslations('notifications');
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: () => notificationsApi.list(),
  });

  function invalidateNotifications() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list });
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
  }

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSettled: invalidateNotifications,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSettled: invalidateNotifications,
  });

  function handleItemClick(id: string, path: string | null) {
    markRead.mutate(id);
    if (path) router.push(path);
  }

  const items = data?.items ?? [];
  const hasUnread = items.some((i) => i.readAt === null);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-fg">{t('title')}</span>
        <button
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || !hasUnread}
          className="text-xs text-muted transition-colors hover:text-fg disabled:opacity-50"
        >
          {t('markAllRead')}
        </button>
      </div>

      {isLoading && <div className="px-4 py-8 text-center text-sm text-muted">{t('loading')}</div>}

      {!isLoading && isError && (
        <div className="px-4 py-8 text-center text-sm text-muted">
          <p>{t('loadError')}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-xs text-accent transition-colors hover:text-fg"
          >
            {t('retry')}
          </button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted">{t('empty')}</div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="max-h-96 overflow-y-auto divide-y divide-border">
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} onRead={handleItemClick} />
          ))}
        </div>
      )}
    </div>
  );
}
