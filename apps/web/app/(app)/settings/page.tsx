'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User as UserIcon,
  ShieldCheck,
  Languages,
  Bell,
  KeyRound,
  Users as UsersIcon,
  RotateCcw,
} from 'lucide-react';
import { usersApi, type OwnProfile } from '@/lib/api/users';
import { vmRelationshipsApi, type MyVm, type GlobalVmCascade } from '@/lib/api/vm-relationships';
import { authApi } from '@/lib/api/auth';
import { queryKeys } from '@/lib/api/query-keys';
import { ApiError } from '@/lib/api/client';
import { setLocaleCookie } from '@/lib/locale';
import { useAuth, useLogout } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { Dialog } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { EMAILABLE_EVENTS } from '@/lib/notification-events';
import { getRuntimeConfig } from '@/lib/runtime-config';

function Section({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/12 text-accent">
          {icon}
        </span>
        <div>
          <h2 className="text-[16px] font-medium">{title}</h2>
          {desc && <p className="text-[12px] text-muted">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[14px]">{label}</span>
      <Switch aria-label={label} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const qc = useQueryClient();
  const { isLoading } = useAuth();
  const profile = useQuery({ queryKey: queryKeys.auth.me, queryFn: () => usersApi.getMyProfile() });

  if (isLoading || profile.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <div className="mx-auto max-w-[680px]">
        <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
        <EmptyState
          icon={<RotateCcw className="h-5 w-5" />}
          title={t('loadError')}
          description={t('loadErrorHint')}
          action={
            <Button variant="outline" onClick={() => profile.refetch()}>
              {t('retry')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>

      <div className="mt-6 space-y-4">
        <ProfileSection
          profile={profile.data}
          onSaved={() => qc.invalidateQueries({ queryKey: queryKeys.auth.me })}
        />
        <PrivacySection profile={profile.data} />
        <LanguageSection profile={profile.data} />
        <NotificationsSection profile={profile.data} />
        <VratmitraSection profile={profile.data} />
        <AccountSection profile={profile.data} />
      </div>
    </div>
  );
}

const INPUT_STYLE =
  'mt-1 h-auto rounded-xl border-border bg-bg px-3 py-2 text-[14px] focus-visible:border-accent focus-visible:ring-0';

// Splits a stored gender into the radio choice + custom text (mirrors onboarding,
// where 'Male'/'Female' are canonical and anything else was typed under 'other').
function splitGender(stored: string | null): {
  choice: '' | 'Male' | 'Female' | 'other';
  custom: string;
} {
  if (!stored) return { choice: '', custom: '' };
  if (stored === 'Male' || stored === 'Female') return { choice: stored, custom: '' };
  return { choice: 'other', custom: stored };
}

function ProfileSection({ profile, onSaved }: { profile: OwnProfile; onSaved: () => void }) {
  const t = useTranslations('settings');
  const { toast } = useToast();
  const initialGender = splitGender(profile.gender);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [genderChoice, setGenderChoice] = useState(initialGender.choice);
  const [genderCustom, setGenderCustom] = useState(initialGender.custom);
  const [dob, setDob] = useState(profile.dob ? profile.dob.slice(0, 10) : '');
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const usernameChanged = username.trim() !== profile.username;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const value = username.trim();
    if (!usernameChanged || value.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await authApi.checkUsername(value);
        setUsernameStatus(
          result.available ? 'available' : result.reason === 'invalid' ? 'invalid' : 'taken',
        );
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, usernameChanged]);

  const resolvedGender =
    genderChoice === 'other' ? genderCustom.trim() || null : genderChoice || null;

  const save = useMutation({
    mutationFn: () => {
      // Only changed fields go in the PATCH body.
      const body: Parameters<typeof usersApi.updateMe>[0] = {};
      if (displayName.trim() !== profile.displayName) body.displayName = displayName.trim();
      if (usernameChanged) body.username = username.trim();
      if (resolvedGender !== profile.gender) body.gender = resolvedGender;
      const initialDob = profile.dob ? profile.dob.slice(0, 10) : '';
      if (dob !== initialDob) body.dob = dob || null;
      return usersApi.updateMe(body);
    },
    onSuccess: () => {
      setError(null);
      toast({ title: t('profileSaved') });
      onSaved();
    },
    onError: (e: Error) => {
      if (e instanceof ApiError && e.statusCode === 409) {
        setUsernameStatus('taken');
        setError(t('usernameTaken'));
      } else {
        setError(e.message);
      }
    },
  });

  const usernameBlocked = usernameChanged && usernameStatus !== 'available';
  const dirty =
    displayName.trim() !== profile.displayName ||
    usernameChanged ||
    resolvedGender !== profile.gender ||
    dob !== (profile.dob ? profile.dob.slice(0, 10) : '');

  return (
    <Section
      icon={<UserIcon className="h-4 w-4" />}
      title={t('profileTitle')}
      desc={t('profileDesc')}
    >
      <div className="grid gap-3">
        <div>
          <Label htmlFor="settings-displayName" className="text-[12px] font-normal text-muted">
            {t('displayName')}
          </Label>
          <Input
            id="settings-displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={INPUT_STYLE}
          />
        </div>

        <div>
          <Label htmlFor="settings-username" className="text-[12px] font-normal text-muted">
            {t('username')}
          </Label>
          <Input
            id="settings-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            aria-invalid={
              usernameStatus === 'taken' || usernameStatus === 'invalid' ? true : undefined
            }
            aria-describedby="settings-username-status"
            className={INPUT_STYLE}
          />
          <div id="settings-username-status" aria-live="polite" className="mt-1 min-h-4">
            {usernameStatus === 'checking' && (
              <p className="text-[12px] text-muted">{t('usernameChecking')}</p>
            )}
            {usernameStatus === 'available' && (
              <p className="text-[12px] text-success">{t('usernameAvailable')}</p>
            )}
            {usernameStatus === 'taken' && (
              <p className="text-[12px] text-danger">{t('usernameTaken')}</p>
            )}
            {usernameStatus === 'invalid' && (
              <p className="text-[12px] text-danger">{t('usernameInvalid')}</p>
            )}
          </div>
          {usernameChanged && (
            <p className="rounded-lg bg-warning/10 px-2.5 py-1.5 text-[12px] text-fg">
              {t('usernameUrlWarning', { username: username.trim() || '…' })}
            </p>
          )}
        </div>

        <div>
          <span className="text-[12px] font-normal text-muted">{t('gender')}</span>
          <div
            className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-2"
            role="radiogroup"
            aria-label={t('gender')}
          >
            {(['Male', 'Female', 'other'] as const).map((val) => (
              <label key={val} className="flex cursor-pointer items-center gap-2 text-[14px]">
                <input
                  type="radio"
                  name="settings-gender"
                  checked={genderChoice === val}
                  onChange={() => setGenderChoice(val)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {val === 'Male'
                  ? t('genderMale')
                  : val === 'Female'
                    ? t('genderFemale')
                    : t('genderOther')}
              </label>
            ))}
          </div>
          {genderChoice === 'other' && (
            <Input
              value={genderCustom}
              onChange={(e) => setGenderCustom(e.target.value)}
              placeholder={t('genderCustomPlaceholder')}
              aria-label={t('genderCustomPlaceholder')}
              className={INPUT_STYLE}
            />
          )}
        </div>

        <div>
          <span className="text-[12px] font-normal text-muted">{t('dob')}</span>
          <div className="mt-1">
            <DatePicker
              value={dob}
              onChange={setDob}
              placeholder={t('dobPlaceholder')}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="text-[12px] text-muted">
          {t('email')}: <span className="text-fg">{profile.email}</span>
          {profile.pendingEmail && (
            <span className="ml-1 text-accent-2">
              ({t('pendingEmail', { email: profile.pendingEmail })})
            </span>
          )}
        </div>
        {error && (
          <p role="alert" className="text-[12px] text-danger">
            {error}
          </p>
        )}
        <div>
          <Button
            onClick={() => save.mutate()}
            loading={save.isPending}
            disabled={
              !displayName.trim() || !username.trim() || usernameBlocked || !dirty || save.isPending
            }
          >
            {t('save')}
          </Button>
        </div>
      </div>
    </Section>
  );
}

function PrivacySection({ profile }: { profile: OwnProfile }) {
  const t = useTranslations('settings');
  const qc = useQueryClient();
  const { toast } = useToast();
  const m = useMutation({
    mutationFn: (data: Parameters<typeof usersApi.updateSettings>[0]) =>
      usersApi.updateSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.me }),
    onError: () => toast({ title: t('saveError'), variant: 'destructive' }),
  });
  return (
    <Section
      icon={<ShieldCheck className="h-4 w-4" />}
      title={t('privacyTitle')}
      desc={t('privacyDesc')}
    >
      <Toggle
        label={t('showLastActive')}
        checked={profile.showLastActive}
        disabled={m.isPending}
        onChange={(v) => m.mutate({ showLastActive: v })}
      />
      <Toggle
        label={t('showOnlineIndicator')}
        checked={profile.showOnlineIndicator}
        disabled={m.isPending}
        onChange={(v) => m.mutate({ showOnlineIndicator: v })}
      />
      <Toggle
        label={t('profilePrivate')}
        checked={profile.profilePrivate}
        disabled={m.isPending}
        onChange={(v) => m.mutate({ profilePrivate: v })}
      />
    </Section>
  );
}

function LanguageSection({ profile }: { profile: OwnProfile }) {
  const t = useTranslations('settings');
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  const m = useMutation({
    mutationFn: (language: string) => {
      setLocaleCookie(language);
      router.refresh();
      return usersApi.updateSettings({ language });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.me }),
    onError: () => toast({ title: t('saveError'), variant: 'destructive' }),
  });
  return (
    <Section
      icon={<Languages className="h-4 w-4" />}
      title={t('languageTitle')}
      desc={t('languageDesc')}
    >
      <div className="flex gap-2">
        {(['EN', 'MR'] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => m.mutate(lang)}
            className={`rounded-xl border px-4 py-2 text-[14px] transition-colors ${profile.language === lang ? 'border-accent bg-accent/12 text-accent' : 'border-border text-muted hover:border-fg/30'}`}
          >
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
  const { toast } = useToast();
  const prefs = profile.notificationPrefs ?? {};
  const m = useMutation({
    mutationFn: (notificationPrefs: Record<string, boolean>) =>
      usersApi.updateSettings({ notificationPrefs }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.me }),
    onError: () => toast({ title: t('saveError'), variant: 'destructive' }),
  });
  return (
    <Section
      icon={<Bell className="h-4 w-4" />}
      title={t('notificationsTitle')}
      desc={t('notificationsDesc')}
    >
      <p className="mb-2 rounded-lg bg-accent-2/10 px-3 py-2 text-[12px] text-muted">
        {t('notificationsRollout')}
      </p>
      {EMAILABLE_EVENTS.map((event) => (
        <Toggle
          key={event}
          label={t(`event_${event}` as never)}
          checked={prefs[event] !== false}
          disabled={m.isPending}
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
  const { toast } = useToast();
  const [cascade, setCascade] = useState<GlobalVmCascade>('keep');
  const [confirming, setConfirming] = useState<null | 'remove' | 'change'>(null);
  const [tourDone, setTourDone] = useState(false);

  const vms = useQuery({
    queryKey: ['my-vms', 'GLOBAL'],
    queryFn: () => vmRelationshipsApi.getMyVms('GLOBAL'),
  });
  const globalVm: MyVm | undefined = vms.data?.find((v) => v.scope === 'GLOBAL');

  const remove = useMutation({
    mutationFn: () => vmRelationshipsApi.removeGlobalVm(cascade),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-vms'] });
      const action = confirming;
      setConfirming(null);
      // "Change" = remove then send a fresh global invite via the invitations flow.
      if (action === 'change') router.push('/invitations');
    },
    onError: () => toast({ title: t('saveError'), variant: 'destructive' }),
  });

  const restart = useMutation({
    mutationFn: () => usersApi.restartTour(),
    onSuccess: () => {
      setTourDone(true);
      qc.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
    onError: () => toast({ title: t('saveError'), variant: 'destructive' }),
  });

  return (
    <Section
      icon={<UsersIcon className="h-4 w-4" />}
      title={t('vratmitraTitle')}
      desc={t('vratmitraDesc')}
    >
      <div className="grid gap-4">
        <div>
          <div className="text-[12px] text-muted">{t('vratmitraGlobal')}</div>
          {globalVm ? (
            <div className="mt-1 flex items-center justify-between rounded-xl border border-border bg-bg px-3 py-2">
              <span className="text-[14px] text-fg">
                {globalVm.displayName} <span className="text-muted">@{globalVm.username}</span>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirming('change')}
                  disabled={remove.isPending}
                >
                  {t('vratmitraChange')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirming('remove')}
                  disabled={remove.isPending}
                >
                  {t('vratmitraRemove')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 flex items-center justify-between rounded-xl border border-border bg-bg px-3 py-2">
              <span className="text-[14px] text-muted">{t('vratmitraNone')}</span>
              <Button variant="outline" onClick={() => router.push('/invitations')}>
                {t('vratmitraInvite')}
              </Button>
            </div>
          )}
        </div>

        {confirming && (
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-[13px] text-fg">
              {confirming === 'change' ? t('vratmitraChangeConfirm') : t('vratmitraRemoveConfirm')}
            </p>
            <div className="mt-2 grid gap-1.5">
              <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                <input
                  type="radio"
                  name="cascade"
                  checked={cascade === 'keep'}
                  onChange={() => setCascade('keep')}
                />
                {t('vratmitraCascadeKeep')}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                <input
                  type="radio"
                  name="cascade"
                  checked={cascade === 'unassign'}
                  onChange={() => setCascade('unassign')}
                />
                {t('vratmitraCascadeUnassign')}
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => remove.mutate()}
                loading={remove.isPending}
                disabled={remove.isPending}
              >
                {t('vratmitraConfirm')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirming(null)}
                disabled={remove.isPending}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] text-fg">{t('vratmitraTour')}</div>
              <div className="text-[12px] text-muted">{t('vratmitraTourDesc')}</div>
            </div>
            <Button
              variant="outline"
              onClick={() => restart.mutate()}
              loading={restart.isPending}
              disabled={restart.isPending}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              {t('vratmitraRestartTour')}
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
  const { toast } = useToast();
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  const connected = useQuery({
    queryKey: queryKeys.connectedAccounts,
    queryFn: () => usersApi.listConnectedAccounts(),
  });

  const changePw = useMutation({
    mutationFn: () => usersApi.changePassword(pw.current, pw.next),
    onSuccess: () => {
      setPwMsg(t('passwordChanged'));
      setPw({ current: '', next: '' });
    },
    onError: (e: Error) => setPwMsg(e.message),
  });
  const changeEmail = useMutation({
    mutationFn: () =>
      authApi.requestEmailChange({
        newEmail: emailForm.newEmail.trim(),
        currentPassword: emailForm.password,
      }),
    onSuccess: () => {
      setEmailMsg(t('emailChangeSent'));
      setEmailForm({ newEmail: '', password: '' });
    },
    onError: (e: Error) => setEmailMsg(e.message),
  });
  const disconnect = useMutation({
    mutationFn: (provider: string) => usersApi.disconnectAccount(provider),
    onSuccess: () => connected.refetch(),
    onError: () => toast({ title: t('disconnectError'), variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (password: string) => usersApi.deleteAccount(password),
    onSuccess: () => {
      setDeleteOpen(false);
      logout.mutate();
      router.replace('/login');
    },
    onError: (e: Error) => setDeleteMsg(e.message),
  });

  return (
    <Section
      icon={<KeyRound className="h-4 w-4" />}
      title={t('accountTitle')}
      desc={t('accountDesc')}
    >
      {/* Change password */}
      <div className="mb-5">
        <h3 className="mb-2 text-[13px] font-medium">{t('changePassword')}</h3>
        <div className="grid gap-2">
          <div>
            <Label htmlFor="settings-currentPassword" className="sr-only">
              {t('currentPassword')}
            </Label>
            <Input
              id="settings-currentPassword"
              type="password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              placeholder={t('currentPassword')}
              className="h-auto rounded-xl border-border bg-bg px-3 py-2 text-[14px] focus-visible:border-accent focus-visible:ring-0"
            />
          </div>
          <div>
            <Label htmlFor="settings-newPassword" className="sr-only">
              {t('newPassword')}
            </Label>
            <Input
              id="settings-newPassword"
              type="password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
              placeholder={t('newPassword')}
              className="h-auto rounded-xl border-border bg-bg px-3 py-2 text-[14px] focus-visible:border-accent focus-visible:ring-0"
            />
          </div>
          {pwMsg && (
            <p role="alert" className="text-[12px] text-muted">
              {pwMsg}
            </p>
          )}
          <div>
            <Button
              onClick={() => changePw.mutate()}
              loading={changePw.isPending}
              disabled={!pw.current || pw.next.length < 8 || changePw.isPending}
            >
              {t('updatePassword')}
            </Button>
          </div>
        </div>
      </div>

      {/* Change email */}
      <div className="mb-5 border-t border-border pt-4">
        <h3 className="mb-2 text-[13px] font-medium">{t('changeEmail')}</h3>
        <div className="grid gap-2">
          <div>
            <Label htmlFor="settings-newEmail" className="sr-only">
              {t('newEmail')}
            </Label>
            <Input
              id="settings-newEmail"
              type="email"
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
              placeholder={t('newEmail')}
              className="h-auto rounded-xl border-border bg-bg px-3 py-2 text-[14px] focus-visible:border-accent focus-visible:ring-0"
            />
          </div>
          <div>
            <Label htmlFor="settings-emailPassword" className="sr-only">
              {t('currentPassword')}
            </Label>
            <Input
              id="settings-emailPassword"
              type="password"
              value={emailForm.password}
              onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
              placeholder={t('currentPassword')}
              className="h-auto rounded-xl border-border bg-bg px-3 py-2 text-[14px] focus-visible:border-accent focus-visible:ring-0"
            />
          </div>
          {emailMsg && (
            <p role="alert" className="text-[12px] text-muted">
              {emailMsg}
            </p>
          )}
          <div>
            <Button
              variant="outline"
              onClick={() => changeEmail.mutate()}
              loading={changeEmail.isPending}
              disabled={!emailForm.newEmail || !emailForm.password || changeEmail.isPending}
            >
              {t('sendConfirmation')}
            </Button>
          </div>
        </div>
      </div>

      {/* Connected accounts */}
      <div className="mb-5 border-t border-border pt-4">
        <h3 className="mb-2 text-[13px] font-medium">{t('connectedAccounts')}</h3>
        <div className="space-y-1.5">
          {(connected.data ?? []).map((acc) => (
            <div
              key={acc.provider}
              className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2 text-[13px]"
            >
              <span>{acc.provider === 'GOOGLE' ? 'Google' : t('emailPassword')}</span>
              {acc.provider === 'GOOGLE' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger"
                  onClick={() => disconnect.mutate(acc.provider)}
                  loading={disconnect.isPending}
                  disabled={disconnect.isPending}
                >
                  {t('disconnect')}
                </Button>
              )}
            </div>
          ))}
          {connected.data && !connected.data.some((acc) => acc.provider === 'GOOGLE') && (
            <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-bg px-3 py-2 text-[13px]">
              <span className="text-muted">Google</span>
              {/* Full-page navigation into the OAuth flow; the callback recognises the
                  matching email and routes through /link-account (password confirm). */}
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href={`${getRuntimeConfig().apiBaseUrl}/auth/google`} />}
              >
                {t('connectGoogle')}
              </Button>
            </div>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-muted">{t('connectGoogleHint')}</p>
      </div>

      {/* Delete account */}
      <div className="border-t border-border pt-4">
        <h3 className="mb-2 text-[13px] font-medium text-danger">{t('deleteAccount')}</h3>
        <p className="mb-2 text-[12px] text-muted">{t('deleteAccountWarning')}</p>
        <Button
          variant="destructive"
          disabled={del.isPending}
          onClick={() => {
            setDeletePassword('');
            setDeleteMsg(null);
            setDeleteOpen(true);
          }}
        >
          {t('deleteAccount')}
        </Button>
      </div>

      {/* Re-auth + confirm via Dialog (keyboard/AT friendly, focus-trapped) instead of
          native window.prompt/confirm. */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!del.isPending) setDeleteOpen(open);
        }}
        title={t('deleteAccount')}
        description={t('deleteConfirm')}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={del.isPending}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => del.mutate(deletePassword)}
              loading={del.isPending}
              disabled={!deletePassword || del.isPending}
            >
              {t('deleteAccount')}
            </Button>
          </>
        }
      >
        <Label htmlFor="settings-deletePassword" className="text-[12px] font-normal text-muted">
          {t('deleteReauthPrompt')}
        </Label>
        <Input
          id="settings-deletePassword"
          type="password"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          aria-invalid={deleteMsg ? true : undefined}
          aria-describedby={deleteMsg ? 'settings-deletePassword-error' : undefined}
          className="mt-1.5 h-auto rounded-xl border-border bg-bg px-3 py-2 text-[14px] focus-visible:border-accent focus-visible:ring-0"
        />
        {deleteMsg && (
          <p
            id="settings-deletePassword-error"
            role="alert"
            className="mt-1.5 text-[12px] text-danger"
          >
            {deleteMsg}
          </p>
        )}
      </Dialog>
    </Section>
  );
}
