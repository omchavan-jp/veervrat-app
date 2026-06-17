'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { auditApi } from '@/lib/api/audit';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { useDebounce } from '@/hooks/use-debounce';
import { EmptyState } from '@/components/ui/empty-state';

export default function AuditDashboardPage() {
  const t = useTranslations('audit');
  const { isAdmin } = useAdminGuard();
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const dAction = useDebounce(action, 250);
  const dActor = useDebounce(actor, 250);

  const list = useQuery({
    queryKey: queryKeys.audit.list(dAction, dActor),
    queryFn: () => auditApi.list({ action: dAction || undefined, actorId: dActor || undefined }),
    enabled: isAdmin,
  });

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-[860px]">
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <input value={action} onChange={(e) => setAction(e.target.value)} placeholder={t('filterAction')} className="rounded-xl border border-border bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent" />
        <input value={actor} onChange={(e) => setActor(e.target.value)} placeholder={t('filterActor')} className="rounded-xl border border-border bg-surface px-3 py-2 font-mono text-[13px] outline-none focus:border-accent" />
      </div>

      <div className="mt-6">
        {list.isLoading ? (
          <div className="flex min-h-[20vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={<ClipboardList className="h-5 w-5" />} title={t('noEvents')} />
        ) : (
          <div className="space-y-1.5">
            {list.data!.items.map((e) => (
              <div key={e.id} className="rounded-xl border border-border bg-surface p-3 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] text-accent">{e.action}</span>
                  <span className="font-mono text-[10px] text-muted">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  {t('actor')}: {e.actorId ?? '—'}{e.resourceType ? ` · ${e.resourceType}${e.resourceId ? `:${e.resourceId.slice(0, 8)}` : ''}` : ''}{e.ipAddress ? ` · ${e.ipAddress}` : ''}
                </div>
                {e.metadata && Object.keys(e.metadata).length > 0 && (
                  <pre className="mt-1 overflow-x-auto rounded bg-bg px-2 py-1 font-mono text-[11px] text-muted">{JSON.stringify(e.metadata)}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
