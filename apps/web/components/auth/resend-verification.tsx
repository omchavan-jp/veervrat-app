'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { authApi } from '@/lib/api/auth';
import { rateLimitRetryAfter } from '@/lib/api/rate-limit';

/** Seconds before the button comes back after a successful send. */
const COOLDOWN_SECONDS = 60;

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; until: number }
  | { kind: 'limited'; until: number };

/**
 * Offers another verification email, repeatedly, with a visible wait between attempts.
 *
 * Three defects from #96 shape this:
 *
 * **It used to be usable once.** After a successful resend the button was replaced permanently
 * by a confirmation, so if the second mail also went missing — spam filter, typo, relay hiccup —
 * the user was back in the dead end the resend existed to remove, with nothing left to press.
 * The button always comes back here.
 *
 * **There was no cooldown**, so the natural response to "nothing arrived" was to click again
 * immediately, consuming the hourly allowance for no benefit. A countdown turns waiting into an
 * instruction rather than a guess.
 *
 * **A rate-limit answer looked like success.** The caller swallowed every error so the response
 * could not reveal whether an account exists — but that swallowed the 429 too, and someone who
 * had exhausted the limit was told a link was on its way when nothing had been sent.
 *
 * ⚠️ Only the 429 is surfaced, and only because that throttle is keyed on **IP, not account**,
 * so it discloses nothing about whether the address is registered. Every other failure stays
 * swallowed. Do not widen this: surfacing, say, a 404 differently would reintroduce exactly the
 * account enumeration the silence protects against.
 */
export function ResendVerification({ email }: { email: () => string }) {
  const t = useTranslations('auth.errors');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const waiting = state.kind === 'sent' || state.kind === 'limited';
  const remaining = waiting ? Math.max(0, Math.ceil((state.until - now) / 1000)) : 0;

  useEffect(() => {
    if (!waiting) return;
    timer.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [waiting, state]);

  const onResend = useCallback(async () => {
    setState({ kind: 'sending' });
    try {
      await authApi.resendVerification(email());
      setState({ kind: 'sent', until: Date.now() + COOLDOWN_SECONDS * 1000 });
    } catch (error) {
      const retryAfter = rateLimitRetryAfter(error);
      if (retryAfter === null) {
        // Deliberately indistinguishable from success — see the note above.
        setState({ kind: 'sent', until: Date.now() + COOLDOWN_SECONDS * 1000 });
        return;
      }
      setState({
        kind: 'limited',
        until: Date.now() + Math.max(retryAfter, COOLDOWN_SECONDS) * 1000,
      });
    }
  }, [email]);

  // The countdown has run out — offer the button again rather than stranding the user.
  const canSend = state.kind === 'idle' || (waiting && remaining === 0);

  return (
    <div className="mt-2">
      {state.kind === 'sent' && (
        <span className="block font-medium">{t('resendVerificationSent')}</span>
      )}
      {state.kind === 'limited' && (
        <span className="block font-medium">
          {t('resendVerificationLimited', { minutes: Math.max(1, Math.ceil(remaining / 60)) })}
        </span>
      )}

      {canSend ? (
        <button
          type="button"
          onClick={onResend}
          className="mt-1 block underline underline-offset-2 disabled:opacity-60"
        >
          {t('resendVerification')}
        </button>
      ) : (
        <span className="mt-1 block opacity-70">
          {state.kind === 'sending'
            ? t('resendVerificationSending')
            : t('resendVerificationWait', { seconds: remaining })}
        </span>
      )}
    </div>
  );
}
