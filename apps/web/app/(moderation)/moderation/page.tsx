'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { FileCheck, Flag, ChevronRight } from 'lucide-react';
import { moderationApi } from '@/lib/api/moderation';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ModerationDashboardPage() {
  const t = useTranslations('moderation');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isMod = (user?.roles ?? []).some((r) => r === 'MODERATOR' || r === 'ADMIN');

  useEffect(() => {
    if (!isLoading && user && !isMod) router.replace('/dashboard');
  }, [isLoading, user, isMod, router]);

  const queue = useQuery({
    queryKey: queryKeys.moderation.customErcQueue,
    queryFn: () => moderationApi.getQueue(),
    enabled: isMod,
  });

  // While auth is resolving, isMod is false but no redirect has fired yet — show a
  // spinner instead of a blank flash, and only return null once auth has resolved.
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label={tCommon('loading')} />
      </div>
    );
  }

  if (!isMod) return null;

  const pendingCount = queue.data?.items.length ?? 0;

  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>

      <div className="mt-6 space-y-3">
        <Link href="/moderation/custom-erc" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-accent/30">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12 text-accent"><FileCheck className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium">{t('customErcTitle')}</div>
            <div className="text-[12px] text-muted">{t('customErcDesc')}</div>
          </div>
          {queue.isLoading ? (
            <Spinner size="sm" tone="muted" label={tCommon('loading')} />
          ) : (
            pendingCount > 0 && (
              <Badge className="shrink-0 bg-accent px-2 py-0.5 font-mono text-[11px] font-semibold text-bg">
                {pendingCount}
              </Badge>
            )
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </Link>

        {queue.isError && (
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
            <AlertDescription className="text-destructive">{t('queueError')}</AlertDescription>
          </Alert>
        )}

        {/* Reported comments — panel lands with a later moderation item; card shown for context. */}
        <div
          className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 opacity-60"
          aria-disabled="true"
          aria-describedby="reported-coming-soon"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/15 text-muted"><Flag className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium">{t('reportedTitle')}</div>
            <div id="reported-coming-soon" className="text-[12px] text-muted">{t('comingSoon')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
