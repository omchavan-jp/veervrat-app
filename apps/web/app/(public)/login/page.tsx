'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthShell } from '@/components/auth/auth-shell';
import { GoogleIcon } from '@/components/auth/google-icon';
import { useLogin } from '@/hooks/use-auth';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { ApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { getRuntimeConfig } from '@/lib/runtime-config';

const FIELD_LABEL = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const tErrors = useTranslations('auth.errors');
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');
  const login = useLogin();

  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginInput) => {
    login.mutate(data);
  };

  // OAUTH_ACCOUNT_CONFLICT no longer lands here — it redirects to /link-account instead.
  // Only show a generic error for other OAuth failures (e.g. Google sign-in cancelled).
  const oauthErrorMsg = oauthError && oauthError !== 'OAUTH_ACCOUNT_CONFLICT'
    ? tErrors('authError')
    : null;

  const apiError =
    login.error instanceof ApiError ? login.error.message : login.error?.message;

  // An unverified address is recoverable, but only if we say so. Left as a bare refusal it is a
  // dead end: nothing else in the product ever tells the user a remedy exists, and they cannot
  // guess one. See openspec/changes/account-verification-recovery.
  const isUnverified = login.error instanceof ApiError && login.error.error === 'EMAIL_NOT_VERIFIED';

  const onResend = async () => {
    setResendState('sending');
    try {
      await authApi.resendVerification(getValues('email'));
    } catch {
      // Deliberately ignored. The endpoint answers identically for every address to avoid
      // disclosing whether an account exists; surfacing a failure here would leak exactly what
      // that design protects. The user is told to check their inbox either way.
    }
    setResendState('sent');
  };

  return (
    <AuthShell
      hero={{
        eyebrow: t('heroEyebrow'),
        heading: t('heroHeading'),
        devanagari: t('heroDevanagari'),
        gloss: t('heroGloss'),
      }}
    >
      <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('title')}</h2>
      <p className="mb-8 text-[15px] text-muted">{t('subtitle')}</p>

      {oauthErrorMsg && (
        <Alert variant="destructive" className="mb-4 border-destructive/40 bg-destructive/10">
          <AlertDescription className="text-destructive">{oauthErrorMsg}</AlertDescription>
        </Alert>
      )}

      {apiError && !isUnverified && (
        <Alert variant="destructive" className="mb-4 border-destructive/40 bg-destructive/10">
          <AlertDescription className="text-destructive">{apiError}</AlertDescription>
        </Alert>
      )}

      {isUnverified && (
        <Alert variant="destructive" className="mb-4 border-destructive/40 bg-destructive/10">
          <AlertDescription className="text-destructive">
            <span className="block">{tErrors('emailNotVerified')}</span>
            {resendState === 'sent' ? (
              <span className="mt-2 block font-medium">{tErrors('resendVerificationSent')}</span>
            ) : (
              <button
                type="button"
                onClick={onResend}
                disabled={resendState === 'sending'}
                className="mt-2 block underline underline-offset-2 disabled:opacity-60"
              >
                {resendState === 'sending'
                  ? tErrors('resendVerificationSending')
                  : tErrors('resendVerification')}
              </button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="login-email" className={FIELD_LABEL}>
            {t('email')}
          </Label>
          <Input
            id="login-email"
            type="email"
            variant="underline"
            placeholder={t('emailPlaceholder')}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="login-email-error" role="alert" className="mt-1.5 text-xs text-danger">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="login-password" className={FIELD_LABEL}>
            {t('password')}
          </Label>
          <Input
            id="login-password"
            type="password"
            variant="underline"
            placeholder={t('passwordPlaceholder')}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p id="login-password-error" role="alert" className="mt-1.5 text-xs text-danger">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="-mt-2 text-right">
          <Link
            href="/forgot-password"
            className="text-[13px] text-accent-2 underline decoration-accent-2/30"
          >
            {t('forgotPassword')}
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={login.isPending}
          className="min-h-12 w-full text-[15px]"
        >
          {login.isPending ? t('submitting') : t('submit')}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          {t('orDivider')}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        size="lg"
        className="min-h-12 w-full text-[15px]"
        nativeButton={false}
        render={<a href={`${getRuntimeConfig().apiBaseUrl}/auth/google`} />}
      >
        <GoogleIcon className="h-[18px] w-[18px]" />
        {t('googleCta')}
      </Button>

      <p className="mt-6 text-center text-sm text-muted">
        {t('noAccount')}{' '}
        <Link
          href="/signup"
          className="text-accent underline decoration-accent/40 hover:no-underline"
        >
          {t('signupLink')}
        </Link>
      </p>
    </AuthShell>
  );
}
