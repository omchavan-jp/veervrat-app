'use client';

import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/auth-shell';
import { StatusBanner } from '@/components/auth/status-banner';
import { useLinkGoogle } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';

const schema = z.object({
  password: z.string().min(8),
});
type FormInput = z.infer<typeof schema>;

export default function LinkAccountPage() {
  const t = useTranslations('auth.linkAccount');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const linkGoogle = useLinkGoogle();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({ resolver: zodResolver(schema) });

  const hero = {
    eyebrow: 'Link',
    heading: t('title'),
    devanagari: 'एकता हेच बल।',
    gloss: 'Unity is strength.',
  };

  if (!token) {
    return (
      <AuthShell hero={hero}>
        <StatusBanner variant="error" title={t('title')} description={t('noToken')} />
        <Link
          href="/login"
          className="inline-flex h-auto w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-[15px] font-medium text-bg hover:bg-accent-hover"
        >
          Back to login
        </Link>
      </AuthShell>
    );
  }

  if (linkGoogle.isSuccess) {
    return null; // redirect is handled in the hook — show nothing during navigation
  }

  const errorMsg = linkGoogle.error
    ? linkGoogle.error instanceof ApiError && linkGoogle.error.error === 'TOKEN_INVALID'
      ? t('expiredError')
      : linkGoogle.error instanceof ApiError && linkGoogle.error.error === 'INVALID_CREDENTIALS'
        ? t('wrongPasswordError')
        : linkGoogle.error.message
    : null;

  const onSubmit = (data: FormInput) => {
    linkGoogle.mutate({ token, password: data.password });
  };

  return (
    <AuthShell hero={hero}>
      <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('title')}</h2>
      <p className="mb-8 text-[15px] text-muted">{t('subtitle')}</p>

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-[rgba(192,81,47,0.2)] bg-[rgba(192,81,47,0.08)] px-4 py-3 text-sm text-accent">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            {t('passwordLabel')}
          </label>
          <Input
            type="password"
            placeholder={t('passwordPlaceholder')}
            className="rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-3 text-base focus-visible:border-accent focus-visible:ring-0"
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-accent">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={linkGoogle.isPending}
          className="h-auto w-full rounded-xl bg-accent px-6 py-3.5 text-[15px] text-bg hover:bg-accent-hover"
        >
          {linkGoogle.isPending ? t('submitting') : t('submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Changed your mind?{' '}
        <Link href="/login" className="text-accent underline decoration-accent/40 hover:no-underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
