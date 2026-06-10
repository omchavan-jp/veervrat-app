'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Languages } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { usersApi } from '@/lib/api/users';

// Compact icon toggle: flips EN↔MR. Shows the target language's short label next to a
// globe/languages icon. Persists the preference (DB stores EN/MR; middleware reads lowercase).
export function LanguageToggle({ className = '' }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const next = locale === 'mr' ? 'en' : 'mr';
  const targetLabel = next === 'mr' ? 'मराठी' : 'EN';

  async function handleToggle() {
    try {
      await usersApi.updateMe({ language: next.toUpperCase() });
      router.refresh();
    } catch {
      // Preference not saved — leave locale as-is.
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={`Switch to ${next === 'mr' ? 'Marathi' : 'English'}`}
      aria-label={`Switch to ${next === 'mr' ? 'Marathi' : 'English'}`}
      className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border text-[12px] font-medium text-muted transition-colors hover:border-accent hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      <Languages className="h-4 w-4 shrink-0" />
      <span>{targetLabel}</span>
    </button>
  );
}
