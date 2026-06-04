import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/auth/auth-shell';
import { StatusBanner } from '@/components/auth/status-banner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function verifyEmailToken(token: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      // Server-side: no CSRF cookie needed — guard only runs on browser requests
      cache: 'no-store',
    });

    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => ({}));
    return { ok: false, message: body.message || 'Verification failed.' };
  } catch {
    return { ok: false, message: 'Could not reach the server. Please try again.' };
  }
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations('auth.verifyEmail');
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : null;

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

  const result = await verifyEmailToken(token);

  if (result.ok) {
    return (
      <AuthShell hero={hero}>
        <StatusBanner
          variant="success"
          title={t('successTitle')}
          description={t('successDescription')}
        />
        <Link
          href="/login"
          className="inline-flex h-auto w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-[15px] font-medium text-bg hover:bg-accent-hover"
        >
          {t('continueToLogin')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell hero={hero}>
      <StatusBanner variant="error" title={t('failedTitle')} description={result.message} />
      <Link
        href="/login"
        className="inline-flex h-auto w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-[15px] font-medium text-bg hover:bg-accent-hover"
      >
        {t('backToLogin')}
      </Link>
    </AuthShell>
  );
}
