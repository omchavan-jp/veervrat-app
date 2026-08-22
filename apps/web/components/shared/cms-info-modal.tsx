'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { cmsApi } from '@/lib/api/cms';
import { queryKeys } from '@/lib/api/query-keys';
import { MessageContent } from '@/components/chat/message-content';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

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

  const { data, isPending } = useQuery({
    queryKey: queryKeys.cms.page(cmsKey),
    queryFn: () => cmsApi.getByKey(cmsKey),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const isMr = locale === 'mr';
  // While the CMS fetch is in flight (or if it errors / has no page), show the
  // fallback title; swap in the CMS title only once data arrives.
  const title = data ? (isMr && data.titleMr ? data.titleMr : data.titleEn) : fallbackTitle;
  const body = data ? (isMr && data.bodyMr ? data.bodyMr : data.bodyEn) : null;

  return (
    <>
      <Button
        variant="link"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-auto p-0 text-sm text-accent-2 underline decoration-accent-2/40 hover:no-underline"
      >
        {linkLabel}
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        footer={<Button onClick={() => setOpen(false)}>{t('close')}</Button>}
      >
        {open && isPending ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : body ? (
          <div className="text-[15px] leading-relaxed text-muted">
            <MessageContent content={body} />
          </div>
        ) : (
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted">
            {fallbackBody}
          </p>
        )}
      </Dialog>
    </>
  );
}
