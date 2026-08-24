import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => {
  replace.mockClear();
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
