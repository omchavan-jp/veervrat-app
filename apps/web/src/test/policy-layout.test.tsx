import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const replace = vi.fn();
// `searchParams` is settable per test: the layout suppresses its redirect when the address
// carries a `token`, because that means somebody signed in is completing an emailed action
// (#196). Default is empty — the ordinary login/signup case.
let searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

beforeEach(() => {
  replace.mockClear();
  searchParams = new URLSearchParams();
});

/**
 * The bug reported live on UAT: the consent gate links to /terms and /privacy, and clicking
 * either from an authenticated session bounced straight back to /dashboard before a word could
 * be read. A document nobody can open is not one anyone can be asked to accept.
 *
 * The cause was route-group placement, not a bug in either component individually — /terms and
 * /privacy used to share (public)'s layout, which redirects every signed-in visitor away because
 * that is correct for login/signup/password-reset. It was never correct for these two.
 */
describe('the (public) redirect — still correct for auth-only pages', () => {
  it('sends a signed-in visitor away from login-style pages', async () => {
    vi.doMock('@/hooks/use-auth', () => ({
      useAuth: () => ({ isAuthenticated: true, user: { onboardingCompletedAt: '2026-01-01' } }),
    }));
    const { PublicLayoutClient } = await import('../../app/(public)/layout-client');

    render(<PublicLayoutClient>{'login form'}</PublicLayoutClient>);

    expect(replace).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByText('login form')).toBeNull();
  });
});

vi.mock('next-intl/server', () => ({ getMessages: () => Promise.resolve({}) }));
vi.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('the (policy) layout — terms and privacy render regardless of auth state', () => {
  it('renders its children directly, with no auth check and no redirect', async () => {
    // The fix: this layout does not import useAuth or useRouter at all. A signed-in visitor
    // following the consent gate's link must see the document, not a bounce to /dashboard.
    const PolicyLayout = (await import('../../app/(policy)/layout')).default;

    const element = await PolicyLayout({ children: 'the policy text' });
    render(element);

    expect(screen.getByText('the policy text')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('completing an emailed action while signed in', () => {
  it('does NOT redirect when the address carries a token', async () => {
    // Reported from real use: clicking the "set a password" link while signed in bounced to the
    // dashboard, and the only way through was a private window. The set-password flow STARTS
    // from an authenticated settings page, so a signed-in visitor here is expected — and the
    // same trap applied to verify-email and confirm-email-change.
    searchParams = new URLSearchParams('token=abc123');
    vi.doMock('@/hooks/use-auth', () => ({
      useAuth: () => ({ isAuthenticated: true, user: { onboardingCompletedAt: '2026-01-01' } }),
    }));
    const { PublicLayoutClient } = await import('../../app/(public)/layout-client');

    render(<PublicLayoutClient>{'set a password'}</PublicLayoutClient>);

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('set a password')).toBeInTheDocument();
  });
});
