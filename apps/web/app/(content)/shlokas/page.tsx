'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Search, ScrollText, X } from 'lucide-react';
import { contentApi, type Shloka, type ShlokaDetail } from '@/lib/api/content';
import { queryKeys } from '@/lib/api/query-keys';
import { useDebounce } from '@/hooks/use-debounce';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogPrimitive } from '@/components/ui/dialog';
import { CmsInfoModal } from '@/components/shared/cms-info-modal';

function ShlokaCard({ s, onOpen }: { s: Shloka; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="block w-full rounded-2xl border border-border bg-surface p-4 text-left shadow-card transition-colors hover:border-accent/30"
    >
      <div className="font-deva text-[17px] leading-relaxed">{s.devanagariText}</div>
      {s.sourceCitation && (
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          {s.sourceCitation}
        </div>
      )}
    </button>
  );
}

function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useTranslations('content');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.content.shloka(id),
    queryFn: () => contentApi.shloka(id),
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
          icon={<ScrollText className="h-5 w-5" />}
          title={t('loadError')}
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t('retry')}
            </Button>
          }
        />
      ) : (
        <ShlokaDetailBody data={data} />
      )}
    </Dialog>
  );
}

function ShlokaDetailBody({ data }: { data: ShlokaDetail }) {
  const t = useTranslations('content');
  return (
    <div>
      <div className="font-deva text-[22px] leading-relaxed">{data.devanagariText}</div>
      {data.transliteration && (
        <div className="mt-2 text-[13px] italic text-muted">{data.transliteration}</div>
      )}
      {data.meaningEn && <div className="mt-3 text-[15px]">{data.meaningEn}</div>}
      {data.meaningMr && (
        <div className="mt-1 font-deva text-[15px] text-muted">{data.meaningMr}</div>
      )}
      {data.sourceCitation && (
        <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          {data.sourceCitation}
        </div>
      )}
      {(data.formalTags.length > 0 || data.looseTags.length > 0) && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            {t('tags')}
          </div>
          <div className="flex flex-wrap gap-1.5">
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
        </div>
      )}
    </div>
  );
}

export default function ShlokasPage() {
  const t = useTranslations('content');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const debounced = useDebounce(query, 250);
  const searching = debounced.trim().length >= 2;

  const list = useQuery({
    queryKey: queryKeys.content.shlokas(),
    queryFn: () => contentApi.shlokas(),
    enabled: !searching,
  });
  const search = useQuery({
    queryKey: queryKeys.content.shlokaSearch(debounced),
    queryFn: () => contentApi.searchShlokas(debounced),
    enabled: searching,
  });

  const items: Shloka[] = searching ? (search.data ?? []) : (list.data?.items ?? []);
  const loading = searching ? search.isLoading : list.isLoading;

  return (
    <div>
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('shlokasTitle')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('shlokasSubtitle')}</p>
      <div className="mt-2">
        <CmsInfoModal
          cmsKey="why-shlokas"
          linkLabel={t('whyShlokasLink')}
          fallbackTitle={t('whyShlokasTitle')}
          fallbackBody={t('whyShlokasBody')}
        />
      </div>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('shlokaSearchPlaceholder')}
          aria-label={t('shlokaSearchPlaceholder')}
          className="h-auto rounded-xl border-border bg-surface py-2.5 pl-9 pr-3 text-[14px] focus-visible:border-accent focus-visible:ring-0"
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="h-5 w-5" />}
            title={searching ? t('noResults') : t('shlokasEmpty')}
            description={searching ? undefined : t('shlokasEmptyHint')}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((s) => (
              <ShlokaCard key={s.id} s={s} onOpen={() => setOpenId(s.id)} />
            ))}
          </div>
        )}
      </div>

      {openId && <DetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
