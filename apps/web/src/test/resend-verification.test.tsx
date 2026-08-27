import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api/client';

const resendVerification = vi.fn();
vi.mock('@/lib/api/auth', () => ({
  authApi: { resendVerification: (e: string) => resendVerification(e) },
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${Object.values(vars).join(',')}` : key,
}));

import { ResendVerification } from '@/components/auth/resend-verification';

const button = () => screen.queryByRole('button');
const renderIt = () => render(<ResendVerification email={() => 'a@x.com'} />);

beforeEach(() => {
  resendVerification.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('ResendVerification', () => {
  it('sends to the address supplied at click time', async () => {
    renderIt();
    fireEvent.click(button()!);
    await waitFor(() => expect(resendVerification).toHaveBeenCalledWith('a@x.com'));
  });

  it('can be used more than once — the dead end #74 removed must not come back', async () => {
    // The original replaced the button permanently with a confirmation. If the second mail also
    // went missing, the user had nothing left to press.
    // Fake timers must be installed BEFORE render: the countdown interval and the deadline both
    // read the clock at mount, and swapping the clock underneath them afterwards leaves the
    // interval running on the real one. `shouldAdvanceTime` keeps waitFor/findBy working, which
    // poll on real timers and otherwise hang.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderIt();
    fireEvent.click(button()!);
    await screen.findByText('resendVerificationSent');

    // Wait out the cooldown; the button must return.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });
    expect(button()).not.toBeNull();

    fireEvent.click(button()!);
    await waitFor(() => expect(resendVerification).toHaveBeenCalledTimes(2));
  });

  it('hides the button behind a countdown instead of letting clicks pile up', async () => {
    renderIt();
    fireEvent.click(button()!);
    await screen.findByText('resendVerificationSent');

    expect(button()).toBeNull();
    expect(screen.getByText(/resendVerificationWait/)).toBeTruthy();
  });

  it('says so when the limit is hit, instead of claiming a mail was sent', async () => {
    // The defect: every error was swallowed, so a 429 rendered as "a new link is on its way"
    // when nothing had been sent.
    resendVerification.mockRejectedValue(
      new ApiError(429, 'RATE_LIMITED', 'too many', { retryAfterSeconds: 1800 }),
    );
    renderIt();
    fireEvent.click(button()!);

    await screen.findByText(/resendVerificationLimited/);
    expect(screen.queryByText('resendVerificationSent')).toBeNull();
  });

  it('keeps every other failure indistinguishable from success', async () => {
    // This silence is what stops the endpoint disclosing whether an account exists. Only the
    // 429 may be surfaced, and only because that throttle is keyed on IP rather than account.
    for (const error of [
      new ApiError(404, 'ENTITY_NOT_FOUND', 'no such user'),
      new ApiError(500, 'INTERNAL_ERROR', 'boom'),
      new Error('network down'),
    ]) {
      resendVerification.mockReset().mockRejectedValue(error);
      const { unmount } = renderIt();
      fireEvent.click(button()!);

      await screen.findByText('resendVerificationSent');
      expect(screen.queryByText(/resendVerificationLimited/)).toBeNull();
      unmount();
    }
  });

  it('never counts the rate-limit wait down faster than the cooldown', async () => {
    // A 429 reporting a shorter wait than the local cooldown must not hand the button back
    // early — the next click would just be refused again.
    resendVerification.mockRejectedValue(
      new ApiError(429, 'RATE_LIMITED', 'too many', { retryAfterSeconds: 5 }),
    );
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderIt();
    fireEvent.click(button()!);
    await screen.findByText(/resendVerificationLimited/);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(button()).toBeNull();
  });
});

describe('ResendVerificationForm', () => {
  it('offers the resend only once an address has been entered', async () => {
    // Otherwise the first click sends a request for an empty string and spends one of the five
    // hourly attempts on nothing.
    const { ResendVerificationForm } = await import('@/components/auth/resend-verification-form');
    render(<ResendVerificationForm />);

    expect(button()).toBeNull();

    fireEvent.change(screen.getByLabelText(/emailLabel/), { target: { value: 'a@x.com' } });
    expect(button()).not.toBeNull();
  });

  it('sends to the address that was typed', async () => {
    const { ResendVerificationForm } = await import('@/components/auth/resend-verification-form');
    render(<ResendVerificationForm />);

    fireEvent.change(screen.getByLabelText(/emailLabel/), { target: { value: '  b@x.com  ' } });
    fireEvent.click(button()!);

    // Trimmed: a trailing space pasted from a mail client must not become a different address.
    await waitFor(() => expect(resendVerification).toHaveBeenCalledWith('b@x.com'));
  });
});
