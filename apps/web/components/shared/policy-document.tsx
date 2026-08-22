'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { cmsApi } from '@/lib/api/cms';
import { MessageContent } from '@/components/chat/message-content';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Renders a policy document from its CMS page.
 *
 * Deliberately reachable without signing in: people agree to these during signup, and a document
 * you must already have an account to read is not one anyone can meaningfully agree to.
 *
 * The version is not shown to the reader. It exists so consent records can point at a specific
 * text, and surfacing it would raise a question ("which version did I accept?") that this page
 * cannot answer.
 */
export function PolicyDocument({
  cmsKey,
  fallbackTitle,
}: {
  cmsKey: 'terms' | 'privacy';
  fallbackTitle: string;
}) {
  const locale = useLocale();
  const isMr = locale === 'mr';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cms-page', cmsKey],
    queryFn: () => cmsApi.getByKey(cmsKey),
  });

  const title = data ? (isMr && data.titleMr ? data.titleMr : data.titleEn) : fallbackTitle;
  const body = data ? (isMr && data.bodyMr ? data.bodyMr : data.bodyEn) : null;

  return (
    <div className="mx-auto max-w-[720px] px-5 py-10">
      <h1 className="mb-6 font-display text-[32px] tracking-tight">{title}</h1>

      {isLoading && <Spinner size="lg" label={title} />}

      {/* An error must not read as "this document does not exist" — the distinction matters when
          the thing being loaded is a legal commitment. */}
      {isError && (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
          <AlertDescription className="text-destructive">
            This document could not be loaded right now. Please try again shortly.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && !body && (
        <Alert>
          <AlertDescription>This document has not been published yet.</AlertDescription>
        </Alert>
      )}

      {body && (
        <div className="space-y-4 text-[15px] leading-relaxed">
          <MessageContent content={body} />
        </div>
      )}

      <p className="mt-10 text-sm text-muted">
        <Link
          href="/signup"
          className="text-accent underline decoration-accent/40 hover:no-underline"
        >
          ← Back
        </Link>
      </p>
    </div>
  );
}
