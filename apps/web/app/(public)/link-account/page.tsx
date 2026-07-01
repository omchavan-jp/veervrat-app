'use client';

import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthShell } from '@/components/auth/auth-shell';
import { StatusBanner } from '@/components/auth/status-banner';
import { useLinkGoogle } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';

const FIELD_LABEL = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

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
    eyebrow: t('heroEyebrow'),
    heading: t('title'),
    devanagari: t('heroDevanagari'),
    gloss: t('heroGloss'),
  };

  if (!token) {
    return (
      <AuthShell hero={hero}>
        <StatusBanner variant="error" title={t('title')} description={t('noToken')} />
        <Button
          size="lg"
          className="min-h-12 w-full text-[15px]"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          {t('backToLogin')}
        </Button>
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
        <Alert variant="destructive" className="mb-4 border-destructive/40 bg-destructive/10">
          <AlertDescription className="text-destructive">{errorMsg}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="link-password" className={FIELD_LABEL}>
            {t('passwordLabel')}
          </Label>
          <Input
            id="link-password"
            type="password"
            variant="underline"
            placeholder={t('passwordPlaceholder')}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'link-password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p id="link-password-error" role="alert" className="mt-1.5 text-xs text-danger">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          loading={linkGoogle.isPending}
          className="min-h-12 w-full text-[15px]"
        >
          {linkGoogle.isPending ? t('submitting') : t('submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t('changedMind')}{' '}
        <Link href="/login" className="text-accent underline decoration-accent/40 hover:no-underline">
          {t('backToLogin')}
        </Link>
      </p>
    </AuthShell>
  );
}
