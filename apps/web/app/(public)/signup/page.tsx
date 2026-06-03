'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/auth-shell';
import { GoogleIcon } from '@/components/auth/google-icon';
import { PasswordStrength } from '@/components/auth/password-strength';
import { useSignup } from '@/hooks/use-auth';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

export default function SignupPage() {
  const t = useTranslations('auth.signup');
  const signup = useSignup();
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { language: 'EN' },
  });

  const usernameValue = watch('username', '');
  const passwordValue = watch('password', '');

  const checkUsername = useCallback((username: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const available = await authApi.checkUsername(username);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);
  }, []);

  useEffect(() => {
    checkUsername(usernameValue);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [usernameValue, checkUsername]);

  const onSubmit = (data: SignupInput) => {
    signup.mutate(data);
  };

  const apiError =
    signup.error instanceof ApiError ? signup.error.message : signup.error?.message;

  const hero = {
    eyebrow: 'Begin',
    heading: 'A practice of becoming, one weakness at a time.',
    devanagari: 'वीरव्रत — स्वतःशी प्रामाणिक राहण्याचा संकल्प.',
    gloss: 'Veervrat — the vow to be honest with oneself. Identify what holds you back. Work on it daily. Track the shift.',
  };

  if (signup.isSuccess) {
    return (
      <AuthShell hero={hero}>
        <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('successTitle')}</h2>
        <p className="mb-8 text-[15px] text-muted">{t('successBody')}</p>
        <Link
          href="/login"
          className="inline-flex h-auto w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-[15px] font-medium text-bg hover:bg-accent-hover"
        >
          {t('backToLogin')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell hero={hero}>
      <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('title')}</h2>
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
            {usernameStatus === 'idle' && (
              <p className="text-xs text-muted">{t('usernameHint')}</p>
            )}
          </div>
          {errors.username && (
            <p className="mt-1 text-xs text-accent">{errors.username.message}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            {t('email')}
          </label>
          <Input
            type="email"
            placeholder={t('emailPlaceholder')}
            className="rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-3 text-base focus-visible:border-accent focus-visible:ring-0"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-accent">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            {t('password')}
          </label>
          <Input
            type="password"
            placeholder={t('passwordPlaceholder')}
            className="rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-3 text-base focus-visible:border-accent focus-visible:ring-0"
            {...register('password')}
          />
          <PasswordStrength password={passwordValue} />
          {errors.password && (
            <p className="mt-1 text-xs text-accent">{errors.password.message}</p>
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

        <Button
          type="submit"
          disabled={signup.isPending}
          className="h-auto w-full rounded-xl bg-accent px-6 py-3.5 text-[15px] text-bg hover:bg-accent-hover"
        >
          {signup.isPending ? t('submitting') : t('submit')}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="h-auto w-full rounded-xl border-border-strong bg-surface px-6 py-3.5 text-[15px] text-fg hover:bg-bg"
        nativeButton={false}
        render={<a href={`${API_URL}/auth/google`} />}
      >
        <GoogleIcon className="h-[18px] w-[18px]" />
        {t('googleCta')}
      </Button>

      <p className="mt-6 text-center text-sm text-muted">
        {t('hasAccount')}{' '}
        <Link
          href="/login"
          className="text-accent underline decoration-accent/40 hover:no-underline"
        >
          {t('loginLink')}
        </Link>
      </p>
    </AuthShell>
  );
}
