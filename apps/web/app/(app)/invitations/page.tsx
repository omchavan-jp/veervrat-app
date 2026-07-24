'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, Mail, Copy, Check, X, Clock } from 'lucide-react';
import { usersApi, type UserSearchResult } from '@/lib/api/users';
import {
  invitationsApi,
  type Invitation,
  type InvitationType,
  type InvitationStatus,
} from '@/lib/api/invitations';
import { queryKeys } from '@/lib/api/query-keys';
import { useDebounce } from '@/hooks/use-debounce';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const STATUS_TINT: Record<InvitationStatus, string> = {
  PENDING: 'bg-warning/16 text-warning',
  ACCEPTED: 'bg-success/13 text-success',
  DECLINED: 'bg-muted/15 text-muted',
  EXPIRED: 'bg-muted/15 text-muted',
  CANCELLED: 'bg-muted/15 text-muted',
};

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function InvitationsPage() {
  const t = useTranslations('invitations_flow');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<UserSearchResult | null>(null);
  const debounced = useDebounce(query, 250);

  const search = useQuery({
    queryKey: ['user-search', debounced],
    queryFn: () => usersApi.search(debounced),
    enabled: debounced.trim().length >= 2 && !selected,
  });

  const invitations = useQuery({
    queryKey: queryKeys.invitations.list,
    queryFn: () => invitationsApi.list(),
  });

  const send = useMutation({
    mutationFn: (input: { type: InvitationType; inviteeEmail?: string; inviteeUsername?: string }) =>
      invitationsApi.send(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations.list });
      setSelected(null);
      setQuery('');
      toast({ title: t('sent') });
    },
    onError: () => toast({ title: t('sendError'), variant: 'destructive' }),
  });

  const remind = useMutation({
    mutationFn: (id: string) => invitationsApi.sendReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations.list });
      toast({ title: t('reminderSent') });
    },
    onError: () => toast({ title: t('reminderError'), variant: 'destructive' }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => invitationsApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invitations.list }),
  });

  // Direct platform invite by email when the query is an email with no platform match.
  const canEmailInvite = isEmail(query.trim()) && !selected;

  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>

      {/* Search + select */}
      <section className="mt-6">
        {selected ? (
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-2 text-[13px] font-medium text-bg">
                {selected.displayName.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{selected.displayName}</div>
                <div className="truncate text-[13px] text-muted">@{selected.username}</div>
              </div>
              <button onClick={() => setSelected(null)} aria-label={t('clear')} className="text-muted hover:text-fg">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* An already-found user is by definition an existing platform member — the
                only meaningful invite for them is a global vratmitra invite. Platform
                Invite (a signup link) doesn't apply and used to be offered here by
                mistake, silently skipping the in-app notification and VM relationship. */}
            <p className="mt-4 text-[13px] text-muted">{t('scopeGlobalOnly')}</p>
            <Button
              className="mt-4"
              disabled={send.isPending}
              onClick={() => send.mutate({ type: 'VM_GLOBAL', inviteeUsername: selected.username })}
            >
              <UserPlus className="h-4 w-4" />
              <span className="ml-1.5">{t('sendInvite')}</span>
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-[14px] outline-none focus:border-accent"
              />
            </div>

            {debounced.trim().length >= 2 && (
              <div className="mt-2 space-y-1.5">
                {search.isLoading ? (
                  <div className="py-4 text-center text-[13px] text-muted">{t('searching')}</div>
                ) : (search.data?.length ?? 0) > 0 ? (
                  search.data!.map((u) => (
                    <button
                      key={u.username}
                      onClick={() => setSelected(u)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-accent/30"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-2 text-[12px] font-medium text-bg">
                        {u.displayName.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px]">{u.displayName}</div>
                        <div className="truncate text-[12px] text-muted">
                          @{u.username}
                          {u.isOnline && <span className="ml-2 text-success">● {t('online')}</span>}
                        </div>
                      </div>
                      {u.isFollowing && <span className="text-[11px] text-muted">{t('following')}</span>}
                    </button>
                  ))
                ) : canEmailInvite ? (
                  <button
                    onClick={() => send.mutate({ type: 'PLATFORM', inviteeEmail: query.trim() })}
                    className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border-strong p-3 text-left hover:border-accent"
                  >
                    <Mail className="h-4 w-4 text-muted" />
                    <span className="text-[13px]">{t('inviteByEmail', { email: query.trim() })}</span>
                  </button>
                ) : (
                  <div className="py-4 text-center text-[13px] text-muted">{t('noResults')}</div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Pending invitations */}
      <section className="mt-9">
        <h2 className="mb-3 text-[15px] font-medium">{t('yourInvitations')}</h2>
        {invitations.isLoading ? (
          <div className="py-6 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
        ) : (invitations.data?.length ?? 0) === 0 ? (
          <EmptyState icon={<Mail className="h-5 w-5" />} title={t('noInvitations')} description={t('noInvitationsHint')} />
        ) : (
          <div className="space-y-2.5">
            {invitations.data!.map((inv) => (
              <InvitationRow
                key={inv.id}
                inv={inv}
                onRemind={() => remind.mutate(inv.id)}
                onCancel={() => cancel.mutate(inv.id)}
                remindPending={remind.isPending}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InvitationRow({
  inv,
  onRemind,
  onCancel,
  remindPending,
}: {
  inv: Invitation;
  onRemind: () => void;
  onCancel: () => void;
  remindPending: boolean;
}) {
  const t = useTranslations('invitations_flow');
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(inv.shareMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px]">{inv.inviteeEmail}</div>
          <div className="mt-0.5 text-[12px] text-muted">{t(`type.${inv.type}`)}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_TINT[inv.status]}`}>
          {t(`status.${inv.status}`)}
        </span>
      </div>
      {inv.status === 'PENDING' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onRemind}
            disabled={remindPending || inv.reminderSentAt !== null}
            className="inline-flex items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-[12px] text-muted hover:border-accent disabled:opacity-50"
          >
            <Clock className="h-3 w-3" /> {inv.reminderSentAt ? t('reminderAlreadySent') : t('sendReminder')}
          </button>
          <button
            onClick={() => setShowShare((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-[12px] text-muted hover:border-accent"
          >
            {t('share')}
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-[12px] text-muted hover:border-danger hover:text-danger"
          >
            <X className="h-3 w-3" /> {t('cancel')}
          </button>
        </div>
      )}
      {showShare && (
        <div className="mt-3 rounded-xl border border-border bg-bg p-3">
          <textarea
            readOnly
            value={inv.shareMessage}
            className="h-20 w-full resize-none bg-transparent text-[13px] outline-none"
          />
          <button onClick={copy} className="mt-1 inline-flex items-center gap-1 text-[12px] text-accent">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? t('copied') : t('copy')}
          </button>
        </div>
      )}
    </div>
  );
}
