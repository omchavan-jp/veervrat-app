'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Search,
  BookOpen,
  Activity,
  Users,
  Compass,
  PenLine,
  Newspaper,
  Sparkles,
  ScrollText,
  Library,
  ShieldCheck,
  SlidersHorizontal,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { actionsApi } from '@/lib/api/actions';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuth, useLogout } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/auth/logo';
import dynamic from 'next/dynamic';
import { useRuntimeConfig } from '@/lib/runtime-config-provider';
import { ActionLauncher } from '@/components/shared/launcher/action-launcher';
import { ConsentGate } from '@/components/shared/consent-gate';

import { LanguageToggle } from '@/components/shared/language-toggle';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { NotificationBell } from '@/components/layout/notification-bell';
import { errorMessage } from '@/lib/api/error-message';

// In-context content editor. Lazily imported, and rendered only when the ENVIRONMENT allows it
// AND this person holds the CONTENT_EDIT grant.
//
// ⚠️ This was once gated on `NEXT_PUBLIC_CONTENT_EDIT`, a BUILD-time flag, which meant it was
// compiled out of every deployed build because CD never passed it — so granting CONTENT_EDIT did
// nothing anywhere. It could not be fixed by setting the flag either: `NEXT_PUBLIC_*` is baked at
// build time and one image is promoted UAT -> prod (conventions §17). `dynamic()` keeps the
// original intent — its own chunk, fetched only when it actually renders.
const ContentEditor = dynamic(() =>
  import('@/components/shared/content-editor/content-editor').then((m) => m.ContentEditor),
);

export type ShellUser = { displayName: string | null; email: string };

type NavItem = {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  badge?: number;
};

const PRACTICE: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/study', labelKey: 'studyFlow', icon: Search },
  { href: '/journeys', labelKey: 'journeys', icon: BookOpen },
  { href: '/virtues', labelKey: 'virtues', icon: Sparkles },
  { href: '/pothi', labelKey: 'pothi', icon: ScrollText },
  { href: '/experiences', labelKey: 'myExperiences', icon: PenLine },
  { href: '/community/blogs', labelKey: 'community', icon: Newspaper },
  // The public experience pool. It existed and worked for weeks with nothing linking to it,
  // so the only way in was to already know the URL (#253) — which meant task 5.1 of
  // experience-log-view could not be performed at all. Placed beside blogs because that is
  // where it already belongs in the route tree and in what it is for: other people's writing.
  { href: '/community/experiences', labelKey: 'publicPool', icon: Library },
];

