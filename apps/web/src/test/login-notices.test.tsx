import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import en from '@/messages/en.json';
import { renderWithProviders } from './helpers/render';

/**
 * /login is where two very different journeys end, and they must not read alike.
 *
 * `?notice=account_deleted` — you just deleted your account, and it worked.
 * `?error=ACCOUNT_DELETED` — you tried to sign in to an account that is gone.
 *
 * The second used to be a silent redirect with no message at all; the first used to arrive with
 * "Your session has expired", which reads as though the deletion failed.
 */
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => params,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/lib/runtime-config', () => ({
  getRuntimeConfig: () => ({ apiBaseUrl: 'http://api.test/api/v1' }),
}));
// Partial: the page's import graph pulls other hooks from this module, and replacing the whole
// thing removes exports the tree still needs.
vi.mock('@/hooks/use-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-auth')>()),
  useLogin: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

import LoginPage from '@/app/(public)/login/page';

function renderWith(search: string) {
  params = new URLSearchParams(search);
  return renderWithProviders(<LoginPage />);
}

afterEach(cleanup);

describe('login page notices', () => {
  it('confirms a completed deletion', () => {
    renderWith('notice=account_deleted');
    expect(screen.getByTestId('account-deleted-confirmed')).toBeInTheDocument();
    expect(screen.getByText(en.auth.errors.accountDeletedConfirmed)).toBeInTheDocument();
    // Not the other one: this person's deletion worked, they are not being refused entry.
    expect(screen.queryByTestId('account-deleted-notice')).not.toBeInTheDocument();
  });

  it('refuses a deleted account with its date, and offers a way forward', () => {
    renderWith('error=ACCOUNT_DELETED&deletedAt=2026-08-29T05:00:00.000Z');
    expect(screen.getByTestId('account-deleted-notice')).toBeInTheDocument();
    expect(screen.getByText(/August 29, 2026/)).toBeInTheDocument();
    expect(screen.getByText(en.auth.errors.accountDeletedSignUp)).toBeInTheDocument();
    expect(screen.queryByTestId('account-deleted-confirmed')).not.toBeInTheDocument();
  });

  it('falls back to the undated wording when the date is unusable', () => {
    renderWith('error=ACCOUNT_DELETED&deletedAt=not-a-date');
    expect(screen.getByText(en.auth.errors.accountDeleted)).toBeInTheDocument();
  });

  it('a plain visit shows neither', () => {
    renderWith('');
    expect(screen.queryByTestId('account-deleted-notice')).not.toBeInTheDocument();
    expect(screen.queryByTestId('account-deleted-confirmed')).not.toBeInTheDocument();
    // Positive control: the page rendered at all, so the absences above mean something.
    // `subtitle`, not `title` — the latter is also the submit button's label, so it matches twice.
    expect(screen.getByText(en.auth.login.subtitle)).toBeInTheDocument();
  });
});
