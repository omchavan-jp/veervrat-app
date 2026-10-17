import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

type LogoutOptions = { onError: (error: Error) => void };

const mockState = vi.hoisted(() => ({
  logoutMutate: vi.fn<(variables: undefined, options: LogoutOptions) => void>(),
  logoutPending: false,
  toast: vi.fn(),
  queryClient: { setQueryData: vi.fn() },
  // Flip to true to simulate a profile-load failure.
  profileError: false,
}));

const successProfile = {
  id: 'user-1',
  email: 'vratarthi@example.com',
  displayName: 'Vratarthi',
  username: 'vratarthi',
  avatarUrl: null,
  gender: null,
  dob: null,
  language: 'en',
  showLastActive: true,
  showOnlineIndicator: true,
  profilePrivate: false,
  profileVisibility: {},
  notificationPrefs: {},
  tourResetAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: () =>
    mockState.profileError
      ? { data: undefined, isLoading: false, isError: true, refetch: vi.fn() }
      : { data: successProfile, isLoading: false, isError: false, refetch: vi.fn() },
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => mockState.queryClient,
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock('@/hooks/use-auth', () => ({
  useLogout: () => ({
    mutate: mockState.logoutMutate,
    isPending: mockState.logoutPending,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockState.toast }),
}));

import ProfilePage from '../../app/(app)/profile/page';

describe('mobile profile logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.logoutPending = false;
    mockState.profileError = false;
  });

  it('uses the shared logout mutation and stays hidden at the desktop breakpoint', () => {
    render(<ProfilePage />);

    const button = screen.getByRole('button', { name: 'common.nav.logout' });
    expect(button).toHaveClass('md:hidden');
    expect(button).toHaveClass('min-h-11');

    fireEvent.click(button);

    expect(mockState.logoutMutate).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('uses the same pending state and reports logout failures through the toast', () => {
    mockState.logoutPending = true;
    const { rerender } = render(<ProfilePage />);

    const button = screen.getByRole('button', { name: 'common.loggingOut' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    mockState.logoutPending = false;
    rerender(<ProfilePage />);
    const activeButton = screen.getByRole('button', { name: 'common.nav.logout' });
    fireEvent.click(activeButton);

    const call = mockState.logoutMutate.mock.calls[0];
    expect(call).toBeDefined();
    call?.[1].onError(new Error('logout failed'));

    expect(mockState.toast).toHaveBeenCalledWith({
      title: 'common.logoutError',
      variant: 'destructive',
    });
  });

  it('keeps settings and mobile logout available when profile loading fails', () => {
    mockState.profileError = true;
    render(<ProfilePage />);

    // Settings link stays available (was previously hidden by the early return).
    expect(screen.getByRole('link', { name: /profile\.editInSettings/i })).toBeInTheDocument();

    // Mobile logout stays available and is still wired to the shared mutation.
    const button = screen.getByRole('button', { name: 'common.nav.logout' });
    expect(button).toHaveClass('md:hidden');
    fireEvent.click(button);

    expect(mockState.logoutMutate).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });
});