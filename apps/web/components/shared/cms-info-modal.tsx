'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { cmsApi } from '@/lib/api/cms';
import { queryKeys } from '@/lib/api/query-keys';
import { MessageContent } from '@/components/chat/message-content';

// A "learn more" link that opens a modal whose copy is admin-managed via the CMS (keyed by
// `cmsKey`). When no CMS page exists for the key, it falls back to the static title/body
// passed in (the pre-CMS placeholder copy), so the UI degrades gracefully.
export function CmsInfoModal({
  cmsKey,
  linkLabel,
  fallbackTitle,
  fallbackBody,
}: {
  cmsKey: string;
  linkLabel: string;
  fallbackTitle: string;
  fallbackBody: string;
}) {
  const t = useTranslations('common');
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: queryKeys.cms.page(cmsKey),
    queryFn: () => cmsApi.getByKey(cmsKey),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const isMr = locale === 'mr';
  const title = data ? (isMr && data.titleMr ? data.titleMr : data.titleEn) : fallbackTitle;
  const body = data ? (isMr && data.bodyMr ? data.bodyMr : data.bodyEn) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-accent-2 underline decoration-accent-2/40 hover:no-underline"
      >
        {linkLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 px-4" onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-8 shadow-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 font-display text-[24px] tracking-tight">{title}</h2>
            {body ? (
              <div className="text-[15px] leading-relaxed text-muted">
                <MessageContent content={body} />
              </div>
            ) : (
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted">{fallbackBody}</p>
            )}
            <button
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex h-auto items-center justify-center rounded-xl bg-accent px-6 py-3 text-[14px] font-medium text-bg hover:bg-accent-hover"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