// Computes the Guidance + Vratmitra nav groups with live pending-count badges. VM nav
// items appear only when the user holds an active VM assignment (spec/22). Each item
// carries its own independent badge — VA Guidance vs. VM Guidance, never a combined one.
function useNavGroups() {
  const { user } = useAuth();
  const { data: va } = useQuery({
    queryKey: queryKeys.actions.va,
    queryFn: () => actionsApi.getVaActions(),
    staleTime: 30_000,
  });
  const { data: vm } = useQuery({
    queryKey: queryKeys.actions.vm,
    queryFn: () => actionsApi.getVmActions(),
    staleTime: 30_000,
  });

  const guidance: NavItem[] = [
    { href: '/actions', labelKey: 'actions', icon: Activity, badge: va?.counts.total || undefined },
    { href: '/my-vratmitras', labelKey: 'myVratmitras', icon: Users },
  ];

  // Shown only to someone who actually mentors, and ALONGSIDE their own navigation rather than
  // instead of it (#193). Most people here are both — a vratmitra is also walking their own vrat
  // — so a mode switch would tax exactly those people on every visit.
  const vratmitra: NavItem[] = vm?.hasAssignments
    ? [
        { href: '/vratmitra/my-vratarthis', labelKey: 'vmMyVratarthis', icon: Users },
        {
          href: '/vratmitra/guidance',
          labelKey: 'vmGuidance',
          icon: Compass,
          badge: vm?.counts.total || undefined,
        },
      ]
    : [];

  // Moderation nav — moderators/admins only (spec/27).
  const isMod = (user?.roles ?? []).some((r) => r === 'MODERATOR' || r === 'ADMIN');
  if (isMod) vratmitra.push({ href: '/moderation', labelKey: 'moderation', icon: ShieldCheck });

  // Admin nav — admins only (spec/27).
  const isAdmin = (user?.roles ?? []).some((r) => r === 'ADMIN');
  const admin: NavItem[] = isAdmin
    ? [{ href: '/admin', labelKey: 'admin', icon: SlidersHorizontal }]
    : [];

  return { guidance, vratmitra, admin, pill: [...PRACTICE, ...guidance, ...vratmitra, ...admin] };
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

function initialsOf(user: ShellUser): string {
  return user.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase();
}

// Highest-privilege role wins for the profile-card label, so a moderator/admin is
// not mislabelled as a plain Vratarthi. Falls back to Vratarthi (every user is one).
function roleLabelKey(roles: string[]): string {
  if (roles.includes('ADMIN')) return 'admin';
  if (roles.includes('MODERATOR')) return 'moderator';
  if (roles.includes('VRATMITRA')) return 'vratmitra';
  return 'vratarthi';
}

const SIDEBAR_COLLAPSED_KEY = 'veervrat:sidebar-collapsed';

function LeftRail({
  user,
  collapsed,
  onToggle,
}: {
  user: ShellUser;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('common.nav');
  const tRole = useTranslations('common.role');
  const tA11y = useTranslations('common');
  const pathname = usePathname();
  const logout = useLogout();
  const { toast } = useToast();
  const initials = initialsOf(user);
  const { guidance, vratmitra, admin } = useNavGroups();
  const { user: authUser } = useAuth();
  const roleLabel = tRole(roleLabelKey(authUser?.roles ?? []));

  const renderItem = ({ href, labelKey, icon: Icon, badge }: NavItem) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        title={collapsed ? t(labelKey) : undefined}
        // When collapsed the visible text label is hidden and the icon is aria-hidden,
        // so the link would have no accessible name — supply one explicitly.
        aria-label={collapsed ? t(labelKey) : undefined}
        aria-current={active ? 'page' : undefined}
        className={`group relative mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-[background,color,transform] duration-150 active:scale-[0.97] ${
          collapsed ? 'justify-center' : ''
        } ${active ? 'bg-accent/10 font-medium text-accent' : 'text-fg hover:bg-fg/[0.04]'}`}
      >
        {active && (
          <span className="absolute -left-3 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r bg-accent" />
        )}
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-accent' : 'text-muted'}`}
          aria-hidden="true"
        />
        {!collapsed && <span className="flex-1 truncate">{t(labelKey)}</span>}
        {!collapsed && badge ? (
          <span
            className="rounded-full bg-accent px-1.5 py-px font-mono text-[10px] font-semibold text-bg"
            aria-label={tA11y('pendingCount', { count: badge })}
          >
            {badge}
          </span>
        ) : null}
        {collapsed && badge ? (
          <span className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full bg-accent">
            <span className="sr-only">{tA11y('pendingCount', { count: badge })}</span>
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <aside
      className={`relative flex shrink-0 flex-col border-r border-border bg-bg transition-[width] duration-300 ease-[var(--ease-spring)] ${
        collapsed ? 'w-[76px]' : 'w-60'
      }`}
    >
      {/* Collapse / expand toggle straddles the rail's right edge — a fixed-position
          control on the boundary (same place whether open or closed), reading as
          "outside" the rail rather than crammed inside it. */}
      <button
        onClick={onToggle}
        title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        className="absolute -right-3 top-[18px] z-30 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-card transition-colors hover:border-accent hover:text-fg"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-3.5 w-3.5" />
        ) : (
          <PanelLeftClose className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Header / brand */}
      {!collapsed ? (
        <div className="flex min-h-[60px] items-center border-b border-border px-4">
          <Link href="/dashboard" className="min-w-0">
            <Logo />
          </Link>
        </div>
      ) : (
        <div className="flex min-h-[60px] items-center justify-center border-b border-border">
          <Link
            href="/dashboard"
            title="Veervrat"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-fg font-deva text-lg text-bg"
          >
            वी
          </Link>
        </div>
      )}
      {/* Brand name stays present when collapsed, set vertically so it survives the
          narrow rail instead of vanishing entirely. */}
      {collapsed && (
        <div className="flex justify-center pt-3">
          <span className="font-display text-[12px] tracking-[0.05em] [writing-mode:vertical-rl] text-muted">
            <span className="text-accent">Veer</span>vrat
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {!collapsed && (
          <div className="mb-1.5 px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            {t('groupPractice')}
          </div>
        )}
        {PRACTICE.map(renderItem)}
        {!collapsed && (
          <div className="mb-1.5 mt-5 px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            {t('groupGuidance')}
          </div>
        )}
        {collapsed && <div className="my-3 h-px bg-border" />}
        {guidance.map(renderItem)}

        {vratmitra.length > 0 && (
          <>
            {!collapsed && (
              <div className="mb-1.5 mt-5 px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                {t('groupVratmitra')}
              </div>
            )}
            {collapsed && <div className="my-3 h-px bg-border" />}
            {vratmitra.map(renderItem)}
          </>
        )}

        {admin.length > 0 && (
          <>
            {!collapsed && (
              <div className="mb-1.5 mt-5 px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                {t('groupAdmin')}
              </div>
            )}
            {collapsed && <div className="my-3 h-px bg-border" />}
            {admin.map(renderItem)}
          </>
        )}
      </nav>

      {/* Footer: controls + user + sign-out */}
      <div
        className={`flex flex-col gap-2.5 border-t border-border px-3 py-3.5 ${collapsed ? 'items-center' : ''}`}
      >
        {/* Compact icon toggles — present in BOTH states (stacked when collapsed) */}
        <div className={`flex gap-2 ${collapsed ? 'flex-col items-center' : ''}`}>
          <ThemeToggle className={collapsed ? 'w-9' : 'flex-1'} />
          <LanguageToggle
            display={collapsed ? 'icon' : 'label'}
            className={collapsed ? 'w-9' : 'flex-1'}
          />
        </div>

        {!collapsed ? (
          <>
            <Link
              href="/profile"
              className="flex items-center gap-2.5 rounded-full border border-border bg-surface px-2 py-[7px] transition-colors hover:border-accent"
            >
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent-2 text-[11px] font-medium text-bg">
                {initials}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px]">{user.displayName ?? user.email}</span>
                <span className="block text-[10px] text-muted">{roleLabel}</span>
              </span>
            </Link>
            <Link
              href="/settings"
              title={t('settings')}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-left text-[13px] text-fg transition-colors hover:border-accent hover:bg-fg/[0.04]"
            >
              <Settings className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t('settings')}</span>
            </Link>
            <button
              onClick={() =>
                logout.mutate(undefined, {
                  onError: (err) =>
                    toast({
                      title: errorMessage(err, tA11y('logoutError')),
                      variant: 'destructive',
                    }),
                })
              }
              disabled={logout.isPending}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-left text-[13px] text-fg transition-colors hover:border-accent hover:bg-accent hover:text-bg disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {logout.isPending ? tA11y('loggingOut') : t('logout')}
              </span>
            </button>
          </>
        ) : (
          <>
            <Link
              href="/profile"
              title={user.displayName ?? user.email}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-2 text-[10px] font-medium text-bg"
            >
              {initials}
            </Link>
            <button
              onClick={() =>
                logout.mutate(undefined, {
                  onError: (err) =>
                    toast({
                      title: errorMessage(err, tA11y('logoutError')),
                      variant: 'destructive',
                    }),
                })
              }
              disabled={logout.isPending}
              title={t('logout')}
              aria-label={t('logout')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-fg transition-colors hover:border-accent hover:bg-accent hover:text-bg disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

function PillNav() {
  const t = useTranslations('common.nav');
  const tA11y = useTranslations('common');
  const pathname = usePathname();
  const { pill } = useNavGroups();
  return (
    // The full nav set (up to 10+ items for VM/mod/admin) overflows a fixed centered
    // pill at 375px; cap the pill to the viewport and let it scroll horizontally so no
    // item is clipped off-screen.
    <nav
      aria-label={tA11y('primaryNav')}
      className="fixed bottom-5 left-1/2 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 gap-1 overflow-x-auto rounded-full border border-border-strong bg-surface/90 p-1.5 shadow-raised backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden"
    >
      {pill.map(({ href, labelKey, icon: Icon, badge }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            title={t(labelKey)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2.5 text-[13px] transition-[background,color] duration-200 active:scale-[0.94] ${
              active ? 'bg-accent text-bg' : 'text-muted'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span
              className="overflow-hidden whitespace-nowrap transition-[max-width] duration-300 ease-out"
              style={{ maxWidth: active ? '120px' : '0px' }}
            >
              {t(labelKey)}
            </span>
            {badge ? (
              <span
                aria-label={tA11y('pendingCount', { count: badge })}
                className={`absolute right-2 top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 px-[3px] font-mono text-[9px] font-semibold ${
                  active ? 'border-accent bg-bg text-accent' : 'border-surface bg-accent text-bg'
                }`}
              >
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

// The authenticated application shell: left rail (desktop/tablet) + top bar + floating
// pill nav (mobile) + scrollable content region. Presentational — auth gating and any
// redirects are the caller's responsibility. Shared by the (app) and (content) route
// groups so navigating into guest-browseable content (virtues/pothi/community/…) keeps
// the full chrome for signed-in members instead of dropping to the guest bar.
export function AppShell({
  user,
  children,
}: {
  user: ShellUser & { roles?: string[] };
  children: React.ReactNode;
}) {
  const t = useTranslations('common.nav');
  const { contentEditEnabled } = useRuntimeConfig();
  // Grants come from the auth query rather than the `user` prop: `ShellUser` is deliberately
  // narrow (display name and email — what the chrome needs to draw itself) and adding a
  // capability list to it would widen a layout type into an authorisation one.
  const { user: authUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Restore the collapse preference after mount so it survives reloads/navigation
  // without causing a hydration mismatch (server always renders expanded).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const next = !v;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      }
      return next;
    });

  return (
    <div className="flex h-dvh bg-bg">
      {/* Desktop / tablet rail */}
      <div className="hidden md:flex">
        <LeftRail user={user} collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
          {/* Mobile brand */}
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-fg font-deva text-sm text-bg">
              वी
            </span>
            <span className="font-display text-[17px]">
              <span className="text-accent">Veer</span>vrat
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-0.5">
            {/* Theme + language live in the rail footer on desktop; surfaced here on
                mobile as icon-only buttons. Hit area is >=44px for touch (h-11/min-w-11)
                while the glyph stays small. */}
            <LanguageToggle
              display="reveal"
              className="!h-11 min-w-11 !border-transparent px-2 md:hidden"
            />
            <ThemeToggle className="!h-11 !w-11 !border-transparent md:hidden" />
            <NotificationBell />
            <Link
              href="/profile"
              aria-label={t('profile')}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[11px] font-medium text-bg md:hidden"
            >
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-accent-2">
                {initialsOf(user)}
              </span>
            </Link>
          </div>
        </header>

        {/* Content — generous padding + room for the mobile pill nav. Each page sets its
            own max-width (reading-heavy pages cap ~760px; richer pages go wider). */}
        <div className="flex-1 overflow-y-auto px-5 py-8 pb-28 md:px-10 md:py-12 md:pb-12 lg:px-16">
          {children}
        </div>
      </main>

      {/* Mobile floating pill nav */}
      <PillNav />

      {/* The three widgets every signed-in person should have, wherever they are.

          These used to live in `AppLayoutClient`, whose comment said they mounted "once here" and
          covered "all four authenticated route groups". That was true of four of the five:
          (vratmitra), (moderation) and (admin) import `AppLayoutClient`, so they inherited it —
          but (content) has its own client, because it is the one group that must also render for
          guests, and so it inherited nothing.

          The effect was precisely inverted in each case. A CONTENT_SUGGEST grantee could not
          suggest anything on a virtue, a weakness, a sentence or the pothi (#278). A CONTENT_EDIT
          grantee could not edit the content pages. And a signed-in person reading the catalogue
          was never re-prompted when a policy was republished — a consent mechanism with a hole in
          it exactly where somebody sits and reads.

          `AppShell` is the component all five groups genuinely share, and it renders only for a
          signed-in user, so mounting here makes the original comment's claim true instead of
          nearly true. A sixth route group gets them by construction rather than by remembering. */}
      <ActionLauncher />
      <ConsentGate enabled />
      {contentEditEnabled && authUser?.grants?.includes('CONTENT_EDIT') && <ContentEditor />}
    </div>
  );
}
