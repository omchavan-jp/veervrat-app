'use client';

import { useTheme } from 'next-themes';

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 text-xs font-mono">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          aria-pressed={theme === opt.value}
          className="rounded px-2 py-1 transition-colors aria-pressed:bg-surface aria-pressed:text-fg text-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
