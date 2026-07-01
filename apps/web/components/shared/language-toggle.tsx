'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Languages } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { usersApi } from '@/lib/api/users';

type Display = 'label' | 'icon' | 'reveal';

// Flips EN↔MR. The label shows the CURRENT language (what the app is in).
//   'label'  — always show current language inline (desktop expanded)
//   'icon'   — icon only (collapsed rail)
//   'reveal' — icon only; after a toggle, the current language label expands inline
//              briefly then collapses back to icon-only — so the user sees what they
//              switched into. Button width animates; neighbours shift gently.
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

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!isAuthenticated) return null;

  const currentLabel = locale === 'mr' ? t('mr') : t('en');
  const next = locale === 'mr' ? 'en' : 'mr';

  async function handleToggle() {
    if (display === 'reveal') {
      setRevealed(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setRevealed(false), 1500);
    }
    try {
      await usersApi.updateMe({ language: next.toUpperCase() });
      router.refresh();
    } catch {
      // Preference not saved — leave locale as-is.
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
        {currentLabel}
      </span>
    </button>
  );
}
