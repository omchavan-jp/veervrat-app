'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/auth-shell';
import { useForgotPassword } from '@/hooks/use-auth';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth';

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
    eyebrow: 'Recover',
    heading: 'Forgot how to come back in?',
    devanagari: 'हरकत नाही. नवीन सुरुवात नेहमीच शक्य आहे.',
    gloss: 'No matter. A fresh start is always possible.',
  };

  if (forgotPassword.isSuccess) {
    return (
      <AuthShell hero={hero}>
        <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('successTitle')}</h2>
        <p className="mb-8 text-[15px] text-muted">{t('successDescription')}</p>
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            {t('emailLabel')}
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

        <Button
          type="submit"
          disabled={forgotPassword.isPending}
          className="h-auto w-full rounded-xl bg-accent px-6 py-3.5 text-[15px] text-bg hover:bg-accent-hover"
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
