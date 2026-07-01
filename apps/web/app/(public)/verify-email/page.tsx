import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/auth/auth-shell';
import { StatusBanner } from '@/components/auth/status-banner';
import { Button } from '@/components/ui/button';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// 'network' is distinguished from a server-returned failure so the page can show a
// localized network message rather than leaking the server's raw (English) string.
async function verifyEmailToken(
  token: string,
): Promise<{ ok: boolean; reason?: 'network' | 'rejected'; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      // Server-side render: no CSRF cookie needed — the CSRF guard only runs on
      // browser requests, so the typed (browser) API client isn't usable here.
      cache: 'no-store',
    });

    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => ({}));
    return { ok: false, reason: 'rejected', message: body.message };
  } catch {
    return { ok: false, reason: 'network' };
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
    eyebrow: t('heroEyebrow'),
    heading: t('title'),
    devanagari: t('heroDevanagari'),
    gloss: t('heroGloss'),
  };

  const BackButton = ({ label }: { label: string }) => (
    <Button
      size="lg"
      className="min-h-12 w-full text-[15px]"
      nativeButton={false}
      render={<Link href="/login" />}
    >
      {label}
    </Button>
  );

  if (!token) {
    return (
      <AuthShell hero={hero}>
        <StatusBanner variant="error" title={t('failedTitle')} description={t('invalidLink')} />
        <BackButton label={t('backToLogin')} />
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
        <BackButton label={t('continueToLogin')} />
      </AuthShell>
    );
  }

  // Localized failure copy — server-returned message only used as a last resort.
  const failureDescription =
    result.reason === 'network'
      ? t('networkError')
      : result.message ?? t('genericError');

  return (
    <AuthShell hero={hero}>
      <StatusBanner variant="error" title={t('failedTitle')} description={failureDescription} />
      <BackButton label={t('backToLogin')} />
    </AuthShell>
  );
}
