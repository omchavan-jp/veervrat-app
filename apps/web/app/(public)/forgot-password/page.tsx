'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/auth-shell';
import { StatusBanner } from '@/components/auth/status-banner';
import { useForgotPassword } from '@/hooks/use-auth';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth';

const FIELD_LABEL = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword');
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

  const hero = {
    eyebrow: t('heroEyebrow'),
    heading: t('heroHeading'),
    devanagari: t('heroDevanagari'),
    gloss: t('heroGloss'),
  };

  // Three answers, where there used to be one (#196). This page previously showed a single
  // neutral confirmation whatever happened, to conceal whether an address is registered — which
  // signup already reveals by refusing a duplicate address. All the ambiguity bought was a person
  // who mistyped their address waiting for mail that would never arrive.
  if (forgotPassword.isSuccess) {
    const outcome = forgotPassword.data.status;

    // `no_account` uses the error styling deliberately: nothing was sent and the person has to do
    // something about it. Both mail-sent cases are successes; only the wording differs.
    const banner =
      outcome === 'no_account'
        ? {
            variant: 'error' as const,
            title: t('noAccountTitle'),
            body: t('noAccountDescription'),
          }
        : outcome === 'set_password_sent'
          ? {
              variant: 'success' as const,
              title: t('setPasswordTitle'),
              body: t('setPasswordDescription'),
            }
          : { variant: 'success' as const, title: t('sentTitle'), body: t('sentDescription') };

    return (
      <AuthShell hero={hero}>
        <StatusBanner variant={banner.variant} title={banner.title} description={banner.body} />
        {outcome === 'no_account' && (
          <Button
            size="lg"
            className="mt-4 min-h-12 w-full text-[15px]"
            nativeButton={false}
            render={<Link href="/signup" />}
          >
            {t('createAccount')}
          </Button>
        )}
        <Button
          size="lg"
          variant={outcome === 'no_account' ? 'outline' : undefined}
          className="mt-3 min-h-12 w-full text-[15px]"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          {t('backToLogin')}
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell hero={hero}>
      <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('title')}</h2>
      <p className="mb-8 text-[15px] text-muted">{t('subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="forgot-email" className={FIELD_LABEL}>
            {t('emailLabel')}
          </Label>
          <Input
            id="forgot-email"
            type="email"
            variant="underline"
            placeholder={t('emailPlaceholder')}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'forgot-email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="forgot-email-error" role="alert" className="mt-1.5 text-xs text-danger">
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
          {forgotPassword.isPending ? t('submitting') : t('submit')}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        {t('rememberedIt')}{' '}
        <Link
          href="/login"
          className="text-accent underline decoration-accent/40 hover:no-underline"
        >
          {t('backToLogin')}
        </Link>
      </p>
    </AuthShell>
  );
}
