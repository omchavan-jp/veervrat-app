'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResendVerification } from './resend-verification';

const FIELD_LABEL = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

/**
 * A resend offer for someone who has no session and no failed login to attach it to.
 *
 * The inline banner on /login covers people who came back to sign in. It does not cover the case
 * in #96: register, never receive the mail, never return to login — and never find the resend at
 * all. Landing on an expired verification link puts someone in exactly that position, which is
 * why this appears on the failure states of /verify-email rather than on a page of its own.
 *
 * The address is asked for because a verification token is opaque: when one is rejected we
 * cannot tell whose it was.
 */
export function ResendVerificationForm() {
  const t = useTranslations('auth.verifyEmail');
  const [email, setEmail] = useState('');
  const trimmed = email.trim();

  return (
    <div className="mt-6 border-t border-border/60 pt-6">
      <p className="mb-4 text-[15px] text-muted">{t('resendPrompt')}</p>

      <Label htmlFor="resend-email" className={FIELD_LABEL}>
        {t('emailLabel')}
      </Label>
      <Input
        id="resend-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('emailPlaceholder')}
      />

      {/* Shown only once an address has been typed. Offering the button first invites a click
          that sends a request for an empty string, spending the hourly allowance on nothing. */}
      {trimmed.length > 0 && <ResendVerification email={() => trimmed} />}
    </div>
  );
}
