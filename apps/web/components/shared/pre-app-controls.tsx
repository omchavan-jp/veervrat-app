'use client';

import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageToggle } from './language-toggle';
import { ThemeToggle } from './theme-toggle';
import { useLogout } from '@/hooks/use-auth';

/**
 * Controls for every screen before the dashboard — login, signup, password recovery, and
 * onboarding.
 *
 * Language matters most here and is easy to overlook: a Marathi-first reader arriving at /login
 * has no session, so locale falls back to Accept-Language or English. Without a toggle on this
 * screen they cannot read the page they must use to get in, and the toggle in Settings is on the
 * far side of signup and onboarding. Everything else in the product assumes you are already in.
 *
 * Both toggles work signed-out: theme is localStorage (next-themes), and language writes the
 * NEXT_LOCALE cookie the middleware already reads without a session.
 *
 * `showLogout` exists for onboarding, which is authenticated and otherwise has no way out —
 * closing the tab was the only exit, which is poor on a shared or family device.
 */
export function PreAppControls({
  showLogout = false,
  className = '',
}: {
  showLogout?: boolean;
  className?: string;
}) {
  const t = useTranslations('common');
  const logout = useLogout();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LanguageToggle display="label" className="px-2.5" />
      <ThemeToggle />
      {showLogout && (
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          aria-label={t('nav.logout')}
          title={t('nav.logout')}
          className="flex h-9 items-center justify-center rounded-lg border border-border px-2.5 text-[12px] font-medium text-muted transition-colors hover:border-accent hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
