import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUpdateMe = vi.hoisted(() => vi.fn());
const mockRouterRefresh = vi.hoisted(() => vi.fn());
const mockIsAuthenticated = vi.hoisted(() => ({ value: true }));
const mockLocale = vi.hoisted(() => ({ value: 'en' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

// The component reads common.language.{en,mr,switchTo,current}. Mirror those strings
// so assertions track the real labels without pulling the full provider.
vi.mock('next-intl', () => ({
  useLocale: () => mockLocale.value,
  useTranslations: () => {
    const dict: Record<string, string> = {
      en: 'EN',
      mr: 'मराठी',
      switchTo: 'Switch language (currently {current})',
      current: 'Language: {current}',
    };
    return (key: string, vars?: Record<string, string>) =>
      (dict[key] ?? key).replace('{current}', vars?.current ?? '');
  },
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated.value }),
}));

vi.mock('@/lib/api/users', () => ({
  usersApi: { updateMe: mockUpdateMe },
}));

import { LanguageToggle } from '../../components/shared/language-toggle';

// Single button that flips EN↔MR and shows the TARGET language (what you'd switch to).
// Clicking always switches to the other language (persist via updateMe, then refresh).
describe('LanguageToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.value = true;
    mockLocale.value = 'en';
  });

  it('renders a single toggle button when authenticated', () => {
    render(<LanguageToggle />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  // Previously this asserted the toggle rendered NOTHING when signed out, which is what left
  // /login unreadable for a Marathi-first visitor: no session means locale falls back to
  // Accept-Language or English, and the only toggle lived past signup and onboarding.
  it('renders when NOT authenticated — the login page needs it most', () => {
    mockIsAuthenticated.value = false;
    render(<LanguageToggle />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('signed out: writes the cookie but does not call updateMe', async () => {
    mockIsAuthenticated.value = false;
    render(<LanguageToggle />);

    fireEvent.click(screen.getByRole('button'));

    // The cookie is the whole mechanism when signed out — the middleware reads it without a
    // session. Calling updateMe would just earn a 401 for no benefit.
    await waitFor(() => expect(mockRouterRefresh).toHaveBeenCalled());
    expect(mockUpdateMe).not.toHaveBeenCalled();
  });

  it('shows the target language (मराठी) when current locale is EN', () => {
    mockLocale.value = 'en';
    render(<LanguageToggle />);
    // aria-label/title still state the CURRENT locale for a11y clarity...
    expect(screen.getByRole('button', { name: 'Switch language (currently EN)' })).toBeInTheDocument();
    // ...while the visible label shows what you'd switch TO.
    expect(screen.getByText('मराठी')).toBeInTheDocument();
  });

  it('shows the target language (EN) when current locale is MR', () => {
    mockLocale.value = 'mr';
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'Switch language (currently मराठी)' })).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('clicking in EN switches to MR and refreshes', async () => {
    mockUpdateMe.mockResolvedValue({});
    mockLocale.value = 'en';
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mockUpdateMe).toHaveBeenCalledWith({ language: 'MR' }));
    expect(mockRouterRefresh).toHaveBeenCalled();
  });

  it('clicking in MR switches to EN', async () => {
    mockUpdateMe.mockResolvedValue({});
    mockLocale.value = 'mr';
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mockUpdateMe).toHaveBeenCalledWith({ language: 'EN' }));
  });

  // The cookie is the immediate source of truth for this device — the flip happens
  // (cookie + refresh) even if persisting the DB preference fails.
  it('still refreshes (cookie flip) when updateMe throws', async () => {
    mockUpdateMe.mockRejectedValue(new Error('Network error'));
    mockLocale.value = 'en';
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mockUpdateMe).toHaveBeenCalled());
    expect(mockRouterRefresh).toHaveBeenCalled();
    expect(document.cookie).toContain('NEXT_LOCALE=mr');
  });
});
