'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldOff, LogOut, UserX } from 'lucide-react';
import { adminUsersApi, type AdminRole } from '@/lib/api/admin-users';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { Button } from '@/components/ui/button';

const ALL_ROLES: AdminRole[] = ['VRATARTHI', 'VRATMITRA', 'MODERATOR', 'ADMIN'];
const JOURNEY_STATES = ['NOT_STARTED', 'ACTIVE', 'PAUSED', 'DORMANT', 'COMPLETED'];

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('adminUsers');
  const qc = useQueryClient();
  const { isAdmin } = useAdminGuard();
  const [error, setError] = useState<string | null>(null);

  const detail = useQuery({ queryKey: queryKeys.adminUsers.detail(id), queryFn: () => adminUsersApi.detail(id), enabled: isAdmin });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.adminUsers.detail(id) });
    qc.invalidateQueries({ queryKey: ['admin', 'users'] });
  };
  const onErr = (e: Error) => setError(e.message);

  const toggleRole = useMutation({
    mutationFn: ({ role, has }: { role: AdminRole; has: boolean }) =>
      adminUsersApi.updateRoles(id, has ? { remove: [role] } : { add: [role] }),
    onSuccess: () => { setError(null); invalidate(); },
    onError: onErr,
  });
  const suspend = useMutation({
    mutationFn: (suspended: boolean) => adminUsersApi.suspend(id, suspended),
    onSuccess: () => { setError(null); invalidate(); },
    onError: onErr,
  });
  const forceLogout = useMutation({ mutationFn: () => adminUsersApi.forceLogout(id), onError: onErr });
  const anonymise = useMutation({
    mutationFn: (reason: string) => adminUsersApi.anonymise(id, reason),
    onSuccess: () => { setError(null); invalidate(); },
    onError: onErr,
  });
  const override = useMutation({
    mutationFn: ({ journeyId, state, reason }: { journeyId: string; state: string; reason: string }) =>
      adminUsersApi.overrideJourneyState(journeyId, state, reason),
    onSuccess: () => { setError(null); invalidate(); },
    onError: onErr,
  });

  if (!isAdmin) return null;
  if (detail.isLoading) return <div className="flex min-h-[40vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  if (!detail.data) return <p className="text-[13px] text-danger">{t('notFound')}</p>;
  const u = detail.data;
  const roleSet = new Set(u.roles.map((r) => r.role));

  return (
    <div className="mx-auto max-w-[760px]">
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> {t('backToUsers')}</Link>

      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-2/15 text-[16px] font-medium text-accent-2">{u.displayName.slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-medium tracking-tight">{u.displayName}</h1>
          <div className="text-[13px] text-muted">@{u.username} · {u.email}</div>
        </div>
      </div>

      {(u.suspendedAt || u.anonymisedAt) && (
        <div className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {u.anonymisedAt ? t('anonymisedNotice') : t('suspendedNotice')}
        </div>
      )}
      {error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

      {/* Roles */}
      <section className="mt-6">
        <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t('roles')}</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_ROLES.map((role) => {
            const has = roleSet.has(role);
            return (
              <button
                key={role}
                onClick={() => toggleRole.mutate({ role, has })}
                disabled={toggleRole.isPending}
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors disabled:opacity-50 ${has ? 'border-accent bg-accent/12 text-accent' : 'border-border text-muted hover:border-fg/30'}`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </section>

      {/* Account actions */}
      <section className="mt-6">
        <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t('accountActions')}</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => suspend.mutate(!u.suspendedAt)} disabled={suspend.isPending || !!u.anonymisedAt}>
            <ShieldOff className="h-4 w-4" /> {u.suspendedAt ? t('unsuspend') : t('suspend')}
          </Button>
          <Button variant="outline" onClick={() => forceLogout.mutate()} disabled={forceLogout.isPending}>
            <LogOut className="h-4 w-4" /> {t('forceLogout')}
          </Button>
          <Button
            variant="destructive"
            disabled={anonymise.isPending || !!u.anonymisedAt}
            onClick={() => {
              const reason = window.prompt(t('anonymiseReasonPrompt') ?? '');
              if (reason && reason.trim().length >= 3) anonymise.mutate(reason.trim());
            }}
          >
            <UserX className="h-4 w-4" /> {t('anonymise')}
          </Button>
        </div>
      </section>

      {/* Journeys */}
      <section className="mt-6">
        <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t('journeys')} ({u.journeys.length})</h2>
        <div className="space-y-2">
          {u.journeys.map((j) => (
            <div key={j.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[14px]">{j.title}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{j.state}</div>
                </div>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const state = e.target.value;
                    e.target.value = '';
                    if (!state) return;
                    const reason = window.prompt(t('overrideReasonPrompt') ?? '');
                    if (reason && reason.trim().length >= 3) override.mutate({ journeyId: j.id, state, reason: reason.trim() });
                  }}
                  className="rounded-lg border border-border bg-bg px-2 py-1 text-[12px] outline-none focus:border-accent"
                >
                  <option value="">{t('overrideState')}</option>
                  {JOURNEY_STATES.filter((s) => s !== j.state).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
          {u.journeys.length === 0 && <p className="text-[13px] text-muted">{t('noJourneys')}</p>}
        </div>
      </section>

      {/* Tests + experiences (read-only counts/list) */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t('tests')} ({u.testAttempts.length})</h2>
          <div className="space-y-1.5">
            {u.testAttempts.slice(0, 8).map((ta) => (
              <div key={ta.id} className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px]">
                {ta.weakness.nameEn}
                <span className="ml-1 text-[11px] text-muted">· {ta.submittedAt ? t('submitted') : t('draft')}</span>
              </div>
            ))}
            {u.testAttempts.length === 0 && <p className="text-[13px] text-muted">{t('noTests')}</p>}
          </div>
        </div>
        <div>
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t('experiences')} ({u.experienceLogs.length})</h2>
          <div className="space-y-1.5">
            {u.experienceLogs.slice(0, 8).map((el) => (
              <div key={el.id} className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px]">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{el.visibility}</span>
                {el.isDraft && <span className="ml-1 text-[11px] text-muted">· {t('draft')}</span>}
              </div>
            ))}
            {u.experienceLogs.length === 0 && <p className="text-[13px] text-muted">{t('noExperiences')}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
