'use client';

import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
        <Link
          href="/login"
          className="inline-flex h-auto w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-[15px] font-medium text-bg hover:bg-accent-hover"
        >
          {t('continueToLogin')}
        </Link>
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
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            Account email
          </label>
          <Input
            type="email"
            placeholder="you@example.com"
            className="rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-3 text-base focus-visible:border-accent focus-visible:ring-0"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-accent">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={forgotPassword.isPending}
          className="h-auto w-full rounded-xl bg-accent px-6 py-3.5 text-[15px] text-bg hover:bg-accent-hover"
        >
          {forgotPassword.isPending ? t('sendingNewLink') : t('sendNewLink')}
        </Button>
      </form>
    </>
  );
}

function heroForState(state: 'form' | 'success' | 'expired') {
  if (state === 'success') {
    return { eyebrow: 'Done', heading: 'A door reopened.', devanagari: 'पुनश्च हरि ॐ — सुरुवात पुन्हा.' };
  }
  if (state === 'expired') {
    return { eyebrow: 'Try again', heading: 'This link has gone quiet.', devanagari: 'कालः सर्वं भक्षयति।', gloss: 'Time consumes everything — including reset links. Ask for another.' };
  }
  return { eyebrow: 'Reset', heading: 'A new key for the same door.', devanagari: 'अनायासेन मरणं विना दैन्येन जीवनम्।', gloss: "Begin again, simply. Pick a passphrase you'll honour." };
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
    <AuthShell hero={heroForState(state)}>
      {state === 'expired' && <ExpiredState />}

      {state === 'success' && (
        <>
          <StatusBanner variant="success" title={t('successTitle')} description={t('successBody')} />
          <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('successTitle')}</h2>
          <p className="mb-6 text-[15px] text-muted">{t('successBody')}</p>
          <Link
            href="/login"
            className="inline-flex h-auto w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-[15px] font-medium text-bg hover:bg-accent-hover"
          >
            {t('continueToLogin')}
          </Link>
        </>
      )}

      {state === 'form' && (
        <>
          <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('title')}</h2>
          <p className="mb-8 text-[15px] text-muted">{t('subtitle')}</p>

          {resetPassword.error && !isExpired && (
            <div className="mb-4 rounded-xl border border-[rgba(192,81,47,0.2)] bg-[rgba(192,81,47,0.08)] px-4 py-3 text-sm text-accent">
              {resetPassword.error instanceof ApiError
                ? resetPassword.error.message
                : resetPassword.error.message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                {t('newPasswordLabel')}
              </label>
              <Input
                type="password"
                placeholder={t('newPasswordPlaceholder')}
                className="rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-3 text-base focus-visible:border-accent focus-visible:ring-0"
                {...register('newPassword')}
              />
              <PasswordStrength password={newPassword} />
              {errors.newPassword && (
                <p className="mt-1.5 text-xs text-accent">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                {t('confirmPasswordLabel')}
              </label>
              <Input
                type="password"
                placeholder={t('confirmPasswordPlaceholder')}
                className="rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-3 text-base focus-visible:border-accent focus-visible:ring-0"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-accent">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={resetPassword.isPending}
              className="h-auto w-full rounded-xl bg-accent px-6 py-3.5 text-[15px] text-bg hover:bg-accent-hover"
            >
              {resetPassword.isPending ? t('submitting') : t('submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t('wrongAccount')}{' '}
            <Link href="/login" className="text-accent underline decoration-accent/40 hover:no-underline">
              Login
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
