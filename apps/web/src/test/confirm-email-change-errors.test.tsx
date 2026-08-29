import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '@/messages/en.json';

/**
 * The page used to answer every failure with one sentence — "this confirmation link is invalid or
 * has expired" — and a real defect hid behind it: the address was already claimed, the write was
 * refused, and the person was told their link was bad. It was fine. Retrying could never have
 * helped, and nothing on screen said so.
 *
 * These assert the four outcomes are distinguishable. The `taken` case is the one that was
 * indistinguishable before, so it is the one that matters most.
 */
const confirmEmailChange = vi.fn();

vi.mock('@/lib/api/auth', () => ({
  authApi: { confirmEmailChange: (t: string) => confirmEmailChange(t) },
}));

const searchParams = new URLSearchParams({ token: 'tok-1' });
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import ConfirmEmailChangePage from '@/app/(public)/confirm-email-change/page';
import { ApiError } from '@/lib/api/client';

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ConfirmEmailChangePage />
    </NextIntlClientProvider>,
  );
}

// Unmount between cases. Left mounted, a previous render's in-flight effect outlives the test
// and settles against whatever the next case installed — which surfaces as an unhandled
// rejection attributed to the wrong test.
afterEach(cleanup);

describe('confirm email change — the four outcomes are told apart', () => {
  it('success says the address was updated', async () => {
    confirmEmailChange.mockResolvedValue({ id: 'u1' });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(en.confirmEmailChange.success)).toBeInTheDocument(),
    );
  });

  it('an address taken by someone else is NOT reported as a bad link', async () => {
    // The exact shape the API returns when the address is spoken for. Reported as "invalid link"
    // it sends someone to request another one, which will fail the same way every time.
    confirmEmailChange.mockImplementation(() =>
      Promise.reject(new ApiError(409, 'DUPLICATE_ENTITY', 'User with this email already exists')),
    );
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(en.confirmEmailChange.error_taken)).toBeInTheDocument(),
    );
    expect(screen.queryByText(en.confirmEmailChange.error_invalid)).not.toBeInTheDocument();
    expect(screen.queryByText(en.confirmEmailChange.error_expired)).not.toBeInTheDocument();
  });

  it('an expired token says expired, and points at settings', async () => {
    confirmEmailChange.mockImplementation(() =>
      Promise.reject(new ApiError(422, 'TOKEN_EXPIRED', 'This email change token has expired.')),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(en.confirmEmailChange.error_expired)).toBeInTheDocument(),
    );
  });

  it('an invalid or already-used token says so', async () => {
    confirmEmailChange.mockImplementation(() =>
      Promise.reject(
        new ApiError(422, 'TOKEN_INVALID', 'This token is invalid or has already been used.'),
      ),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(en.confirmEmailChange.error_invalid)).toBeInTheDocument(),
    );
  });

  it('anything unrecognised falls back without claiming the link was bad', async () => {
    // A 500, a network failure, a code nobody has seen yet. Saying "invalid link" about any of
    // these is the original defect in miniature: confident, specific, and wrong.
    confirmEmailChange.mockImplementation(() => Promise.reject(new Error('network down')));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(en.confirmEmailChange.error_unknown)).toBeInTheDocument(),
    );
  });
});
