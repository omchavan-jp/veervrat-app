import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

const mockCheckUsername = vi.hoisted(() => vi.fn());
const mockMutate = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn().mockReturnValue(null) }),
}));

vi.mock('@/lib/api/auth', () => ({
  authApi: {
    checkUsername: mockCheckUsername,
    register: vi.fn(),
  },
}));

vi.mock('@/hooks/use-auth', () => ({
  useSignup: () => ({
    mutate: mockMutate,
    isPending: false,
    isSuccess: false,
    error: null,
  }),
}));

vi.mock('@/components/auth/auth-shell', () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/auth/google-icon', () => ({
  GoogleIcon: () => <span>GoogleIcon</span>,
}));
vi.mock('@/components/auth/password-strength', () => ({
  PasswordStrength: () => <div data-testid="password-strength" />,
}));
vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { nativeButton?: boolean; render?: React.ReactElement }) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock('@/lib/api/client', () => ({
  ApiError: class ApiError extends Error { error = 'API_ERROR'; },
}));

import SignupPage from '../../app/(public)/signup/page';

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all required fields', () => {
    render(<SignupPage />);
    expect(screen.getByPlaceholderText('auth.signup.displayNamePlaceholder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('auth.signup.usernamePlaceholder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('auth.signup.emailPlaceholder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('auth.signup.passwordPlaceholder')).toBeInTheDocument();
    expect(screen.getByDisplayValue('EN')).toBeInTheDocument();
  });

  it('calls checkUsername API after 400ms debounce', async () => {
    mockCheckUsername.mockResolvedValue(true);
    render(<SignupPage />);

    const usernameInput = screen.getByPlaceholderText('auth.signup.usernamePlaceholder');
    fireEvent.change(usernameInput, { target: { value: 'new_user' } });

    expect(mockCheckUsername).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    expect(mockCheckUsername).toHaveBeenCalledWith('new_user');
  });

  it('shows username available text when check returns true', async () => {
    mockCheckUsername.mockResolvedValue(true);
    render(<SignupPage />);

    const usernameInput = screen.getByPlaceholderText('auth.signup.usernamePlaceholder');
    fireEvent.change(usernameInput, { target: { value: 'available_name' } });

    await act(async () => {
      vi.advanceTimersByTime(450);
      await Promise.resolve();
    });

    expect(screen.getByText('auth.signup.usernameAvailable')).toBeInTheDocument();
  });

  it('shows username taken text when check returns false', async () => {
    mockCheckUsername.mockResolvedValue(false);
    render(<SignupPage />);

    const usernameInput = screen.getByPlaceholderText('auth.signup.usernamePlaceholder');
    fireEvent.change(usernameInput, { target: { value: 'taken_name' } });

    await act(async () => {
      vi.advanceTimersByTime(450);
      await Promise.resolve();
    });

    expect(screen.getByText('auth.signup.usernameTaken')).toBeInTheDocument();
  });

  it('has language radio buttons with EN selected by default', () => {
    render(<SignupPage />);
    const enRadio = screen.getByDisplayValue('EN') as HTMLInputElement;
    const mrRadio = screen.getByDisplayValue('MR') as HTMLInputElement;
    expect(enRadio.checked).toBe(true);
    expect(mrRadio.checked).toBe(false);
  });
});
