'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldOff, LogOut, UserX } from 'lucide-react';
import { useRuntimeConfig } from '@/lib/runtime-config-provider';
import { adminUsersApi, type AdminCapability, AdminRole } from '@/lib/api/admin-users';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const ALL_ROLES: AdminRole[] = ['VRATARTHI', 'VRATMITRA', 'MODERATOR', 'ADMIN'];

// What a person may TRY, as opposed to who they ARE. Kept as a separate list, and a separate
// section below, so the distinction stays visible to whoever is clicking.
const ALL_CAPABILITIES: AdminCapability[] = ['FEEDBACK_WIDGET', 'CONTENT_EDIT', 'CONTENT_SUGGEST'];
const JOURNEY_STATES = ['NOT_STARTED', 'ACTIVE', 'PAUSED', 'DORMANT', 'COMPLETED'];

// Grapheme-safe initials: Array.from splits on full code points so a Devanagari
// display name is not cut mid-cluster into a broken glyph.
function userInitials(name: string): string {
  return Array.from(name.trim()).slice(0, 2).join('').toUpperCase();
}

// A reason-collecting confirmation: anonymising the account, or overriding a
// journey's state. Both are irreversible/audited and need a typed reason, so they
// share one accessible Dialog instead of native window.prompt.
type PendingReason = { kind: 'anonymise' } | { kind: 'override'; journeyId: string; state: string };

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('adminUsers');
  const qc = useQueryClient();
  const { isAdmin, ready } = useAdminGuard();
  const [error, setError] = useState<string | null>(null);
  const [pendingReason, setPendingReason] = useState<PendingReason | null>(null);
  const [reasonInput, setReasonInput] = useState('');

  const detail = useQuery({
    queryKey: queryKeys.adminUsers.detail(id),
    queryFn: () => adminUsersApi.detail(id),
    enabled: isAdmin,
  });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.adminUsers.detail(id) });
    qc.invalidateQueries({ queryKey: ['admin', 'users'] });
  };
  const onErr = (e: Error) => setError(e.message);

  const toggleRole = useMutation({
    mutationFn: ({ role, has }: { role: AdminRole; has: boolean }) =>
      adminUsersApi.updateRoles(id, has ? { remove: [role] } : { add: [role] }),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: onErr,
  });
  const { environment, contentEditEnabled } = useRuntimeConfig();
  const toggleCapability = useMutation({
    mutationFn: ({ capability, has }: { capability: AdminCapability; has: boolean }) =>
      adminUsersApi.updateCapabilities(id, has ? { remove: [capability] } : { add: [capability] }),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: onErr,
  });
  const suspend = useMutation({
    mutationFn: (suspended: boolean) => adminUsersApi.suspend(id, suspended),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: onErr,
  });
  const forceLogout = useMutation({
    mutationFn: () => adminUsersApi.forceLogout(id),
    onError: onErr,
  });
  const closeReason = () => {
    setPendingReason(null);
    setReasonInput('');
  };
  const anonymise = useMutation({
    mutationFn: (reason: string) => adminUsersApi.anonymise(id, reason),
    onSuccess: () => {
      setError(null);
      closeReason();
      invalidate();
    },
    onError: onErr,
  });
  const override = useMutation({
    mutationFn: ({
      journeyId,
      state,
      reason,
    }: {
      journeyId: string;
      state: string;
      reason: string;
    }) => adminUsersApi.overrideJourneyState(journeyId, state, reason),
    onSuccess: () => {
      setError(null);
      closeReason();
      invalidate();
    },
    onError: onErr,
  });

  if (ready && !isAdmin) return null;
  if (!ready || detail.isLoading)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  if (detail.isError)
    return (
      <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
        <AlertDescription className="text-destructive">{t('loadError')}</AlertDescription>
      </Alert>
    );
  if (!detail.data) return <p className="text-[13px] text-danger">{t('notFound')}</p>;
  const u = detail.data;
  const roleSet = new Set(u.roles.map((r) => r.role));
  const capabilityMap = new Map((u.capabilities ?? []).map((c) => [c.capability, c]));
  // Both gates, not just the environment name: the editor can be off on UAT too, and a toggle
  // that saves without taking effect is the footgun the unavailable state exists to prevent.
  const isContentEditAvailable = environment !== 'prod' && contentEditEnabled;
  const reasonValid = reasonInput.trim().length >= 3;
  const reasonPending = anonymise.isPending || override.isPending;
  const submitReason = () => {
    if (!pendingReason || !reasonValid) return;
    const reason = reasonInput.trim();
    if (pendingReason.kind === 'anonymise') anonymise.mutate(reason);
    else
      override.mutate({ journeyId: pendingReason.journeyId, state: pendingReason.state, reason });
  };

  return (
    <div className="mx-auto max-w-[760px]">
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> {t('backToUsers')}
      </Link>

      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border-0">
          <AvatarFallback className="bg-accent-2/15 text-[16px] text-accent-2">
            {userInitials(u.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-medium tracking-tight">{u.displayName}</h1>
          <div className="text-[13px] text-muted">
            @{u.username} · {u.email}
          </div>
        </div>
      </div>

      {(u.suspendedAt || u.anonymisedAt) && (
        <Alert variant="destructive" className="mt-3 border-destructive/40 bg-destructive/10">
          <AlertDescription className="text-destructive">
            {u.anonymisedAt ? t('anonymisedNotice') : t('suspendedNotice')}
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mt-3 border-destructive/40 bg-destructive/10">
          <AlertDescription className="text-destructive">{error}</AlertDescription>
        </Alert>
      )}

      {/* Roles */}
      <section className="mt-6">
        <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {t('roles')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {ALL_ROLES.map((role) => {
            const has = roleSet.has(role);
            return (
              <button
                key={role}
                onClick={() => toggleRole.mutate({ role, has })}
                disabled={toggleRole.isPending}
                aria-pressed={has}
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors disabled:opacity-50 ${has ? 'border-accent bg-accent/12 text-accent' : 'border-border text-muted hover:border-fg/30'}`}
              >
                {t(`role.${role}`)}
              </button>
            );
          })}
        </div>
      </section>

      {/* Capabilities — deliberately separate from roles: these say what a person may TRY,
          not who they ARE. A capability the environment does not support is shown as
          unavailable rather than merely inert, so nobody toggles something that will never
          take effect. */}
      <section className="mt-6">
        <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {t('capabilities')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {ALL_CAPABILITIES.map((capability) => {
            const granted = capabilityMap.get(capability);
            const has = granted !== undefined;
            // Content editing is never available on prod, for anyone (O7) — the API refuses it
            // regardless of what is stored, so the control must not imply otherwise.
            const unavailable = capability === 'CONTENT_EDIT' && !isContentEditAvailable;
            return (
              <button
                key={capability}
                onClick={() => toggleCapability.mutate({ capability, has })}
                disabled={toggleCapability.isPending || unavailable}
                aria-pressed={has}
                title={
                  unavailable
                    ? t('capabilityUnavailable')
                    : granted
                      ? t('grantedOn', { date: new Date(granted.grantedAt).toLocaleDateString() })
                      : undefined
                }
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors disabled:opacity-50 ${has ? 'border-accent bg-accent/12 text-accent' : 'border-border text-muted hover:border-fg/30'}`}
              >
                {t(`capability.${capability}`)}
                {unavailable && (
                  <span className="ml-1.5 text-[10px] text-muted">({t('unavailableShort')})</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Account actions */}
      <section className="mt-6">
        <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {t('accountActions')}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => suspend.mutate(!u.suspendedAt)}
            disabled={suspend.isPending || !!u.anonymisedAt}
          >
            <ShieldOff aria-hidden="true" className="h-4 w-4" />{' '}
            {u.suspendedAt ? t('unsuspend') : t('suspend')}
          </Button>
          <Button
            variant="outline"
            onClick={() => forceLogout.mutate()}
            disabled={forceLogout.isPending}
          >
            <LogOut aria-hidden="true" className="h-4 w-4" /> {t('forceLogout')}
          </Button>
          <Button
            variant="destructive"
            disabled={anonymise.isPending || !!u.anonymisedAt}
            onClick={() => {
              setReasonInput('');
              setPendingReason({ kind: 'anonymise' });
            }}
          >
            <UserX aria-hidden="true" className="h-4 w-4" /> {t('anonymise')}
          </Button>
        </div>
      </section>

      {/* Journeys */}
      <section className="mt-6">
        <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {t('journeys')} ({u.journeys.length})
        </h2>
        <div className="space-y-2">
          {u.journeys.map((j) => (
            <div key={j.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[14px]">{j.title}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    {t(`journeyState.${j.state}`)}
                  </div>
                </div>
                <Select
                  value=""
                  onValueChange={(state) => {
                    if (!state) return;
                    setReasonInput('');
                    setPendingReason({ kind: 'override', journeyId: j.id, state });
                  }}
                >
                  <SelectTrigger
                    aria-label={t('overrideState')}
                    className="w-auto shrink-0 rounded-lg border-border bg-bg px-2 py-1 text-[12px]"
                  >
                    <SelectValue placeholder={t('overrideState')} />
                  </SelectTrigger>
                  <SelectContent>
                    {JOURNEY_STATES.filter((s) => s !== j.state).map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`journeyState.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {u.journeys.length === 0 && <p className="text-[13px] text-muted">{t('noJourneys')}</p>}
        </div>
      </section>

      {/* Tests + experiences (read-only counts/list) */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {t('tests')} ({u.testAttempts.length})
          </h2>
          <div className="space-y-1.5">
            {u.testAttempts.slice(0, 8).map((ta) => (
              <div
                key={ta.id}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px]"
              >
                {ta.weakness.nameEn}
                <span className="ml-1 text-[11px] text-muted">
                  · {ta.submittedAt ? t('submitted') : t('draft')}
                </span>
              </div>
            ))}
            {u.testAttempts.length === 0 && (
              <p className="text-[13px] text-muted">{t('noTests')}</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {t('experiences')} ({u.experienceLogs.length})
          </h2>
          <div className="space-y-1.5">
            {u.experienceLogs.slice(0, 8).map((el) => (
              <div
                key={el.id}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px]"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  {t(`visibility.${el.visibility}`)}
                </span>
                {el.isDraft && <span className="ml-1 text-[11px] text-muted">· {t('draft')}</span>}
              </div>
            ))}
            {u.experienceLogs.length === 0 && (
              <p className="text-[13px] text-muted">{t('noExperiences')}</p>
            )}
          </div>
        </div>
      </section>

      <Dialog
        open={pendingReason !== null}
        onOpenChange={(open) => {
          if (!open) closeReason();
        }}
        title={pendingReason?.kind === 'anonymise' ? t('anonymise') : t('overrideStateTitle')}
        description={
          pendingReason?.kind === 'anonymise'
            ? t('anonymiseReasonPrompt')
            : t('overrideReasonPrompt')
        }
        footer={
          <>
            <Button variant="ghost" onClick={closeReason}>
              {t('cancel')}
            </Button>
            <Button
              variant={pendingReason?.kind === 'anonymise' ? 'destructive' : 'default'}
              loading={reasonPending}
              disabled={!reasonValid || reasonPending}
              onClick={submitReason}
            >
              {t('confirm')}
            </Button>
          </>
        }
      >
        <div>
          <Label
            htmlFor="reason-input"
            className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted"
          >
            {t('reasonLabel')}
          </Label>
          <Input
            id="reason-input"
            autoFocus
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitReason();
            }}
            placeholder={t('reasonPlaceholder')}
          />
        </div>
      </Dialog>
    </div>
  );
}
