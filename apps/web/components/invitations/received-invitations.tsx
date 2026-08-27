'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useFormatter } from 'next-intl';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { invitationsApi, type ReceivedInvitation } from '@/lib/api/invitations';
import { errorMessage } from '@/lib/api/error-message';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Invitations addressed to you, with accept and decline in the row.
 *
 * This is what #22 has been about since 2026-07-18: an invited person could not see their own
 * invitation anywhere in the product, so the notification pointed at the page listing invitations
 * they had *sent*. Both surfaces call the same endpoints as the emailed link, so there is one
 * accept path rather than two.
 *
 * Renders nothing at all when there is nothing pending — someone who has only ever sent
 * invitations should not see an empty section explaining a thing that has not happened to them.
 */
export function ReceivedInvitations() {
  const t = useTranslations('invitations_flow');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['invitations', 'received'],
    queryFn: () => invitationsApi.received(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['invitations'] });
    void queryClient.invalidateQueries({ queryKey: ['my-vms'] });
  };

  const accept = useMutation({
    mutationFn: (token: string) => invitationsApi.accept(token),
    onSuccess: () => {
      toast.add({ title: t('acceptedToast'), type: 'success' });
      invalidate();
    },
    onError: (err) => toast.add({ title: errorMessage(err, t('actionError')), type: 'error' }),
  });

  const decline = useMutation({
    mutationFn: (token: string) => invitationsApi.decline(token),
    onSuccess: () => {
      toast.add({ title: t('declinedToast') });
      invalidate();
    },
    onError: (err) => toast.add({ title: errorMessage(err, t('actionError')), type: 'error' }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="md" label={tCommon('loading')} />
      </div>
    );
  }

  const items = data ?? [];
  if (items.length === 0) return null;

  const busy = accept.isPending || decline.isPending;

  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-[20px] tracking-tight">{t('receivedTitle')}</h2>
      <ul className="space-y-3">
        {items.map((inv: ReceivedInvitation) => (
          <li key={inv.id} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11 shrink-0">
                {inv.inviter.avatarUrl && <AvatarImage src={inv.inviter.avatarUrl} />}
                <AvatarFallback>{initialsOf(inv.inviter.displayName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                {/* Named, and linked. Accepting gives this person read access to your journeys,
                    weaknesses and reflections — a decision nobody should make about a stranger. */}
                <Link
                  href={`/u/${inv.inviter.username}`}
                  className="block truncate font-display text-[17px] leading-tight tracking-tight hover:text-accent"
                >
                  {inv.inviter.displayName}
                </Link>
                <p className="truncate text-[13px] text-muted">@{inv.inviter.username}</p>
              </div>
              <Badge
                variant="secondary"
                className={`shrink-0 border-transparent px-2.5 py-1 text-[11px] font-medium ${
                  inv.type === 'VM_GLOBAL'
                    ? 'bg-accent/12 text-accent'
                    : 'bg-accent-2/15 text-accent-2'
                }`}
              >
                {inv.type === 'VM_GLOBAL' ? t('scopeGlobal') : t('scopeJourney')}
              </Badge>
            </div>

            <p className="mt-3 text-[13px] text-muted">
              {t('expiresOn', {
                date: format.dateTime(new Date(inv.expiresAt), { dateStyle: 'medium' }),
              })}
            </p>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={busy}
                onClick={() => decline.mutate(inv.token)}
              >
                {t('decline')}
              </Button>
              <Button
                size="sm"
                className="rounded-full"
                disabled={busy}
                loading={accept.isPending && accept.variables === inv.token}
                onClick={() => accept.mutate(inv.token)}
              >
                {t('accept')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
        {t('receivedHint')}
      </p>
    </section>
  );
}
