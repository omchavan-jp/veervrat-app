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
import { tiptapDocToText } from '@/lib/tiptap-text';

function StarToggle({ on, onClick, busy }: { on: boolean; onClick: () => void; busy: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${on ? 'text-amber-500 hover:bg-amber-500/10' : 'text-muted hover:bg-fg/[0.04] hover:text-fg'}`}
      aria-pressed={on}
    >
      <Star className="h-4 w-4" fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}

export default function FeaturedPanel() {
  const t = useTranslations('admin');
  const qc = useQueryClient();
  const { isAdmin } = useAdminGuard();
  const [tab, setTab] = useState<'blogs' | 'experiences'>('blogs');

  const blogs = useQuery({ queryKey: queryKeys.blogs.list, queryFn: () => blogsApi.list(), enabled: isAdmin });
  const experiences = useQuery({ queryKey: queryKeys.experiences.public, queryFn: () => experienceLogsApi.getPublic(), enabled: isAdmin });

  const toggleBlog = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => adminApi.featureBlog(id, featured),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.blogs.list }),
  });
  const toggleExp = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => adminApi.featureExperience(id, featured),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.experiences.public }),
  });

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('featuredTitle')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('featuredManageHint')}</p>

      <div className="mt-5 flex gap-1 rounded-xl border border-border bg-surface p-1">
        <button onClick={() => setTab('blogs')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors ${tab === 'blogs' ? 'bg-accent/12 text-accent' : 'text-muted hover:text-fg'}`}>
          <Newspaper className="h-4 w-4" /> {t('blogs')}
        </button>
        <button onClick={() => setTab('experiences')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors ${tab === 'experiences' ? 'bg-accent/12 text-accent' : 'text-muted hover:text-fg'}`}>
          <PenLine className="h-4 w-4" /> {t('experiences')}
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {tab === 'blogs' &&
          (blogs.data?.items ?? []).map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{b.title}</div>
                <div className="truncate text-[12px] text-muted">{b.author.displayName ?? b.author.username}</div>
              </div>
              <StarToggle on={b.featured} busy={toggleBlog.isPending} onClick={() => toggleBlog.mutate({ id: b.id, featured: !b.featured })} />
            </div>
          ))}

        {tab === 'experiences' &&
          (experiences.data?.items ?? []).map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px]">{tiptapDocToText(e.body).slice(0, 80) || t('untitled')}</div>
                <div className="truncate text-[12px] text-muted">{e.author.displayName ?? e.author.username}</div>
              </div>
              <StarToggle on={e.featured} busy={toggleExp.isPending} onClick={() => toggleExp.mutate({ id: e.id, featured: !e.featured })} />
            </div>
          ))}
      </div>
    </div>
  );
}
