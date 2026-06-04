import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUpdateMe = vi.hoisted(() => vi.fn());
const mockRouterRefresh = vi.hoisted(() => vi.fn());
const mockIsAuthenticated = vi.hoisted(() => ({ value: true }));
const mockLocale = vi.hoisted(() => ({ value: 'en' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

vi.mock('next-intl', () => ({
  useLocale: () => mockLocale.value,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated.value }),
}));

vi.mock('@/lib/api/users', () => ({
  usersApi: { updateMe: mockUpdateMe },
}));

import { LanguageToggle } from '../../components/shared/language-toggle';

describe('LanguageToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.value = true;
    mockLocale.value = 'en';
  });

  it('renders EN and MR buttons when authenticated', () => {
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: /EN/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /MR/i })).toBeInTheDocument();
  });

  it('renders nothing when not authenticated', () => {
    mockIsAuthenticated.value = false;
    const { container } = render(<LanguageToggle />);
    expect(container.firstChild).toBeNull();
  });

  it('EN button has active style when locale is en', () => {
    mockLocale.value = 'en';
    render(<LanguageToggle />);
    const enBtn = screen.getByRole('button', { name: 'EN' });
    expect(enBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('MR button has active style when locale is mr', () => {
    mockLocale.value = 'mr';
    render(<LanguageToggle />);
    const mrBtn = screen.getByRole('button', { name: 'MR' });
    expect(mrBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking the non-active locale calls updateMe with new locale and refreshes', async () => {
    mockUpdateMe.mockResolvedValue({});
    mockLocale.value = 'en';
    render(<LanguageToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'MR' }));

    await waitFor(() => {
      expect(mockUpdateMe).toHaveBeenCalledWith({ language: 'MR' });
    });
    expect(mockRouterRefresh).toHaveBeenCalled();
  });

  it('clicking the already-active locale does nothing', async () => {
    mockLocale.value = 'en';
    render(<LanguageToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));

    // No API call, no refresh
    expect(mockUpdateMe).not.toHaveBeenCalled();
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });

  it('does NOT call router.refresh when updateMe throws', async () => {
    mockUpdateMe.mockRejectedValue(new Error('Network error'));
    mockLocale.value = 'en';
    render(<LanguageToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'MR' }));

    // Wait long enough for the promise to settle
    await waitFor(() => {
      expect(mockUpdateMe).toHaveBeenCalled();
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });
});
