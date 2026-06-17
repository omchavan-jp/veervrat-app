'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, ChevronRight } from 'lucide-react';
import { adminUsersApi, type AdminUserRow } from '@/lib/api/admin-users';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { useDebounce } from '@/hooks/use-debounce';
import { EmptyState } from '@/components/ui/empty-state';

function StatusBadge({ u }: { u: AdminUserRow }) {
  const t = useTranslations('adminUsers');
  if (u.anonymisedAt) return <span className="rounded-full bg-muted/20 px-2 py-0.5 text-[11px] text-muted">{t('anonymised')}</span>;
  if (u.suspendedAt) return <span className="rounded-full bg-danger/12 px-2 py-0.5 text-[11px] text-danger">{t('suspended')}</span>;
  return null;
}

export default function AdminUsersPage() {
  const t = useTranslations('adminUsers');
  const { isAdmin } = useAdminGuard();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 250);

  const list = useQuery({
    queryKey: queryKeys.adminUsers.list(debounced),
    queryFn: () => adminUsersApi.list(debounced || undefined),
    enabled: isAdmin,
  });

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-[14px] outline-none focus:border-accent"
        />
      </div>

      <div className="mt-6">
        {list.isLoading ? (
          <div className="flex min-h-[20vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} title={t('noUsers')} />
        ) : (
          <div className="space-y-2">
            {list.data!.items.map((u) => (
              <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-accent/30">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-2/15 text-[12px] font-medium text-accent-2">
                  {u.displayName.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-medium">{u.displayName}</span>
                    <StatusBadge u={u} />
                  </div>
                  <div className="truncate text-[12px] text-muted">@{u.username} · {u.email}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {u.roles.map((r) => (
                    <span key={r.role} className="rounded-full bg-fg/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{r.role}</span>
                  ))}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
