'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Search, BookOpen, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth, useLogout } from '@/hooks/use-auth';
import { Logo } from '@/components/auth/logo';
import { LanguageToggle } from '@/components/shared/language-toggle';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { NotificationBell } from '@/components/layout/notification-bell';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/study', label: 'Study weaknesses', icon: Search },
  { href: '/journeys', label: 'Work on weaknesses', icon: BookOpen },
];

function RightSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside className="flex shrink-0 flex-col border-l border-border bg-bg transition-all duration-200 ease-out overflow-hidden" style={{ width: collapsed ? '0px' : '280px', willChange: 'width' }}>
      {/* Top: heading */}
      <div className="flex min-h-[78px] items-center border-b border-border px-5 py-[22px]">
        <h3 className="font-display text-sm font-medium">Reflections</h3>
      </div>

      {/* Body: shloka + philosophy + stats */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-[20px]">
        {/* Shloka card */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-accent-2">
            Shloka of the day
          </div>
          <p className="font-deva text-[14px] leading-relaxed text-fg">
            उद्धरेदात्मनात्मानं<br/>नात्मानमवसादयेत्।<br/>आत्मैव ह्यात्मनो बन्धुः
          </p>
          <p className="mt-3 border-t border-border pt-3 text-[12px] leading-relaxed text-muted">
            Lift yourself by yourself. You are your own friend, and your own enemy.
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[10px] text-muted">
            <span>Bhagavad Gita · 6.5</span>
            <span className="text-accent-2">Open →</span>
          </div>
        </div>

        {/* Platform stats */}
        <div>
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Platform stats
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="font-display text-lg leading-none">12.4K</div>
              <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                Vratarthis
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="font-display text-lg leading-none">324</div>
              <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                Vratmitras
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="font-display text-lg leading-none">48.6K</div>
              <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                Tests solved
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="font-display text-lg leading-none">1.86M</div>
              <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                Practice days
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function LeftSidebar({ user, collapsed }: { user: { displayName: string | null; email: string }, collapsed: boolean }) {
  const pathname = usePathname();
  const logout = useLogout();
  const [hoveredNavHref, setHoveredNavHref] = useState<string | null>(null);

  const initials = user.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-border bg-bg transition-all duration-200 ease-out" style={collapsed ? { width: '68px' } : {}}>
      {/* Top: logo + collapse btn */}
      <div className="flex min-h-[78px] items-center justify-between border-b border-border px-5 py-[22px]">
        {!collapsed && (
          <Link href="/dashboard">
            <Logo />
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="flex h-10 w-10 items-center justify-center rounded-full bg-fg text-lg font-deva text-bg">
            वी
          </Link>
        )}
      </div>

      {/* Body: nav */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {!collapsed && (
          <nav className="px-[14px] py-[18px]">
            <div className="mb-2.5 px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Navigation
            </div>
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors ${
                    active
                      ? 'bg-accent/10 text-accent'
                      : 'text-fg hover:bg-fg/[0.04]'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? 'text-accent' : 'text-muted'}`}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
        {collapsed && (
          <nav className="flex flex-col items-center gap-2 px-2 py-4">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              const isHovered = hoveredNavHref === href;
              return (
                <div
                  key={href}
                  className="relative w-full"
                  onMouseEnter={() => setHoveredNavHref(href)}
                  onMouseLeave={() => setHoveredNavHref(null)}
                >
                  <Link
                    href={href}
                    title={label}
                    className={`flex h-9 items-center justify-center rounded-lg border transition-all duration-150 ${
                      isHovered
                        ? 'w-40 gap-2 px-3'
                        : 'w-9'
                    } ${
                      active
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-surface text-muted hover:border-fg hover:text-fg'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {isHovered && (
                      <span className="text-[12px] font-medium whitespace-nowrap overflow-hidden">{label}</span>
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>
        )}
      </div>

      {/* Footer: controls + user chip + sign-out */}
      <div className={`flex flex-col gap-2.5 border-t border-border bg-bg px-4 py-3.5 ${collapsed ? 'items-center' : ''}`}>
        {!collapsed && (
          <>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageToggle />
              <NotificationBell />
            </div>
            <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface px-2 py-[7px]">
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent-2 font-body text-[11px] font-medium text-bg">
                {initials}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px]">{user.displayName ?? user.email}</span>
                <span className="block text-[10px] text-muted">Vratarthi</span>
              </span>
            </div>
            <button
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-left font-body text-[13px] text-fg transition-colors hover:border-accent hover:bg-accent hover:text-bg disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </button>
          </>
        )}
        {collapsed && (
          <div className="flex flex-col items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <NotificationBell />
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-2 font-body text-[10px] font-medium text-bg">
              {initials}
            </span>
            <button
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              title="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-transparent text-fg transition-colors hover:border-accent hover:bg-accent hover:text-bg disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function RightCollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:border-accent hover:text-fg transition-colors shrink-0"
    >
      {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
    </button>
  );
}

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
    if (!isLoading && isAuthenticated && user && user.onboardingCompletedAt === null) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (user.onboardingCompletedAt === null) {
    return null;
  }

  return (
    <div className="flex h-dvh bg-bg">
      <LeftSidebar user={user} collapsed={leftCollapsed} />
      <main className="flex-1 overflow-hidden border-r border-border flex flex-col">
        <div className="flex h-full flex-col">
          {/* Top controls bar */}
          <div className="flex items-center justify-between border-b border-border px-8 py-4 shrink-0">
            <button
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              title={leftCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:border-accent hover:text-fg transition-colors"
            >
              {leftCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-16 py-14">
            {children}
          </div>
        </div>
      </main>
      <div className="flex items-center shrink-0" style={{ willChange: 'width' }}>
        <RightCollapseButton collapsed={rightCollapsed} onClick={() => setRightCollapsed(!rightCollapsed)} />
      </div>
      <RightSidebar collapsed={rightCollapsed} />
    </div>
  );
}
