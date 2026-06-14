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

// Single button that flips EN↔MR and shows the CURRENT language. Clicking always
// switches to the other language (persist via updateMe, then refresh).
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

  it('renders nothing when not authenticated', () => {
    mockIsAuthenticated.value = false;
    const { container } = render(<LanguageToggle />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the current language (EN) and labels the switch target', () => {
    mockLocale.value = 'en';
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'Switch language (currently English)' })).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('shows the current language (मराठी) when locale is mr', () => {
    mockLocale.value = 'mr';
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'Switch language (currently Marathi)' })).toBeInTheDocument();
    expect(screen.getByText('मराठी')).toBeInTheDocument();
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

  it('does NOT refresh when updateMe throws', async () => {
    mockUpdateMe.mockRejectedValue(new Error('Network error'));
    mockLocale.value = 'en';
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mockUpdateMe).toHaveBeenCalled());
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });
});
