'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PenLine, Pencil, Trash2, Globe, Users, Lock, BookText } from 'lucide-react';
import { experienceLogsApi, type ExperienceLog, type ExperienceVisibility } from '@/lib/api/experience-logs';
import { queryKeys } from '@/lib/api/query-keys';
import { excerptFromDoc } from '@/components/experience/experience-excerpt';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const VIS_ICON: Record<ExperienceVisibility, typeof Globe> = {
  PUBLIC: Globe,
  FRIENDS: Users,
  ONLY_ME: Lock,
};

export default function MyExperiencesPage() {
  const t = useTranslations('experiences');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.experiences.mine,
    queryFn: () => experienceLogsApi.getMine(),
  });

  const del = useMutation({
    mutationFn: (id: string) => experienceLogsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.experiences.mine }),
    onError: () => toast({ title: t('deleteError'), variant: 'destructive' }),
    onSettled: () => setPendingDeleteId(null),
  });

  const renderItem = (e: ExperienceLog) => {
    const Vis = VIS_ICON[e.visibility];
    return (
      <div key={e.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] text-muted">
          {e.isDraft && (
            <Badge variant="secondary" className="bg-warning/16 px-2 py-0.5 text-[11px] font-medium text-warning">{t('draft')}</Badge>
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
              <span key={`${tg.entityType}-${tg.entityId}`} className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
                {t(`entityType.${tg.entityType}`)}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            nativeButton={false}
            render={<Link href={`/experiences/${e.id}/edit`} />}
          >
            <Pencil className="h-3 w-3" /> {t('edit')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full hover:border-danger hover:text-danger"
            onClick={() => setPendingDeleteId(e.id)}
            disabled={del.isPending && del.variables === e.id}
          >
            <Trash2 className="h-3 w-3" /> {t('delete')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('myTitle')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('mySubtitle')}</p>
        </div>
        <Button size="sm" nativeButton={false} render={<Link href="/experiences/new" />}>
          <PenLine className="h-4 w-4" />
          <span className="ml-1.5">{t('newCta')}</span>
        </Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Spinner size="lg" label={t('loading')} />
          </div>
        ) : isError ? (
          <EmptyState
            icon={<BookText className="h-5 w-5" />}
            title={t('loadError')}
            description={t('loadErrorHint')}
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {t('retry')}
              </Button>
            }
          />
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={<PenLine className="h-5 w-5" />}
            title={t('emptyTitle')}
            description={t('emptyHint')}
            action={
              <Button size="sm" nativeButton={false} render={<Link href="/experiences/new" />}>
                {t('newCta')}
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">{data!.items.map(renderItem)}</div>
        )}
      </div>

      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title={t('deleteConfirmTitle')}
        description={t('deleteConfirmBody')}
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setPendingDeleteId(null)} disabled={del.isPending}>
              {t('deleteCancel')}
            </Button>
            <Button
              variant="destructive"
              type="button"
              loading={del.isPending}
              onClick={() => {
                if (pendingDeleteId) del.mutate(pendingDeleteId);
              }}
            >
              {t('delete')}
            </Button>
          </>
        }
      />
    </div>
  );
}
