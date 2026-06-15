'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PenLine, Pencil, Trash2, Globe, Users, Lock, BookText } from 'lucide-react';
import { experienceLogsApi, type ExperienceLog, type ExperienceVisibility } from '@/lib/api/experience-logs';
import { queryKeys } from '@/lib/api/query-keys';
import { excerptFromDoc } from '@/components/experience/experience-excerpt';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

const VIS_ICON: Record<ExperienceVisibility, typeof Globe> = {
  PUBLIC: Globe,
  FRIENDS: Users,
  ONLY_ME: Lock,
};

export default function MyExperiencesPage() {
  const t = useTranslations('experiences');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.experiences.mine,
    queryFn: () => experienceLogsApi.getMine(),
  });

  const del = useMutation({
    mutationFn: (id: string) => experienceLogsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.experiences.mine }),
  });

  const renderItem = (e: ExperienceLog) => {
    const Vis = VIS_ICON[e.visibility];
    return (
      <div key={e.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] text-muted">
          {e.isDraft && (
            <span className="rounded-full bg-warning/16 px-2 py-0.5 font-medium text-warning">{t('draft')}</span>
          )}
          <span className="inline-flex items-center gap-1">
            <Vis className="h-3 w-3" />
            {t(`visibilityOption.${e.visibility}`)}
          </span>
          <span>·</span>
          <span>{new Date(e.updatedAt).toLocaleDateString()}</span>
        </div>
        <p className="text-[14px] leading-relaxed">{excerptFromDoc(e.body) || t('untitled')}</p>
        {e.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {e.tags.map((tg) => (
              <span key={tg.id ?? tg.entityId} className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
                {tg.entityType.toLowerCase()}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Link
            href={`/experiences/${e.id}/edit`}
            className="inline-flex items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-[12px] text-muted hover:border-accent"
          >
            <Pencil className="h-3 w-3" /> {t('edit')}
          </Link>
          <button
            onClick={() => del.mutate(e.id)}
            disabled={del.isPending}
            className="inline-flex items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-[12px] text-muted hover:border-danger hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" /> {t('delete')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('myTitle')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('mySubtitle')}</p>
        </div>
        <Link href="/experiences/new">
          <Button size="sm">
            <PenLine className="h-4 w-4" />
            <span className="ml-1.5">{t('newCta')}</span>
          </Button>
        </Link>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : isError ? (
          <EmptyState
            icon={<BookText className="h-5 w-5" />}
            title={t('loadError')}
            description={t('loadErrorHint')}
            action={
              <button onClick={() => refetch()} className="rounded-full border border-border-strong px-4 py-1.5 text-[13px] hover:border-accent">
                {t('retry')}
              </button>
            }
          />
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={<PenLine className="h-5 w-5" />}
            title={t('emptyTitle')}
            description={t('emptyHint')}
            action={
              <Link href="/experiences/new">
                <Button size="sm">{t('newCta')}</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">{data!.items.map(renderItem)}</div>
        )}
      </div>
    </div>
  );
}
