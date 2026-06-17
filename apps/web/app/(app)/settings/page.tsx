'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User as UserIcon, ShieldCheck, Languages, Bell, KeyRound, Users as UsersIcon, RotateCcw } from 'lucide-react';
import { usersApi, type OwnProfile } from '@/lib/api/users';
import { vmRelationshipsApi, type MyVm, type GlobalVmCascade } from '@/lib/api/vm-relationships';
import { authApi } from '@/lib/api/auth';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuth, useLogout } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { EMAILABLE_EVENTS } from '@/lib/notification-events';

function Section({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/12 text-accent">{icon}</span>
        <div>
          <h2 className="text-[16px] font-medium">{title}</h2>
          {desc && <p className="text-[12px] text-muted">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2">
      <span className="text-[14px]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-muted/30'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-bg shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const qc = useQueryClient();
  const { isLoading } = useAuth();
  const profile = useQuery({ queryKey: queryKeys.auth.me, queryFn: () => usersApi.getMyProfile() });

  if (isLoading || profile.isLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  }
  if (!profile.data) return null;

  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>

      <div className="mt-6 space-y-4">
        <ProfileSection profile={profile.data} onSaved={() => qc.invalidateQueries({ queryKey: queryKeys.auth.me })} />
        <PrivacySection profile={profile.data} />
        <LanguageSection profile={profile.data} />
        <NotificationsSection profile={profile.data} />
        <VratmitraSection profile={profile.data} />
        <AccountSection profile={profile.data} />
      </div>
    </div>
  );
}

function ProfileSection({ profile, onSaved }: { profile: OwnProfile; onSaved: () => void }) {
  const t = useTranslations('settings');
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => usersApi.updateMe({ displayName: displayName.trim() }),
    onSuccess: () => { setError(null); onSaved(); },
    onError: (e: Error) => setError(e.message),
  });
  return (
    <Section icon={<UserIcon className="h-4 w-4" />} title={t('profileTitle')} desc={t('profileDesc')}>
      <div className="grid gap-3">
        <label className="text-[12px] text-muted">{t('displayName')}
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-[14px] text-fg outline-none focus:border-accent" />
        </label>
        <div className="text-[12px] text-muted">{t('username')}: <span className="text-fg">@{profile.username}</span></div>
        <div className="text-[12px] text-muted">{t('email')}: <span className="text-fg">{profile.email}</span>{profile.pendingEmail && <span className="ml-1 text-accent-2">({t('pendingEmail', { email: profile.pendingEmail })})</span>}</div>
        {error && <p className="text-[12px] text-danger">{error}</p>}
        <div><Button onClick={() => save.mutate()} disabled={!displayName.trim() || save.isPending}>{save.isPending ? '…' : t('save')}</Button></div>
      </div>
    </Section>
  );
}

function PrivacySection({ profile }: { profile: OwnProfile }) {
  const t = useTranslations('settings');
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (data: Parameters<typeof usersApi.updateSettings>[0]) => usersApi.updateSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.me }),
  });
  return (
    <Section icon={<ShieldCheck className="h-4 w-4" />} title={t('privacyTitle')} desc={t('privacyDesc')}>
      <Toggle label={t('showLastActive')} checked={profile.showLastActive} onChange={(v) => m.mutate({ showLastActive: v })} />
      <Toggle label={t('showOnlineIndicator')} checked={profile.showOnlineIndicator} onChange={(v) => m.mutate({ showOnlineIndicator: v })} />
      <Toggle label={t('profilePrivate')} checked={profile.profilePrivate} onChange={(v) => m.mutate({ profilePrivate: v })} />
    </Section>
  );
}

function LanguageSection({ profile }: { profile: OwnProfile }) {
  const t = useTranslations('settings');
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (language: string) => usersApi.updateSettings({ language }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.me }),
  });
  return (
    <Section icon={<Languages className="h-4 w-4" />} title={t('languageTitle')} desc={t('languageDesc')}>
      <div className="flex gap-2">
        {(['EN', 'MR'] as const).map((lang) => (
          <button key={lang} onClick={() => m.mutate(lang)} className={`rounded-xl border px-4 py-2 text-[14px] transition-colors ${profile.language === lang ? 'border-accent bg-accent/12 text-accent' : 'border-border text-muted hover:border-fg/30'}`}>
            {lang === 'EN' ? 'English' : 'मराठी'}
          </button>
        ))}
      </div>
    </Section>
  );
}

