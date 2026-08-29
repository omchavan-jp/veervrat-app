'use client';

import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthShell } from '@/components/auth/auth-shell';
import { ResendVerification } from '@/components/auth/resend-verification';
import { GoogleIcon } from '@/components/auth/google-icon';
import { useLogin } from '@/hooks/use-auth';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { ApiError } from '@/lib/api/client';
import { rateLimitRetryAfter } from '@/lib/api/rate-limit';
import { getRuntimeConfig } from '@/lib/runtime-config';

const FIELD_LABEL = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const tErrors = useTranslations('auth.errors');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');
  const login = useLogin();

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

  // A deleted account is not a failed sign-in and must not be reported as one. Google confirmed
  // the identity; what is gone is the account. The generic "something went wrong" would send
  // someone to retry the one thing guaranteed never to work.
  const isDeleted = oauthError === 'ACCOUNT_DELETED';
  const deletedAtParam = searchParams.get('deletedAt');
  const deletedAt = deletedAtParam ? new Date(deletedAtParam) : null;
  const deletedAtValid = deletedAt !== null && !Number.isNaN(deletedAt.getTime());

  // OAUTH_ACCOUNT_CONFLICT no longer lands here — it redirects to /link-account instead.
  // Only show a generic error for other OAuth failures (e.g. Google sign-in cancelled).
  const oauthErrorMsg =
    oauthError && oauthError !== 'OAUTH_ACCOUNT_CONFLICT' && !isDeleted
      ? tErrors('authError')
      : null;

  // Rate limiting is the one API failure with copy of its own. Everything else falls back to
  // the server's message, which is English-only — acceptable for the unexpected, not for a
  // refusal every tester will meet. See lib/api/rate-limit.ts for why lockout is folded in here.
  const retryAfter = rateLimitRetryAfter(login.error);
  const rateLimitMsg =
    retryAfter === null
      ? null
      : retryAfter === 0
        ? tErrors('rateLimitExceeded')
        : retryAfter >= 120
          ? tErrors('rateLimitExceededInMinutes', { minutes: Math.ceil(retryAfter / 60) })
          : tErrors('rateLimitExceededIn', { seconds: retryAfter });

  const apiError =
    rateLimitMsg ??
    (login.error instanceof ApiError ? login.error.message : login.error?.message);

  // An unverified address is recoverable, but only if we say so. Left as a bare refusal it is a
  // dead end: nothing else in the product ever tells the user a remedy exists, and they cannot
  // guess one. See openspec/changes/account-verification-recovery.
  const isUnverified =
    login.error instanceof ApiError && login.error.error === 'EMAIL_NOT_VERIFIED';

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

      {isDeleted && (
        <Alert className="mb-4 border-border bg-surface-2" data-testid="account-deleted-notice">
          <AlertDescription className="text-foreground">
            <span className="block font-medium">
              {deletedAtValid
                ? tErrors('accountDeletedOn', {
                    date: deletedAt.toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }),
                  })
                : tErrors('accountDeleted')}
            </span>
            <span className="mt-1 block text-[13px] text-muted">
              {tErrors('accountDeletedPermanent')}
            </span>
            <Link
              href="/signup"
              className="mt-3 inline-block text-[13px] underline underline-offset-4"
            >
              {tErrors('accountDeletedSignUp')}
            </Link>
          </AlertDescription>
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
            <ResendVerification email={() => getValues('email')} />
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
