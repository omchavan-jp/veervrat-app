'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Languages } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { usersApi } from '@/lib/api/users';
import { setLocaleCookie } from '@/lib/locale';

type Display = 'label' | 'icon' | 'reveal';

// Flips EN↔MR. The visible label shows the TARGET language (what you'd switch TO) —
// tapping "मराठी" while in English switches to Marathi, matching the common toggle
// convention. The tooltip/aria-label separately states the current language for
// screen-reader clarity.
//   'label'  — always show the target language inline (desktop expanded)
//   'icon'   — icon only (collapsed rail)
//   'reveal' — icon only; after a toggle, the (new) target language label expands
//              inline briefly then collapses back to icon-only. Button width animates;
//              neighbours shift gently.
export function LanguageToggle({
  className = '',
  display = 'label',
}: {
  className?: string;
  display?: Display;
}) {
  const locale = useLocale();
  const t = useTranslations('common.language');
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const currentLabel = locale === 'mr' ? t('mr') : t('en');
  const next = locale === 'mr' ? 'en' : 'mr';
  const nextLabel = next === 'mr' ? t('mr') : t('en');

  async function handleToggle() {
    if (display === 'reveal') {
      setRevealed(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setRevealed(false), 1500);
    }
    // Cookie first for an instant flip — the middleware reads it without an API
    // round-trip; the PATCH then persists the durable preference.
    setLocaleCookie(next);
    router.refresh();

    // Signed-out (login, signup, forgot-password …) the cookie is the whole mechanism: the
    // middleware already reads it without a session, so anonymous switching works with no
    // second mechanism. Skipping the PATCH avoids a pointless 401 — it is not a silent
    // failure, there is simply no account to save a preference against yet.
    if (!isAuthenticated) return;

    try {
      await usersApi.updateMe({ language: next.toUpperCase() });
    } catch {
      // DB preference not saved — the cookie still applies on this device.
    }
  }

  const showLabel = display === 'label' || (display === 'reveal' && revealed);

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={t('current', { current: currentLabel })}
      aria-label={t('switchTo', { current: currentLabel })}
      className={`flex h-9 items-center justify-center rounded-lg border border-border text-[12px] font-medium text-muted transition-colors hover:border-accent hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      <Languages className="h-4 w-4 shrink-0" />
      {/* width + margin animate together so icon stays centred when collapsed */}
      <span
        className="overflow-hidden whitespace-nowrap transition-all duration-300 ease-out"
        style={{ maxWidth: showLabel ? '48px' : '0px', marginLeft: showLabel ? '6px' : '0px' }}
      >
        {nextLabel}
      </span>
    </button>
  );
}