function NotificationsSection({ profile }: { profile: OwnProfile }) {
  const t = useTranslations('settings');
  const qc = useQueryClient();
  const prefs = profile.notificationPrefs ?? {};
  const m = useMutation({
    mutationFn: (notificationPrefs: Record<string, boolean>) => usersApi.updateSettings({ notificationPrefs }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.me }),
  });
  return (
    <Section icon={<Bell className="h-4 w-4" />} title={t('notificationsTitle')} desc={t('notificationsDesc')}>
      <p className="mb-2 rounded-lg bg-accent-2/10 px-3 py-2 text-[12px] text-muted">{t('notificationsRollout')}</p>
      {EMAILABLE_EVENTS.map((event) => (
        <Toggle
          key={event}
          label={t(`event_${event}` as never)}
          checked={prefs[event] !== false}
          onChange={(v) => m.mutate({ [event]: v })}
        />
      ))}
    </Section>
  );
}

function VratmitraSection({ profile }: { profile: OwnProfile }) {
  const t = useTranslations('settings');
  const router = useRouter();
  const qc = useQueryClient();
  const [cascade, setCascade] = useState<GlobalVmCascade>('keep');
  const [confirming, setConfirming] = useState<null | 'remove' | 'change'>(null);
  const [tourDone, setTourDone] = useState(false);

  const vms = useQuery({ queryKey: ['my-vms', 'GLOBAL'], queryFn: () => vmRelationshipsApi.getMyVms('GLOBAL') });
  const globalVm: MyVm | undefined = vms.data?.find((v) => v.scope === 'GLOBAL');

  const remove = useMutation({
    mutationFn: () => vmRelationshipsApi.removeGlobalVm(cascade),
    onSuccess: (_res, _vars, ctx) => {
      qc.invalidateQueries({ queryKey: ['my-vms'] });
      const action = confirming;
      setConfirming(null);
      // "Change" = remove then send a fresh global invite via the invitations flow.
      if (action === 'change') router.push('/invitations');
    },
  });

  const restart = useMutation({
    mutationFn: () => usersApi.restartTour(),
    onSuccess: () => { setTourDone(true); qc.invalidateQueries({ queryKey: queryKeys.auth.me }); },
  });

  return (
    <Section icon={<UsersIcon className="h-4 w-4" />} title={t('vratmitraTitle')} desc={t('vratmitraDesc')}>
      <div className="grid gap-4">
        <div>
          <div className="text-[12px] text-muted">{t('vratmitraGlobal')}</div>
          {globalVm ? (
            <div className="mt-1 flex items-center justify-between rounded-xl border border-border bg-bg px-3 py-2">
              <span className="text-[14px] text-fg">{globalVm.displayName} <span className="text-muted">@{globalVm.username}</span></span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setConfirming('change')} disabled={remove.isPending}>{t('vratmitraChange')}</Button>
                <Button variant="outline" onClick={() => setConfirming('remove')} disabled={remove.isPending}>{t('vratmitraRemove')}</Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 flex items-center justify-between rounded-xl border border-border bg-bg px-3 py-2">
              <span className="text-[14px] text-muted">{t('vratmitraNone')}</span>
              <Button variant="outline" onClick={() => router.push('/invitations')}>{t('vratmitraInvite')}</Button>
            </div>
          )}
        </div>

        {confirming && (
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-[13px] text-fg">{confirming === 'change' ? t('vratmitraChangeConfirm') : t('vratmitraRemoveConfirm')}</p>
            <div className="mt-2 grid gap-1.5">
              <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                <input type="radio" name="cascade" checked={cascade === 'keep'} onChange={() => setCascade('keep')} />
                {t('vratmitraCascadeKeep')}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                <input type="radio" name="cascade" checked={cascade === 'unassign'} onChange={() => setCascade('unassign')} />
                {t('vratmitraCascadeUnassign')}
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => remove.mutate()} disabled={remove.isPending}>{remove.isPending ? '…' : t('vratmitraConfirm')}</Button>
              <Button variant="outline" onClick={() => setConfirming(null)} disabled={remove.isPending}>{t('cancel')}</Button>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] text-fg">{t('vratmitraTour')}</div>
              <div className="text-[12px] text-muted">{t('vratmitraTourDesc')}</div>
            </div>
            <Button variant="outline" onClick={() => restart.mutate()} disabled={restart.isPending}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />{restart.isPending ? '…' : t('vratmitraRestartTour')}
            </Button>
          </div>
          {tourDone && <p className="mt-1 text-[12px] text-accent-2">{t('vratmitraTourReset')}</p>}
        </div>
      </div>
    </Section>
  );
}

