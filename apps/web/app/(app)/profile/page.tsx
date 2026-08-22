'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Pencil, RotateCcw } from 'lucide-react';
import {
  usersApi,
  type OwnProfile,
  type ProfileField,
  type UpdateVisibilityInput,
} from '@/lib/api/users';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

const FIELDS: { key: ProfileField; labelKey: string }[] = [
  { key: 'avatar', labelKey: 'fieldAvatar' },
  { key: 'memberSince', labelKey: 'fieldMemberSince' },
  { key: 'journeysCompleted', labelKey: 'fieldJourneysCompleted' },
  { key: 'journeysActive', labelKey: 'fieldJourneysActive' },
  { key: 'testsTaken', labelKey: 'fieldTestsTaken' },
  { key: 'weaknesses', labelKey: 'fieldWeaknesses' },
  { key: 'exposures', labelKey: 'fieldExposures' },
  { key: 'resolutions', labelKey: 'fieldResolutions' },
  { key: 'challenges', labelKey: 'fieldChallenges' },
  { key: 'experiences', labelKey: 'fieldExperiences' },
];

export default function ProfilePage() {
  const t = useTranslations('profile');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: usersApi.getMyProfile,
  });

  const mutation = useMutation({
    mutationFn: (data: UpdateVisibilityInput) => usersApi.updateVisibility(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile', 'me'], updated);
      toast({ title: t('saved') });
    },
    onError: () => toast({ title: t('saveError'), variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-[680px]">
        <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
        <EmptyState
          icon={<RotateCcw className="h-5 w-5" />}
          title={t('loadError')}
          description={t('loadErrorHint')}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              {t('retry')}
            </Button>
          }
        />
      </div>
    );
  }

  const p: OwnProfile = profile;
  const fieldVisible = (k: ProfileField) => p.profileVisibility[k] !== false;

  return (
    <div className="mx-auto max-w-[680px]">
      {/* Stacks on mobile — the title and two full-text action pills don't fit side by
          side on narrow viewports; row layout resumes at sm: and up. */}
      <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-[13px] transition-colors hover:border-accent"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t('editInSettings')}
          </Link>
          <Link
            href={`/u/${p.username}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-[13px] transition-colors hover:border-accent"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('viewPublic')}
          </Link>
        </div>
      </div>

      {/* Account */}
      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {t('sectionAccount')}
        </h2>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
          <Avatar className="h-12 w-12 border-0">
            <AvatarFallback className="bg-accent-2 text-[15px] font-semibold text-bg">
              {(p.displayName || p.email).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-medium">{p.displayName}</div>
            <div className="truncate text-[13px] text-muted">@{p.username}</div>
            {(p.followerCount !== undefined || p.followingCount !== undefined) && (
              <div className="mt-1 flex gap-4 text-[12px]">
                <span>
                  <span className="font-semibold">{p.followerCount ?? 0}</span>{' '}
                  <span className="text-muted">{t('followers')}</span>
                </span>
                <span>
                  <span className="font-semibold">{p.followingCount ?? 0}</span>{' '}
                  <span className="text-muted">{t('following')}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Presence + full privacy */}
      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {t('sectionPresence')}
        </h2>
        <div className="divide-y divide-border rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-[14px] font-medium text-danger">{t('fullPrivate')}</div>
              <div className="mt-0.5 text-[12px] text-muted">{t('fullPrivateHint')}</div>
            </div>
            <Switch
              aria-label={t('fullPrivate')}
              checked={p.profilePrivate}
              disabled={mutation.isPending}
              onCheckedChange={(v) => mutation.mutate({ profilePrivate: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="text-[14px]">{t('showLastActive')}</div>
            <Switch
              aria-label={t('showLastActive')}
              checked={p.showLastActive}
              disabled={mutation.isPending}
              onCheckedChange={(v) => mutation.mutate({ showLastActive: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="text-[14px]">{t('showOnline')}</div>
            <Switch
              aria-label={t('showOnline')}
              checked={p.showOnlineIndicator}
              disabled={mutation.isPending}
              onCheckedChange={(v) => mutation.mutate({ showOnlineIndicator: v })}
            />
          </div>
        </div>
      </section>

      {/* Per-field visibility */}
      <section>
        <h2 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {t('sectionVisibility')}
        </h2>
        <p className="mb-3 text-[12px] text-muted">{t('visibilityHint')}</p>
        <div className="divide-y divide-border rounded-2xl border border-border bg-surface shadow-card">
          {FIELDS.map(({ key, labelKey }) => (
            <div key={key} className="flex items-center justify-between gap-4 p-4">
              <div className="text-[14px]">{t(labelKey)}</div>
              <Switch
                aria-label={t(labelKey)}
                checked={fieldVisible(key)}
                disabled={p.profilePrivate || mutation.isPending}
                onCheckedChange={(v) => mutation.mutate({ profileVisibility: { [key]: v } })}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
