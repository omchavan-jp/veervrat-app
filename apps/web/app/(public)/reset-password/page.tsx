'use client';

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
import { StatusBanner } from '@/components/auth/status-banner';
import { PasswordStrength } from '@/components/auth/password-strength';
import { useResetPassword, useForgotPassword } from '@/hooks/use-auth';
import {
  resetPasswordSchema,
  forgotPasswordSchema,
  type ResetPasswordInput,
  type ForgotPasswordInput,
} from '@/lib/validations/auth';
import { ApiError } from '@/lib/api/client';

const FIELD_LABEL = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

function ExpiredState() {
  const t = useTranslations('auth.resetPassword');
  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordInput) => {
    forgotPassword.mutate(data.email);
  };

  if (forgotPassword.isSuccess) {
    return (
      <>
        <StatusBanner
          variant="success"
          title={t('newLinkSentTitle')}
          description={t('newLinkSentDescription')}
        />
        <Button
          size="lg"
          className="min-h-12 w-full text-[15px]"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          {t('continueToLogin')}
        </Button>
      </>
    );
  }

  return (
    <>
      <StatusBanner
        variant="error"
        title={t('expiredTitle')}
        description={t('expiredBody')}
      />

      <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('requestNewTitle')}</h2>
      <p className="mb-8 text-[15px] text-muted">{t('requestNewSubtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="reset-resend-email" className={FIELD_LABEL}>
            {t('accountEmailLabel')}
          </Label>
          <Input
            id="reset-resend-email"
            type="email"
            variant="underline"
            placeholder={t('accountEmailPlaceholder')}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'reset-resend-email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="reset-resend-email-error" role="alert" className="mt-1.5 text-xs text-danger">
              {errors.email.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          loading={forgotPassword.isPending}
          className="min-h-12 w-full text-[15px]"
        >
          {forgotPassword.isPending ? t('sendingNewLink') : t('sendNewLink')}
        </Button>
      </form>
    </>
  );
}

function heroForState(
  state: 'form' | 'success' | 'expired',
  t: ReturnType<typeof useTranslations>,
) {
  if (state === 'success') {
    return {
      eyebrow: t('heroSuccessEyebrow'),
      heading: t('heroSuccessHeading'),
      devanagari: t('heroSuccessDevanagari'),
    };
  }
  if (state === 'expired') {
    return {
      eyebrow: t('heroExpiredEyebrow'),
      heading: t('heroExpiredHeading'),
      devanagari: t('heroExpiredDevanagari'),
      gloss: t('heroExpiredGloss'),
    };
  }
  return {
    eyebrow: t('heroFormEyebrow'),
    heading: t('heroFormHeading'),
    devanagari: t('heroFormDevanagari'),
    gloss: t('heroFormGloss'),
  };
}

export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const newPassword = watch('newPassword', '');

  const onSubmit = (data: ResetPasswordInput) => {
    if (!token) return;
    resetPassword.mutate({ token, newPassword: data.newPassword });
  };

  const isExpired =
    !token ||
    (resetPassword.error instanceof ApiError &&
      ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_NOT_FOUND'].includes(resetPassword.error.error));

  const state: 'form' | 'success' | 'expired' = resetPassword.isSuccess
    ? 'success'
    : isExpired
      ? 'expired'
      : 'form';

  return (
    <AuthShell hero={heroForState(state, t)}>
      {state === 'expired' && <ExpiredState />}

      {state === 'success' && (
        <>
          <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('successTitle')}</h2>
          <p className="mb-6 text-[15px] text-muted">{t('successBody')}</p>
          <Button
            size="lg"
            className="min-h-12 w-full text-[15px]"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            {t('continueToLogin')}
          </Button>
        </>
      )}

      {state === 'form' && (
        <>
          <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('title')}</h2>
          <p className="mb-8 text-[15px] text-muted">{t('subtitle')}</p>

          {resetPassword.error && !isExpired && (
            <Alert variant="destructive" className="mb-4 border-destructive/40 bg-destructive/10">
              <AlertDescription className="text-destructive">
                {resetPassword.error.message}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="reset-new-password" className={FIELD_LABEL}>
                {t('newPasswordLabel')}
              </Label>
              <Input
                id="reset-new-password"
                type="password"
                variant="underline"
                placeholder={t('newPasswordPlaceholder')}
                aria-invalid={errors.newPassword ? true : undefined}
                aria-describedby={errors.newPassword ? 'reset-new-password-error' : undefined}
                {...register('newPassword')}
              />
              <PasswordStrength password={newPassword} />
              {errors.newPassword && (
                <p id="reset-new-password-error" role="alert" className="mt-1.5 text-xs text-danger">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="reset-confirm-password" className={FIELD_LABEL}>
                {t('confirmPasswordLabel')}
              </Label>
              <Input
                id="reset-confirm-password"
                type="password"
                variant="underline"
                placeholder={t('confirmPasswordPlaceholder')}
                aria-invalid={errors.confirmPassword ? true : undefined}
                aria-describedby={errors.confirmPassword ? 'reset-confirm-password-error' : undefined}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p id="reset-confirm-password-error" role="alert" className="mt-1.5 text-xs text-danger">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              loading={resetPassword.isPending}
              className="min-h-12 w-full text-[15px]"
            >
              {resetPassword.isPending ? t('submitting') : t('submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t('wrongAccount')}{' '}
            <Link href="/login" className="text-accent underline decoration-accent/40 hover:no-underline">
              {t('loginLink')}
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
