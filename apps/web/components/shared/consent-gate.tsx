'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useOutstandingConsents, useAcceptConsents } from '@/hooks/use-consents';

const DOCUMENT_HREF: Record<string, string> = {
  terms: '/terms',
  privacy: '/privacy',
};

/**
 * Asks again when a policy document has been republished at a new version.
 *
 * Both documents say, in both languages, that a material change means being asked to accept the
 * new version and having that recorded. This is what honours that sentence — it is not a new
 * product decision, it is a promise the published text has been making since it went live
 * (deferred item 3.3).
 *
 * **Blocking on purpose.** A dismissible banner would let someone use the service indefinitely
 * under terms they have not agreed to, which is precisely the state the promise exists to
 * prevent. The links open the documents so nobody is asked to accept text they cannot read
 * first.
 *
 * Renders nothing while loading, and nothing on error. A failed check must not lock people out
 * of the product: the consequence of missing a re-prompt for one session is small, and the
 * consequence of an unclearable gate is that the app is unusable.
 */
export function ConsentGate({ enabled }: { enabled: boolean }) {
  const t = useTranslations('consent');
  const { data: outstanding } = useOutstandingConsents(enabled);
  const accept = useAcceptConsents();

  if (!outstanding || outstanding.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-gate-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <h2 id="consent-gate-title" className="mb-2 font-display text-[24px] tracking-tight">
          {t('title')}
        </h2>
        <p className="mb-4 text-[15px] text-muted">{t('body')}</p>

        <ul className="mb-6 space-y-2">
          {outstanding.map((doc) => (
            <li key={doc.documentKey}>
              <Link
                href={DOCUMENT_HREF[doc.documentKey] ?? '/'}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {t(`document.${doc.documentKey}`)}
              </Link>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          size="lg"
          className="min-h-12 w-full text-[15px]"
          disabled={accept.isPending}
          onClick={() => accept.mutate()}
        >
          {accept.isPending ? t('accepting') : t('accept')}
        </Button>

        {accept.isError && <p className="mt-3 text-[13px] text-destructive">{t('failed')}</p>}
      </div>
    </div>
  );
}
