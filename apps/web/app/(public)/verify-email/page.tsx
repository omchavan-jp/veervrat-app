'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AuthShell } from '@/components/auth/auth-shell';
import { StatusBanner } from '@/components/auth/status-banner';
import { useVerifyEmail } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';

export default function VerifyEmailPage() {
  const t = useTranslations('auth.verifyEmail');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const verifyEmail = useVerifyEmail();
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (token && !hasAttempted.current) {
      hasAttempted.current = true;
      verifyEmail.mutate(token);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const hero = {
    eyebrow: 'Verify',
    heading: t('title'),
    devanagari: 'प्रमाणं हि प्रथमं पदम्।',
    gloss: 'Proof is the first step.',
  };

  if (!token) {
    return (
      <AuthShell hero={hero}>
        <StatusBanner variant="error" title={t('failedTitle')} description={t('invalidLink')} />
        <Link
          href="/login"
          className="inline-flex h-auto w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-[15px] font-medium text-bg hover:bg-accent-hover"
        >
          {t('backToLogin')}
        </Link>
      </AuthShell>
    );
  }

  if (verifyEmail.isPending) {
    return (
      <AuthShell hero={hero}>
        <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('verifyingTitle')}</h2>
        <p className="mb-6 text-[15px] text-muted">{t('verifyingBody')}</p>
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      </AuthShell>
    );
  }

  if (verifyEmail.isSuccess) {
    return (
      <AuthShell hero={hero}>
        <StatusBanner variant="success" title={t('successTitle')} description={t('successDescription')} />
        <Link
          href="/login"
          className="inline-flex h-auto w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-[15px] font-medium text-bg hover:bg-accent-hover"
        >
          {t('continueToLogin')}
        </Link>
      </AuthShell>
    );
  }

  const apiError =
    verifyEmail.error instanceof ApiError
      ? verifyEmail.error.message
      : verifyEmail.error?.message ?? 'Verification failed.';

  return (
    <AuthShell hero={hero}>
      <StatusBanner variant="error" title={t('failedTitle')} description={apiError} />
      <Link
        href="/login"
        className="inline-flex h-auto w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-[15px] font-medium text-bg hover:bg-accent-hover"
      >
        {t('backToLogin')}
      </Link>
    </AuthShell>
  );
}