function AccountSection({ profile }: { profile: OwnProfile }) {
  const t = useTranslations('settings');
  const router = useRouter();
  const logout = useLogout();
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const connected = useQuery({ queryKey: queryKeys.connectedAccounts, queryFn: () => usersApi.listConnectedAccounts() });

  const changePw = useMutation({
    mutationFn: () => usersApi.changePassword(pw.current, pw.next),
    onSuccess: () => { setPwMsg(t('passwordChanged')); setPw({ current: '', next: '' }); },
    onError: (e: Error) => setPwMsg(e.message),
  });
  const changeEmail = useMutation({
    mutationFn: () => authApi.requestEmailChange({ newEmail: emailForm.newEmail.trim(), currentPassword: emailForm.password }),
    onSuccess: () => { setEmailMsg(t('emailChangeSent')); setEmailForm({ newEmail: '', password: '' }); },
    onError: (e: Error) => setEmailMsg(e.message),
  });
  const disconnect = useMutation({
    mutationFn: (provider: string) => usersApi.disconnectAccount(provider),
    onSuccess: () => connected.refetch(),
  });
  const del = useMutation({
    mutationFn: (password: string) => usersApi.deleteAccount(password),
    onSuccess: () => { logout.mutate(); router.replace('/login'); },
  });

  return (
    <Section icon={<KeyRound className="h-4 w-4" />} title={t('accountTitle')} desc={t('accountDesc')}>
      {/* Change password */}
      <div className="mb-5">
        <h3 className="mb-2 text-[13px] font-medium">{t('changePassword')}</h3>
        <div className="grid gap-2">
          <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} placeholder={t('currentPassword')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
          <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder={t('newPassword')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
          {pwMsg && <p className="text-[12px] text-muted">{pwMsg}</p>}
          <div><Button onClick={() => changePw.mutate()} disabled={!pw.current || pw.next.length < 8 || changePw.isPending}>{changePw.isPending ? '…' : t('updatePassword')}</Button></div>
        </div>
      </div>

      {/* Change email */}
      <div className="mb-5 border-t border-border pt-4">
        <h3 className="mb-2 text-[13px] font-medium">{t('changeEmail')}</h3>
        <div className="grid gap-2">
          <input type="email" value={emailForm.newEmail} onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })} placeholder={t('newEmail')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
          <input type="password" value={emailForm.password} onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })} placeholder={t('currentPassword')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
          {emailMsg && <p className="text-[12px] text-muted">{emailMsg}</p>}
          <div><Button variant="outline" onClick={() => changeEmail.mutate()} disabled={!emailForm.newEmail || !emailForm.password || changeEmail.isPending}>{changeEmail.isPending ? '…' : t('sendConfirmation')}</Button></div>
        </div>
      </div>

      {/* Connected accounts */}
      <div className="mb-5 border-t border-border pt-4">
        <h3 className="mb-2 text-[13px] font-medium">{t('connectedAccounts')}</h3>
        <div className="space-y-1.5">
          {(connected.data ?? []).map((acc) => (
            <div key={acc.provider} className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2 text-[13px]">
              <span>{acc.provider === 'GOOGLE' ? 'Google' : t('emailPassword')}</span>
              {acc.provider === 'GOOGLE' && (
                <button onClick={() => disconnect.mutate(acc.provider)} disabled={disconnect.isPending} className="text-[12px] text-danger hover:underline disabled:opacity-50">{t('disconnect')}</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete account */}
      <div className="border-t border-border pt-4">
        <h3 className="mb-2 text-[13px] font-medium text-danger">{t('deleteAccount')}</h3>
        <p className="mb-2 text-[12px] text-muted">{t('deleteAccountWarning')}</p>
        <Button
          variant="destructive"
          disabled={del.isPending}
          onClick={() => {
            const password = window.prompt(t('deleteReauthPrompt') ?? '');
            if (password && password.length > 0 && window.confirm(t('deleteConfirm') ?? '')) del.mutate(password);
          }}
        >
          {t('deleteAccount')}
        </Button>
      </div>
    </Section>
  );
}
