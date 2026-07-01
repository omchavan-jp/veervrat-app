'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sun, Moon } from 'lucide-react';

import { cn } from '@/lib/utils';

// Compact icon toggle: shows the icon for the mode you'd switch TO, flips light↔dark.
// Resolves 'system' to its effective theme so the first click always does the obvious thing.
export function ThemeToggle({ className = '' }: { className?: string }) {
  const t = useTranslations('common.theme');
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === 'dark' : false;
  // Before mount the resolved theme is unknown — use a neutral label so AT isn't
  // told "switch to dark" when the page may already be dark.
  const label = !mounted ? t('toggle') : isDark ? t('switchToLight') : t('switchToDark');

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={label}
      aria-label={label}
      className={cn(
        'flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border text-[12px] text-muted transition-colors hover:border-accent hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
    </button>
  );
}
