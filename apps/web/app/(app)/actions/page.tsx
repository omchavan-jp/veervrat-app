'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Inbox, Check, RotateCcw, Lightbulb, Plus, MessageSquare } from 'lucide-react';
import { notificationsApi, type NotificationItem } from '@/lib/api/notifications';
import { queryKeys } from '@/lib/api/query-keys';
import { EmptyState } from '@/components/ui/empty-state';

type Filter = 'all' | 'response' | 'suggestions' | 'updates';

// Maps notification event types → the visual + grouping treatment for the Actions inbox.
const EVENT_META: Record<
  string,
  { icon: typeof Check; tint: string; group: 'response' | 'suggestions' | 'updates' }
> = {
  ERC_RETURNED_FOR_REVISIT: { icon: RotateCcw, tint: 'bg-accent/12 text-accent', group: 'response' },
  VM_SUGGESTION_NEW: { icon: Lightbulb, tint: 'bg-accent-2/12 text-accent-2', group: 'suggestions' },
  NEW_ERC_AVAILABLE: { icon: Plus, tint: 'bg-warning/16 text-warning', group: 'response' },
  ERC_CLOSURE_APPROVED: { icon: Check, tint: 'bg-success/13 text-success', group: 'updates' },
  ERC_CLOSURE_SUBMITTED: { icon: Inbox, tint: 'bg-warning/16 text-warning', group: 'updates' },
  JOURNEY_COMPLETION_APPROVED: { icon: Check, tint: 'bg-success/13 text-success', group: 'updates' },
  CUSTOM_ERC_APPROVED: { icon: Check, tint: 'bg-success/13 text-success', group: 'updates' },
  CUSTOM_ERC_REJECTED: { icon: RotateCcw, tint: 'bg-accent/12 text-accent', group: 'response' },
  CHAT_MESSAGE_RECEIVED: { icon: MessageSquare, tint: 'bg-accent-2/12 text-accent-2', group: 'updates' },
  VM_WITHDREW: { icon: RotateCcw, tint: 'bg-muted/15 text-muted', group: 'updates' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export default function ActionsPage() {
  const t = useTranslations('actions_inbox');
  const tn = useTranslations('notifications');
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: () => notificationsApi.list(),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });

  const items = (data?.items ?? []).filter((n) => EVENT_META[n.eventType] && !n.dismissedAt);
  const filtered =
    filter === 'all' ? items : items.filter((n) => EVENT_META[n.eventType].group === filter);

  const counts = {
    all: items.length,
    response: items.filter((n) => EVENT_META[n.eventType].group === 'response').length,
    suggestions: items.filter((n) => EVENT_META[n.eventType].group === 'suggestions').length,
    updates: items.filter((n) => EVENT_META[n.eventType].group === 'updates').length,
  };

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: t('filterAll'), count: counts.all },
    { key: 'response', label: t('filterResponse'), count: counts.response },
    { key: 'suggestions', label: t('filterSuggestions'), count: counts.suggestions },
    { key: 'updates', label: t('filterUpdates'), count: counts.updates },
  ];

  const renderItem = (n: NotificationItem) => {
    const meta = EVENT_META[n.eventType];
    const Icon = meta.icon;
    const unread = !n.readAt;
    return (
      <button
        key={n.id}
        onClick={() => unread && markRead.mutate(n.id)}
        className="relative flex w-full items-start gap-3.5 rounded-2xl border border-border bg-surface p-4 text-left shadow-card transition-colors hover:border-accent/25"
      >
        {unread && <span className="absolute -left-2 top-5 h-[7px] w-[7px] rounded-full bg-accent" />}
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.tint}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {t(`event.${n.eventType}`)}
          </div>
          <div className="text-[14px] leading-snug">
            {n.actor && <span className="font-semibold">{n.actor.displayName} </span>}
            {tn(`message.${n.eventType}`)}
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-muted">{relativeTime(n.createdAt)}</span>
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>

      <div className="my-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
              filter === f.key
                ? 'border-accent bg-accent text-bg'
                : 'border-border-strong text-muted hover:border-accent'
            }`}
          >
            {f.label}
            <span className="ml-1.5 font-mono text-[10px] opacity-80">{f.count}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Inbox className="h-5 w-5" />} title={t('empty')} description={t('emptyHint')} />
      ) : (
        <div className="space-y-3">{filtered.map(renderItem)}</div>
      )}
    </div>
  );
}
