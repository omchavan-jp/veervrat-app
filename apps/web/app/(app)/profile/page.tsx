'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { usersApi, type OwnProfile, type ProfileField, type UpdateVisibilityInput } from '@/lib/api/users';
import { useToast } from '@/hooks/use-toast';

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

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-accent' : 'bg-border-strong'}`}
    >
      <span
        className={`absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-surface shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery({
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

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const p: OwnProfile = profile;
  const fieldVisible = (k: ProfileField) => p.profileVisibility[k] !== false;

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>
        </div>
        <Link
          href={`/u/${p.username}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-[13px] transition-colors hover:border-accent"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t('viewPublic')}
        </Link>
      </div>

      {/* Account */}
      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t('sectionAccount')}</h2>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-2 text-[15px] font-semibold text-bg">
            {(p.displayName || p.email).slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-medium">{p.displayName}</div>
            <div className="truncate text-[13px] text-muted">@{p.username}</div>
            {(p.followerCount !== undefined || p.followingCount !== undefined) && (
              <div className="mt-1 flex gap-4 text-[12px]">
                <span><span className="font-semibold">{p.followerCount ?? 0}</span> <span className="text-muted">{t('followers')}</span></span>
                <span><span className="font-semibold">{p.followingCount ?? 0}</span> <span className="text-muted">{t('following')}</span></span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Presence + full privacy */}
      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t('sectionPresence')}</h2>
        <div className="divide-y divide-border rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-[14px] font-medium text-danger">{t('fullPrivate')}</div>
              <div className="mt-0.5 text-[12px] text-muted">{t('fullPrivateHint')}</div>
            </div>
            <Toggle
              on={p.profilePrivate}
              disabled={mutation.isPending}
              onChange={(v) => mutation.mutate({ profilePrivate: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="text-[14px]">{t('showLastActive')}</div>
            <Toggle on={p.showLastActive} disabled={mutation.isPending} onChange={(v) => mutation.mutate({ showLastActive: v })} />
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="text-[14px]">{t('showOnline')}</div>
            <Toggle on={p.showOnlineIndicator} disabled={mutation.isPending} onChange={(v) => mutation.mutate({ showOnlineIndicator: v })} />
          </div>
        </div>
      </section>

      {/* Per-field visibility */}
      <section>
        <h2 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t('sectionVisibility')}</h2>
        <p className="mb-3 text-[12px] text-muted">{t('visibilityHint')}</p>
        <div className="divide-y divide-border rounded-2xl border border-border bg-surface shadow-card">
          {FIELDS.map(({ key, labelKey }) => (
            <div key={key} className="flex items-center justify-between gap-4 p-4">
              <div className="text-[14px]">{t(labelKey)}</div>
              <Toggle
                on={fieldVisible(key)}
                disabled={p.profilePrivate || mutation.isPending}
                onChange={(v) => mutation.mutate({ profileVisibility: { [key]: v } })}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
