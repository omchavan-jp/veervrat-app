'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Newspaper, PenLine } from 'lucide-react';
import { blogsApi } from '@/lib/api/blogs';
import { experienceLogsApi } from '@/lib/api/experience-logs';
import { adminApi } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { useToast } from '@/hooks/use-toast';
import { tiptapDocToText } from '@/lib/tiptap-text';
import { Tabs } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';

function StarToggle({ on, onClick, busy, label }: { on: boolean; onClick: () => void; busy: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${on ? 'text-warning hover:bg-warning/10' : 'text-muted hover:bg-fg/[0.04] hover:text-fg'}`}
      aria-pressed={on}
      aria-label={label}
    >
      <Star className="h-4 w-4" fill={on ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  );
}

type FeaturedTab = 'blogs' | 'experiences';

export default function FeaturedPanel() {
  const t = useTranslations('admin');
  const qc = useQueryClient();
  const { isAdmin, ready } = useAdminGuard();
  const { toast } = useToast();
  const [tab, setTab] = useState<FeaturedTab>('blogs');

  const blogs = useQuery({ queryKey: queryKeys.blogs.list, queryFn: () => blogsApi.list(), enabled: isAdmin });
  const experiences = useQuery({ queryKey: queryKeys.experiences.public, queryFn: () => experienceLogsApi.getPublic(), enabled: isAdmin });

  const toggleBlog = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => adminApi.featureBlog(id, featured),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.blogs.list }),
    onError: () => toast({ title: t('toggleFeaturedError'), variant: 'destructive' }),
  });
  const toggleExp = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => adminApi.featureExperience(id, featured),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.experiences.public }),
    onError: () => toast({ title: t('toggleFeaturedError'), variant: 'destructive' }),
  });

  if (ready && !isAdmin) return null;
  if (!ready)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );

  const active = tab === 'blogs' ? blogs : experiences;
  const items = tab === 'blogs' ? (blogs.data?.items ?? []) : (experiences.data?.items ?? []);

  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('featuredTitle')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('featuredManageHint')}</p>

      <Tabs
        className="mt-5"
        active={tab}
        onChange={(key) => setTab(key as FeaturedTab)}
        items={[
          { key: 'blogs', label: t('blogs') },
          { key: 'experiences', label: t('experiences') },
        ]}
      />

      <div className="mt-6 space-y-2">
        {active.isLoading ? (
          <div className="flex min-h-[20vh] items-center justify-center"><Spinner size="lg" label={t('loading')} /></div>
        ) : active.isError ? (
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
            <AlertDescription className="text-destructive">{t('loadError')}</AlertDescription>
          </Alert>
        ) : items.length === 0 ? (
          <EmptyState
            icon={tab === 'blogs' ? <Newspaper className="h-5 w-5" /> : <PenLine className="h-5 w-5" />}
            title={tab === 'blogs' ? t('noBlogs') : t('noExperiences')}
          />
        ) : tab === 'blogs' ? (
          (blogs.data?.items ?? []).map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{b.title}</div>
                <div className="truncate text-[12px] text-muted">{b.author.displayName ?? b.author.username}</div>
              </div>
              <StarToggle on={b.featured} busy={toggleBlog.isPending} onClick={() => toggleBlog.mutate({ id: b.id, featured: !b.featured })} label={t('toggleFeatured')} />
            </div>
          ))
        ) : (
          (experiences.data?.items ?? []).map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-[14px]">{tiptapDocToText(e.body) || t('untitled')}</div>
                <div className="truncate text-[12px] text-muted">{e.author.displayName ?? e.author.username}</div>
              </div>
              <StarToggle on={e.featured} busy={toggleExp.isPending} onClick={() => toggleExp.mutate({ id: e.id, featured: !e.featured })} label={t('toggleFeatured')} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
