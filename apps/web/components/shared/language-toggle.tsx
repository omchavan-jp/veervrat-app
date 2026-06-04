'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { usersApi } from '@/lib/api/users';

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  async function handleToggle(newLocale: string) {
    if (newLocale === locale) return;
    try {
      // DB stores 'EN' | 'MR'; middleware reads locale as lowercase 'en' | 'mr'
      await usersApi.updateMe({ language: newLocale.toUpperCase() });
      router.refresh();
    } catch {
      // Preference not saved — do not refresh; locale stays as-is
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 text-xs font-mono">
      <button
        onClick={() => handleToggle('en')}
        className={`rounded-md px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 ${
          locale === 'en' ? 'bg-accent text-bg' : 'text-muted hover:text-fg'
        }`}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
      <button
        onClick={() => handleToggle('mr')}
        className={`rounded-md px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 ${
          locale === 'mr' ? 'bg-accent text-bg' : 'text-muted hover:text-fg'
        }`}
        aria-pressed={locale === 'mr'}
      >
        MR
      </button>
    </div>
  );
}
