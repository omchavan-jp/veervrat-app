'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations, useFormatter } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Award, UserPlus, UserCheck, RotateCcw } from 'lucide-react';
import { usersApi, type PublicProfile } from '@/lib/api/users';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/hooks/use-auth';
import { excerptFromDoc } from '@/components/experience/experience-excerpt';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="font-display text-[26px] font-medium leading-none">{value}</div>
      <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const t = useTranslations('publicProfile');
  const format = useFormatter();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<PublicProfile>({
    queryKey: ['public-profile', username],
    queryFn: () => usersApi.getPublicProfile(username),
    retry: false,
  });

  const experiences = useQuery({
    queryKey: ['public-profile', username, 'experiences'],
    queryFn: () => usersApi.getPublicExperiences(username),
    enabled: !!data,
  });

  const toggleFollow = useMutation({
    mutationFn: () =>
      data?.isFollowing ? usersApi.unfollow(username) : usersApi.follow(username),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['public-profile', username] }),
  });

  const isOwnProfile = isAuthenticated && user?.username === username;

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }

  // Private or non-existent profiles both return 404 (privacy: don't reveal existence).
  // Transient 5xx/network errors are distinct — offer a retry rather than masking them
  // as a permanent "not found".
  if (error) {
    const is404 = error instanceof ApiError && error.statusCode === 404;
    if (is404) {
      return (
        <div className="mx-auto max-w-[680px]">
          <EmptyState icon={<Lock className="h-5 w-5" />} title={t('private')} />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-[680px]">
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

  if (!data) return null;

  const memberSince = data.memberSince
    ? format.dateTime(new Date(data.memberSince), { year: 'numeric', month: 'long' })
    : null;

  return (
    <div className="mx-auto max-w-[680px]">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <Avatar className="h-16 w-16 border-0">
          <AvatarFallback className="bg-accent-2 text-[20px] font-semibold text-bg">
            {data.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[28px] font-medium tracking-tight">{data.displayName}</h1>
          <div className="text-[14px] text-muted">@{data.username}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
            {data.isOnline && (
              <span className="text-success">
                <span aria-hidden="true">● </span>{t('online')}
              </span>
            )}
            {!data.isOnline && data.lastActiveAt && (
              <span>{t('lastActive', { time: format.dateTime(new Date(data.lastActiveAt), { year: 'numeric', month: 'short', day: 'numeric' }) })}</span>
            )}
            {memberSince && <span>{t('memberSince', { date: memberSince })}</span>}
          </div>
          <div className="mt-2 flex items-center gap-4 text-[13px]">
            <span><span className="font-semibold">{data.followerCount}</span> <span className="text-muted">{t('followers')}</span></span>
            <span><span className="font-semibold">{data.followingCount}</span> <span className="text-muted">{t('following')}</span></span>
          </div>
        </div>
        {!isOwnProfile && (
          <Button
            size="sm"
            variant={data.isFollowing ? 'outline' : 'default'}
            disabled={toggleFollow.isPending}
            onClick={() => {
              if (!isAuthenticated) { router.push('/login'); return; }
              toggleFollow.mutate();
            }}
          >
            {data.isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            <span className="ml-1.5">{data.isFollowing ? t('following') : t('follow')}</span>
          </Button>
        )}
      </div>

      {/* VM credibility */}
      {data.guidedJourneysCompleted !== undefined && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-[14px] shadow-card">
          <Award className="h-4 w-4 text-accent" />
          <span>{t('guidedJourneys', { count: data.guidedJourneysCompleted })}</span>
        </div>
      )}

      {/* Stats — only the fields the VA has left visible are present */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data.journeysCompleted !== undefined && (
          <StatCard label={t('journeysCompleted')} value={data.journeysCompleted} />
        )}
        {data.journeysActive !== undefined && (
          <StatCard label={t('journeysActive')} value={data.journeysActive} />
        )}
        {data.testsTaken !== undefined && <StatCard label={t('testsTaken')} value={data.testsTaken} />}
        {data.weaknessesWorkedOn !== undefined && (
          <StatCard label={t('weaknesses')} value={data.weaknessesWorkedOn} />
        )}
        {data.exposuresActive !== undefined && (
          <StatCard
            label={t('exposures')}
            value={`${data.exposuresActive} / ${data.exposuresCompleted ?? 0}`}
            sub={`${t('active')} / ${t('completed')}`}
          />
        )}
        {data.resolutionsActive !== undefined && (
          <StatCard
            label={t('resolutions')}
            value={`${data.resolutionsActive} / ${data.resolutionsCompleted ?? 0}`}
            sub={`${t('active')} / ${t('completed')}`}
          />
        )}
        {data.challengesCompleted !== undefined && (
          <StatCard label={t('challenges')} value={data.challengesCompleted} />
        )}
        {data.publicExperienceCount !== undefined && (
          <StatCard label={t('experiences')} value={data.publicExperienceCount} />
        )}
      </div>

      {/* Public experience entries */}
      {(experiences.isLoading || experiences.isError || (experiences.data?.items.length ?? 0) > 0) && (
        <div className="mt-8">
          <h2 className="mb-3 text-[15px] font-medium">{t('publicExperiences')}</h2>
          {experiences.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-border" />
              ))}
            </div>
          ) : experiences.isError ? (
            <EmptyState
              icon={<RotateCcw className="h-5 w-5" />}
              title={t('experiencesError')}
              action={
                <Button variant="outline" onClick={() => experiences.refetch()}>
                  {t('retry')}
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {(experiences.data?.items ?? []).map((e) => (
                <article key={e.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                  <div className="mb-1 text-[12px] text-muted">
                    {format.dateTime(new Date(e.publishedAt ?? e.createdAt), { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                  <p className="text-[14px] leading-relaxed">{excerptFromDoc(e.body)}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
