'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Fieldset, FieldsetLegend } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { DatePicker } from '@/components/ui/date-picker';
import { useAuth, useCompleteOnboarding } from '@/hooks/use-auth';
import { accountSetupSchema, type AccountSetupInput } from '@/lib/validations/onboarding';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

const FIELD_LABEL = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

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
      data.gender === 'other' ? data.genderCustom?.trim() || undefined : data.gender;

    completeOnboarding.mutate(
      {
        displayName: data.displayName,
        username: data.username,
        language: data.language,
        gender: resolvedGender,
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

  // Block submit on a username state known to fail server-side (or still resolving),
  // not just on the in-flight mutation.
  const usernameBlocksSubmit =
    usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking';

  // Gate on isLoading so the form does not flash with empty defaults (and any
  // redirect flicker) before the authenticated user resolves.
  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          {t('stepIndicator', { current: 1, total: 2 })}
        </div>
        <h1 className="mb-2 font-display text-[clamp(28px,3vw,36px)] leading-tight tracking-tight">
          {t('title')}
        </h1>
        <p className="mb-8 text-[15px] text-muted">{t('subtitle')}</p>

        {apiError && (
          <Alert variant="destructive" className="mb-4 border-destructive/40 bg-destructive/10">
            <AlertDescription className="text-destructive">{apiError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="account-displayName" className={FIELD_LABEL}>
              {t('displayName')}
            </Label>
            <Input
              id="account-displayName"
              type="text"
              variant="underline"
              placeholder={t('displayNamePlaceholder')}
              aria-invalid={errors.displayName ? true : undefined}
              aria-describedby={errors.displayName ? 'account-displayName-error' : undefined}
              {...register('displayName')}
            />
            {errors.displayName && (
              <p id="account-displayName-error" role="alert" className="mt-1.5 text-xs text-danger">
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="account-username" className={FIELD_LABEL}>
              {t('username')}
            </Label>
            <Input
              id="account-username"
              type="text"
              variant="underline"
              placeholder={t('usernamePlaceholder')}
              aria-invalid={
                errors.username || usernameStatus === 'taken' || usernameStatus === 'invalid'
                  ? true
                  : undefined
              }
              aria-describedby="account-username-status"
              {...register('username')}
            />
            {/* Fixed min-height so toggling status lines does not shift the layout while typing. */}
            <div className="mt-1.5 min-h-5" id="account-username-status" aria-live="polite">
              {usernameStatus === 'checking' && (
                <p className="text-xs text-muted">{t('usernameChecking')}</p>
              )}
              {usernameStatus === 'available' && (
                <p className="text-xs text-success">{t('usernameAvailable')}</p>
              )}
              {usernameStatus === 'taken' && (
                <p className="text-xs text-danger">{t('usernameTaken')}</p>
              )}
              {usernameStatus === 'invalid' && (
                <p className="text-xs text-danger">{t('usernameHint')}</p>
              )}
              {usernameStatus === 'idle' && (
                <p className="text-xs text-muted">{t('usernameHint')}</p>
              )}
            </div>
            {errors.username && (
              <p role="alert" className="mt-1 text-xs text-danger">
                {errors.username.message}
              </p>
            )}
          </div>

          <Fieldset>
            <FieldsetLegend className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {t('languageLabel')}
            </FieldsetLegend>
            <Controller
              control={control}
              name="language"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex flex-row gap-6"
                  aria-label={t('languageLabel')}
                >
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                    <RadioGroupItem value="EN" />
                    {t('en')}
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                    <RadioGroupItem value="MR" />
                    {t('mr')}
                  </label>
                </RadioGroup>
              )}
            />
            {errors.language && (
              <p role="alert" className="mt-1.5 text-xs text-danger">
                {errors.language.message}
              </p>
            )}
          </Fieldset>

          <Fieldset>
            <FieldsetLegend className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {t('gender')}
              <span className="ml-1 normal-case tracking-normal text-muted/60">
                {t('optional')}
              </span>
            </FieldsetLegend>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <RadioGroup
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  className="flex flex-row flex-wrap gap-x-6 gap-y-3"
                  aria-label={t('gender')}
                >
                  {(['Male', 'Female', 'other'] as const).map((val) => (
                    <label
                      key={val}
                      className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
                    >
                      <RadioGroupItem value={val} />
                      {val === 'Male'
                        ? t('genderMale')
                        : val === 'Female'
                          ? t('genderFemale')
                          : t('genderOther')}
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
            {genderValue === 'other' && (
              <Input
                type="text"
                variant="underline"
                className="mt-3"
                placeholder={t('genderCustomPlaceholder')}
                aria-label={t('genderCustomPlaceholder')}
                {...register('genderCustom')}
              />
            )}
          </Fieldset>

          <Button
            type="submit"
            size="lg"
            loading={completeOnboarding.isPending}
            disabled={usernameBlocksSubmit}
            className="min-h-12 w-full text-[15px]"
          >
            {completeOnboarding.isPending ? t('submitting') : t('submit')}
          </Button>
        </form>
      </div>
    </div>
  );
}
