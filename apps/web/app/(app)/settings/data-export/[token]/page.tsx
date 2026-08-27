'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Download, X } from 'lucide-react';
import { getRuntimeConfig } from '@/lib/runtime-config';
import { Spinner } from '@/components/ui/spinner';

/**
 * Emailed data-export download page.
 *
 * The token is verified server-side at `/api/v1/users/data-export/:token`, which returns
 * the JSON as a file download. This page just redirects the browser there, so clicking the
 * emailed link starts a download rather than showing raw JSON.
 */
export default function DataExportDownloadPage() {
  const { token } = useParams<{ token: string }>();
  const t = useTranslations('settings');
  const [error, setError] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started) return;
    setStarted(true);
    const url = `${getRuntimeConfig().apiBaseUrl}/users/data-export/${token}`;
    // Use fetch to detect errors before triggering download — a direct window.location
    // assignment shows the user a raw JSON error page on 404.
    fetch(url, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          setError(true);
          return;
        }
        return res.blob().then((blob) => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download =
            res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ??
            `veervrat-export.json`;
          a.click();
          URL.revokeObjectURL(a.href);
        });
      })
      .catch(() => setError(true));
  }, [token, started]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[460px] flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted/15 text-muted">
          <X className="h-6 w-6" />
        </div>
        <h1 className="font-display text-[26px] font-medium tracking-tight">
          {t('dataExportExpiredTitle')}
        </h1>
        <p className="mt-2 text-[14px] text-muted">{t('dataExportExpiredBody')}</p>
        <Link
          href="/settings"
          className="mt-6 rounded-xl border border-border-strong px-6 py-3 text-[14px] hover:border-accent"
        >
          {t('dataExportGoToSettings')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[460px] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Download className="h-6 w-6" />
      </div>
      <Spinner size="lg" label={t('dataExportDownloading')} />
    </div>
  );
}
