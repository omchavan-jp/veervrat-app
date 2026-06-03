'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/auth/logo';
import { useLogout } from '@/hooks/use-auth';
import { LanguageToggle } from '@/components/shared/language-toggle';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import type { User } from '@/lib/api/auth';

export function Header({ user }: { user: User }) {
  const logout = useLogout();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <LanguageToggle />
          <span className="text-sm text-muted">
            {user.displayName ?? user.email}
          </span>
          <Button
            variant="outline"
            className="h-auto rounded-lg border-border-strong px-3 py-1.5 text-xs"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            {logout.isPending ? 'Logging out...' : 'Log out'}
          </Button>
        </div>
      </div>
    </header>
  );
}
