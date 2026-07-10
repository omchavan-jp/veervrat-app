'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { contentOverridesApi, type OverrideLocale } from '@/lib/api/content-overrides';

const LOCALES: OverrideLocale[] = ['en', 'mr'];

// "Version history"-style view of what's currently staged (unpublished) and who edited it.
export function ContentStagedList({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('contentEditor');
  const { data, isPending, isError } = useQuery({
    queryKey: ['content-overrides', 'staged'],
    queryFn: () => contentOverridesApi.list(),
    enabled: open,
  });

  const queryClient = useQueryClient();
  const router = useRouter();
  const discard = useMutation({
    mutationFn: (v: { key: string; locale: OverrideLocale }) => contentOverridesApi.discard(v),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content-overrides', 'staged'] });
      router.refresh();
    },
  });

  const items = data
    ? LOCALES.flatMap((locale) =>
        Object.entries(data[locale] ?? {}).map(([key, entry]) => ({ locale, key, ...entry })),
      ).sort((a, b) => (b.editedAt ?? '').localeCompare(a.editedAt ?? ''))
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('stagedTitle')}
      description={t('stagedSubtitle')}
      className="md:w-[min(560px,calc(100vw-40px))]"
    >
      {isPending ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" label={t('stagedLoading')} />
        </div>
      ) : isError ? (
        <p className="py-8 text-center text-[14px] text-muted">{t('stagedError')}</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-muted">{t('stagedEmpty')}</p>
      ) : (
        <ul className="flex max-h-[55dvh] flex-col gap-2 overflow-y-auto pr-1">
          {items.map((it) => (
            <li
              key={`${it.locale}:${it.key}`}
              className="rounded-[14px] border border-border bg-surface p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[11px] text-muted">{it.key}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-full bg-fg/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                    {it.locale}
                  </span>
                  <button
                    type="button"
                    aria-label={t('discard')}
                    onClick={() => discard.mutate({ key: it.key, locale: it.locale })}
                    disabled={discard.isPending}
                    className="rounded-full p-1 text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-[14px] leading-snug">{it.value}</p>
              <p className="mt-1.5 text-[12px] text-muted">
                {t('stagedBy', { name: it.editedByName })}
                {it.editedAt ? ` · ${formatWhen(it.editedAt)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}
