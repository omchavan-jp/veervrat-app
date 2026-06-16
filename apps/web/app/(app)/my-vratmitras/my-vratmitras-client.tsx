'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api/client';
import { MessageSquare, Users, UserPlus } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';

interface VM {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  scope: 'GLOBAL' | 'JOURNEY';
  assignedJourneys: string[];
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function MyVratmitrasClient() {
  const t = useTranslations();

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-vms'],
    queryFn: async () => {
      const response = await api.get<{ data: VM[] }>('/vm-relationships/my-vms');
      return response?.data ?? [];
    },
    staleTime: 30000,
  });

  const vms = data ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
            {t('common.nav.groupGuidance')}
          </div>
          <h1 className="font-display text-[clamp(28px,3vw,40px)] leading-tight tracking-tight">
            {t('my_vratmitras.title')}
          </h1>
        </div>
        <Link
          href="/invitations"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-bg transition-colors hover:bg-accent-hover"
        >
          <UserPlus className="h-4 w-4" />
          {t('invitations_flow.inviteCta')}
        </Link>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {error && !isLoading && (
        <p className="py-12 text-center text-sm text-danger">{t('common.error_loading')}</p>
      )}

      {!isLoading && !error && vms.length === 0 && (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title={t('my_vratmitras.no_vms')}
          description={t('my_vratmitras.select_from_list')}
        />
      )}

      {!isLoading && vms.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {vms.map((vm) => (
            <div
              key={vm.id}
              className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition-colors hover:border-accent/40"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  {vm.avatarUrl && <AvatarImage src={vm.avatarUrl} />}
                  <AvatarFallback>{initialsOf(vm.displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${vm.username}`}
                    className="block truncate font-display text-[18px] leading-tight tracking-tight hover:text-accent"
                  >
                    {vm.displayName}
                  </Link>
                  <p className="truncate text-[13px] text-muted">@{vm.username}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    vm.scope === 'GLOBAL' ? 'bg-accent/12 text-accent' : 'bg-accent-2/15 text-accent-2'
                  }`}
                >
                  {vm.scope === 'GLOBAL' ? t('my_vratmitras.global_vm') : t('my_vratmitras.journey_vm')}
                </span>
              </div>

              {vm.assignedJourneys.length > 0 && (
                <p className="mt-3 text-[12px] text-muted">
                  {t('my_vratmitras.assigned_count', { count: vm.assignedJourneys.length })}
                </p>
              )}

              <Link
                href={`/my-vratmitras/${vm.id}/chat`}
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-bg transition-colors hover:bg-accent-hover active:scale-[0.98]"
              >
                <MessageSquare className="h-4 w-4" />
                {t('my_vratmitras.open_chat')}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
