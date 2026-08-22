'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Library, FileText, LinkIcon, X } from 'lucide-react';
import { contentApi, type ResourceSummary, type ResourceDetail } from '@/lib/api/content';
import { queryKeys } from '@/lib/api/query-keys';
import { MessageContent } from '@/components/chat/message-content';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogPrimitive } from '@/components/ui/dialog';

type TypeFilter = '' | 'FILE' | 'LINK';

function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useTranslations('content');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.content.resource(id),
    queryFn: () => contentApi.resource(id),
  });
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      className="md:w-[min(600px,calc(100vw-40px))]"
    >
      <DialogPrimitive.Close
        aria-label={t('close')}
        className="absolute right-4 top-4 text-muted transition-colors hover:text-fg"
      >
        <X className="h-5 w-5" />
      </DialogPrimitive.Close>
      {isLoading ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : isError || !data ? (
        <EmptyState
          icon={<Library className="h-5 w-5" />}
          title={t('loadError')}
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t('retry')}
            </Button>
          }
        />
      ) : (
        <ResourceDetailBody data={data} />
      )}
    </Dialog>
  );
}

function ResourceDetailBody({ data }: { data: ResourceDetail }) {
  const t = useTranslations('content');
  return (
    <div>
      <h2 className="font-display text-[22px] font-medium leading-tight">{data.title}</h2>
      {data.oneLiner && <p className="mt-1 text-[14px] text-muted">{data.oneLiner}</p>}
      {data.url && (
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-2 inline-block text-[13px] text-accent hover:underline"
        >
          {t('openLink')}
        </a>
      )}
      {data.description && (
        <div className="prose mt-4 max-w-none text-[15px]">
          <MessageContent content={data.description} />
        </div>
      )}
      {(data.formalTags.length > 0 || data.looseTags.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {data.formalTags
            .filter((tg) => tg.name)
            .map((tg) => (
              <span
                key={tg.entityId}
                className="rounded-full bg-accent/12 px-2.5 py-0.5 text-[12px] text-accent"
              >
                {tg.name}
              </span>
            ))}
          {data.looseTags.map((lt) => (
            <span
              key={lt}
              className="rounded-full bg-muted/15 px-2.5 py-0.5 text-[12px] text-muted"
            >
              {lt}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResourcesPage() {
  const t = useTranslations('content');
  const [type, setType] = useState<TypeFilter>('');
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.content.resources(type || undefined),
    queryFn: () => contentApi.resources(type || undefined),
  });

  const items: ResourceSummary[] = data?.items ?? [];
  const filters: { key: TypeFilter; label: string }[] = [
    { key: '', label: t('all') },
    { key: 'LINK', label: t('links') },
    { key: 'FILE', label: t('files') },
  ];

  return (
    <div>
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('resourcesTitle')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('resourcesSubtitle')}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.key}
            variant="toggle"
            size="sm"
            aria-pressed={type === f.key}
            onClick={() => setType(f.key)}
            className="rounded-full px-3.5 py-1.5 text-[13px]"
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <p className="text-[13px] text-danger">{t('loadError')}</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Library className="h-5 w-5" />}
            title={t('resourcesEmpty')}
            description={t('resourcesEmptyHint')}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((r) => (
              <button
                key={r.id}
                onClick={() => setOpenId(r.id)}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-card transition-colors hover:border-accent/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent">
                  {r.type === 'LINK' ? (
                    <LinkIcon className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{r.title}</div>
                  {r.oneLiner && <div className="mt-0.5 text-[12px] text-muted">{r.oneLiner}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {openId && <DetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
