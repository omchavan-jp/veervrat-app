'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { useAuth, useCompleteOnboarding } from '@/hooks/use-auth';
import { accountSetupSchema, type AccountSetupInput } from '@/lib/validations/onboarding';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function AccountSetupPage() {
  const t = useTranslations('onboarding.accountSetup');
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const completeOnboarding = useCompleteOnboarding();
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading || completeOnboarding.isSuccess) return;
    // Fully onboarded → app.
    if (user && user.onboardingCompletedAt !== null) {
      router.replace('/dashboard');
      return;
    }
    // Account setup already done but framework not → resume at framework (un-skippable).
    if (user && user.accountSetupCompletedAt !== null) {
      router.replace('/onboarding/framework');
    }
  }, [isLoading, user, router, completeOnboarding.isSuccess]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<AccountSetupInput>({
    resolver: zodResolver(accountSetupSchema),
    defaultValues: { language: 'EN' },
  });

  // Populate form once user data arrives (user is null on first render while loading)
  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName ?? '',
        username: user.username ?? '',
        language: (user.language as 'EN' | 'MR') ?? 'EN',
      });
    }
  }, [user, reset]);

  const usernameValue = watch('username', '');
  const genderValue = watch('gender');

  const checkUsername = useCallback(
    (username: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!username || username.length < 3) {
        setUsernameStatus('idle');
        return;
      }
      // Own username: always available — no need to hit the API
      if (user?.username && username === user.username) {
        setUsernameStatus('available');
        return;
      }
      setUsernameStatus('checking');
      debounceRef.current = setTimeout(async () => {
        try {
          const result = await authApi.checkUsername(username);
          if (result.available) {
            setUsernameStatus('available');
          } else {
            setUsernameStatus(result.reason === 'invalid' ? 'invalid' : 'taken');
          }
        } catch {
          setUsernameStatus('idle');
        }
      }, 400);
    },
    [user?.username],
  );

  useEffect(() => {
    checkUsername(usernameValue);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [usernameValue, checkUsername]);

  const onSubmit = (data: AccountSetupInput) => {
    const resolvedGender =
      data.gender === 'other'
        ? (data.genderCustom?.trim() || undefined)
        : data.gender;

    completeOnboarding.mutate(
      {
        displayName: data.displayName,
        username: data.username,
        language: data.language,
        gender: resolvedGender,
        dob: data.dob || undefined,
      },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.statusCode === 409) {
            setError('username', { message: t('errors.usernameTaken') });
          }
        },
      },
    );
  };

  const apiError =
    completeOnboarding.error &&
    (!(completeOnboarding.error instanceof ApiError) || completeOnboarding.error.statusCode !== 409)
      ? completeOnboarding.error.message
      : null;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          Step 1 of 2
        </div>
        <h1 className="mb-2 font-display text-[clamp(28px,3vw,36px)] leading-tight tracking-tight">
          {t('title')}
        </h1>
        <p className="mb-8 text-[15px] text-muted">{t('subtitle')}</p>

        {apiError && (
          <div className="mb-4 rounded-xl border border-[rgba(192,81,47,0.2)] bg-[rgba(192,81,47,0.08)] px-4 py-3 text-sm text-accent">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {t('displayName')}
            </label>
            <Input
              type="text"
              placeholder={t('displayNamePlaceholder')}
              className="rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-3 text-base focus-visible:border-accent focus-visible:ring-0"
              {...register('displayName')}
            />
            {errors.displayName && (
              <p className="mt-1.5 text-xs text-accent">{errors.displayName.message}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {t('username')}
            </label>
            <Input
              type="text"
              placeholder={t('usernamePlaceholder')}
              className="rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-3 text-base focus-visible:border-accent focus-visible:ring-0"
              {...register('username')}
            />
            <div className="mt-1.5">
              {usernameStatus === 'checking' && (
                <p className="text-xs text-muted">{t('usernameChecking')}</p>
              )}
              {usernameStatus === 'available' && (
                <p className="text-xs text-accent-2">{t('usernameAvailable')}</p>
              )}
              {usernameStatus === 'taken' && (
                <p className="text-xs text-accent">{t('usernameTaken')}</p>
              )}
              {usernameStatus === 'invalid' && (
                <p className="text-xs text-accent">{t('usernameHint')}</p>
              )}
              {usernameStatus === 'idle' && (
                <p className="text-xs text-muted">{t('usernameHint')}</p>
              )}
            </div>
            {errors.username && (
              <p className="mt-1 text-xs text-accent">{errors.username.message}</p>
            )}
          </div>

          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {t('languageLabel')}
            </p>
            <div className="flex gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" value="EN" {...register('language')} className="accent-accent" />
                {t('en')}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" value="MR" {...register('language')} className="accent-accent" />
                {t('mr')}
              </label>
            </div>
            {errors.language && (
              <p className="mt-1.5 text-xs text-accent">{errors.language.message}</p>
            )}
          </div>

          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {t('gender')}
              <span className="ml-1 normal-case tracking-normal text-muted/60">{t('optional')}</span>
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {(['Male', 'Female', 'other'] as const).map((val) => (
                <label key={val} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" value={val} {...register('gender')} className="accent-accent" />
                  {val === 'other' ? t('genderOther') : val}
                </label>
              ))}
            </div>
            {genderValue === 'other' && (
              <Input
                type="text"
                placeholder={t('genderCustomPlaceholder')}
                className="mt-3 rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-3 text-base focus-visible:border-accent focus-visible:ring-0"
                {...register('genderCustom')}
              />
            )}
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {t('dob')}
              <span className="ml-1 normal-case tracking-normal text-muted/60">{t('optional')}</span>
            </label>
            <Controller
              name="dob"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={t('dobPlaceholder')}
                  max={new Date().toISOString().split('T')[0]}
                />
              )}
            />
            {errors.dob && (
              <p className="mt-1.5 text-xs text-accent">{errors.dob.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={completeOnboarding.isPending}
            className="h-auto w-full rounded-xl bg-accent px-6 py-3.5 text-[15px] text-bg hover:bg-accent-hover"
          >
            {completeOnboarding.isPending ? t('submitting') : t('submit')}
          </Button>
        </form>
      </div>
    </div>
  );
}
