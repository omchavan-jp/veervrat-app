'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { queryKeys } from '@/lib/api/query-keys';
import { notificationsApi, type NotificationItem } from '@/lib/api/notifications';

const EVENT_LABELS: Record<string, string> = {
  VM_INVITATION_RECEIVED: 'New VM invitation',
  VM_INVITATION_ACCEPTED: 'Invitation accepted',
  VM_INVITATION_DECLINED: 'Invitation declined',
  VM_INVITATION_EXPIRED: 'Invitation expired',
  INVITEE_JOINED_PLATFORM: 'Invitee joined',
  JOURNEY_DORMANT: 'Journey marked dormant',
  NEW_ERC_AVAILABLE: 'New ERC available',
  ERC_CLOSURE_SUBMITTED: 'ERC closure submitted',
  ERC_CLOSURE_APPROVED: 'ERC closure approved',
  ERC_RETURNED_FOR_REVISIT: 'ERC returned for revisit',
  JOURNEY_COMPLETION_SUBMITTED: 'Journey completion submitted',
  JOURNEY_COMPLETION_APPROVED: 'Journey completion approved',
  CUSTOM_ERC_REVIEW_REQUESTED: 'Custom ERC review requested',
  CUSTOM_ERC_APPROVED: 'Custom ERC approved',
  CUSTOM_ERC_REJECTED: 'Custom ERC rejected',
  VM_SUGGESTION_NEW: 'New VM suggestion',
  VM_SUGGESTION_DISMISSED: 'VM suggestion dismissed',
  BLOG_COMMENT_NEW: 'New comment',
  COMMENT_REPORTED: 'Comment reported',
  NEW_FOLLOWER: 'New follower',
  CHAT_MESSAGE_RECEIVED: 'New message',
  VM_WITHDREW: 'VM withdrew',
};

function eventTypeToPath(eventType: string, resourceId: string | null): string | null {
  if (!resourceId) return null;
  switch (eventType) {
    case 'VM_INVITATION_RECEIVED':
    case 'VM_INVITATION_ACCEPTED':
    case 'VM_INVITATION_DECLINED':
    case 'VM_INVITATION_EXPIRED':
      return '/dashboard';
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
  const label = EVENT_LABELS[item.eventType] ?? item.eventType;
  const path = eventTypeToPath(item.eventType, item.resourceId);
  const isUnread = item.readAt === null;
  const relativeTime = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

  return (
    <button
      onClick={() => onRead(item.id, path)}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isUnread ? 'bg-primary' : 'bg-transparent'}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{item.actor?.displayName ?? 'System'}</p>
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 text-xs text-muted">{relativeTime}</p>
      </div>
    </button>
  );
}

export function NotificationPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
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
        <span className="text-sm font-semibold text-fg">Notifications</span>
        <button
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || !hasUnread}
          className="text-xs text-muted transition-colors hover:text-fg disabled:opacity-50"
        >
          Mark all as read
        </button>
      </div>

      {isLoading && (
        <div className="px-4 py-8 text-center text-sm text-muted">Loading...</div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted">No notifications yet</div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="max-h-96 overflow-y-auto divide-y divide-border">
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} onRead={handleItemClick} />
          ))}
        </div>
      )}
    </div>
  );
}
