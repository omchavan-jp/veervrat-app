'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { authApi } from '@/lib/api/auth';
import { Logo } from '@/components/auth/logo';
import { Button } from '@/components/ui/button';

export default function ConfirmEmailChangePage() {
  const t = useTranslations('confirmEmailChange');
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    authApi
      .confirmEmailChange(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="font-display text-[22px] font-medium tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-[14px] text-muted">
          {status === 'pending' ? t('verifying') : status === 'success' ? t('success') : t('error')}
        </p>
        <div className="mt-6 flex flex-col items-center gap-4">
          {status === 'pending' && <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />}
          {status === 'success' && <Button onClick={() => router.push('/dashboard')}>{t('goToDashboard')}</Button>}
          {status === 'error' && <Link href="/settings" className="text-[14px] text-accent hover:underline">{t('backToSettings')}</Link>}
        </div>
      </div>
    </div>
  );
}
