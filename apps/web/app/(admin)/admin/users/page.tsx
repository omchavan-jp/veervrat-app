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
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

function StatusBadge({ u }: { u: AdminUserRow }) {
  const t = useTranslations('adminUsers');
  if (u.anonymisedAt)
    return (
      <Badge variant="secondary" className="text-[11px] font-normal">
        {t('anonymised')}
      </Badge>
    );
  if (u.suspendedAt)
    return (
      <Badge variant="destructive" className="text-[11px] font-normal">
        {t('suspended')}
      </Badge>
    );
  return null;
}

// Grapheme-safe initials: Array.from splits on full code points so a Devanagari
// display name is not cut mid-cluster into a broken glyph.
function userInitials(name: string): string {
  return Array.from(name.trim()).slice(0, 2).join('').toUpperCase();
}

export default function AdminUsersPage() {
  const t = useTranslations('adminUsers');
  const { isAdmin, ready } = useAdminGuard();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 250);

  const list = useQuery({
    queryKey: queryKeys.adminUsers.list(debounced),
    queryFn: () => adminUsersApi.list(debounced || undefined),
    enabled: isAdmin,
  });

  if (ready && !isAdmin) return null;
  if (!ready)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>

      <div className="relative mt-5">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-[14px] focus:border-accent"
        />
      </div>

      <div className="mt-6">
        {list.isLoading ? (
          <div className="flex min-h-[20vh] items-center justify-center">
            <Spinner size="lg" label={t('loading')} />
          </div>
        ) : list.isError ? (
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
            <AlertDescription className="text-destructive">{t('loadError')}</AlertDescription>
          </Alert>
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} title={t('noUsers')} />
        ) : (
          <div className="space-y-2">
            {list.data!.items.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-accent/30"
              >
                <Avatar className="h-9 w-9 border-0">
                  <AvatarFallback className="bg-accent-2/15 text-[12px] text-accent-2">
                    {userInitials(u.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-medium">{u.displayName}</span>
                    <StatusBadge u={u} />
                  </div>
                  <div className="truncate text-[12px] text-muted">
                    @{u.username} · {u.email}
                  </div>
                </div>
                <div className="hidden shrink-0 gap-1 sm:flex">
                  {u.roles.map((r) => (
                    <span
                      key={r.role}
                      className="rounded-full bg-fg/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted"
                    >
                      {r.role}
                    </span>
                  ))}
                </div>
                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
