import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers/render';
import InvitationAcceptPage from '@/app/(app)/invitations/[token]/accept/page';
import { invitationsApi } from '@/lib/api/invitations';
import { ApiError } from '@/lib/api/client';
import enMessages from '../../messages/en.json';

vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'tok-1' }),
}));

vi.mock('@/lib/api/invitations', () => ({
  invitationsApi: { accept: vi.fn(), decline: vi.fn(), byToken: vi.fn() },
}));

const accept = vi.mocked(invitationsApi.accept);
const byToken = vi.mocked(invitationsApi.byToken);

// The page fetches the invitation now, so it can say who is asking before anyone agrees (#222).
// A pending invitation from a named inviter is the state in which the buttons are offered.
const PENDING_INVITATION = {
  id: 'inv-1',
  token: 'tok-1',
  type: 'VM_GLOBAL' as const,
  scopeId: null,
  status: 'PENDING' as const,
  invitedAt: '2026-08-20T00:00:00.000Z',
  expiresAt: '2026-09-20T00:00:00.000Z',
  inviter: { id: 'u-1', username: 'aarav', displayName: 'Aarav Joshi', avatarUrl: null },
};

describe('accepting an invitation — what the page says when it fails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    byToken.mockResolvedValue(PENDING_INVITATION);
  });

  // This is the wiring test for the error sweep. `errorMessage` is unit-tested on its own; this
  // proves a real call site actually passes the error through, which is the part that was broken
  // at 36 sites — the helper existing changes nothing if `onError` still ignores its argument.
  it('shows the reason the API gave, not a generic sentence', async () => {
    accept.mockRejectedValue(
      new ApiError(410, 'INVITATION_EXPIRED', 'This invitation expired on 20 August.'),
    );

    renderWithProviders(<InvitationAcceptPage />);
    // Awaited: the page fetches the invitation first, so the buttons appear only once it
    // knows who is asking.
    await userEvent.click(
      await screen.findByRole('button', { name: enMessages.invitation.accept }),
    );

    expect(await screen.findByText('This invitation expired on 20 August.')).toBeInTheDocument();
    expect(screen.queryByText(enMessages.invitation.errorBody)).not.toBeInTheDocument();
  });

  it('falls back to the generic sentence when the failure carries no usable message', async () => {
    accept.mockRejectedValue(new TypeError('Failed to fetch'));

    renderWithProviders(<InvitationAcceptPage />);
    // Awaited: the page fetches the invitation first, so the buttons appear only once it
    // knows who is asking.
    await userEvent.click(
      await screen.findByRole('button', { name: enMessages.invitation.accept }),
    );

    expect(await screen.findByText(enMessages.invitation.errorBody)).toBeInTheDocument();
  });

  it('does not leak a 5xx message, which is written for a log', async () => {
    accept.mockRejectedValue(
      new ApiError(500, 'INTERNAL_ERROR', 'connect ECONNREFUSED 10.0.0.4:5432'),
    );

    renderWithProviders(<InvitationAcceptPage />);
    // Awaited: the page fetches the invitation first, so the buttons appear only once it
    // knows who is asking.
    await userEvent.click(
      await screen.findByRole('button', { name: enMessages.invitation.accept }),
    );

    expect(await screen.findByText(enMessages.invitation.errorBody)).toBeInTheDocument();
    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument();
  });
});

describe('who is asking — the consent decision (#222)', () => {
  beforeEach(() => vi.clearAllMocks());

  // Accepting gives the inviter read access to your journeys, weaknesses and reflections. The
  // page used to fetch nothing and name nobody.
  it('names the inviter, and links to their profile', async () => {
    byToken.mockResolvedValue(PENDING_INVITATION);

    renderWithProviders(<InvitationAcceptPage />);

    const link = await screen.findByRole('link', { name: 'Aarav Joshi' });
    expect(link).toHaveAttribute('href', '/u/aarav');
  });

  // It looked identical for a valid, an expired and an already-used invitation, because it could
  // not know which it had.
  it('says an invitation cannot be used BEFORE offering the buttons', async () => {
    byToken.mockResolvedValue({ ...PENDING_INVITATION, status: 'EXPIRED' });

    renderWithProviders(<InvitationAcceptPage />);

    expect(await screen.findByText(enMessages.invitation.errorTitle)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: enMessages.invitation.accept }),
      'an invitation that cannot be accepted must not offer an accept button',
    ).not.toBeInTheDocument();
  });

  it('does not offer the buttons for a token that resolves to nothing', async () => {
    byToken.mockRejectedValue(new Error('not found'));

    renderWithProviders(<InvitationAcceptPage />);

    expect(await screen.findByText(enMessages.invitation.errorTitle)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: enMessages.invitation.accept }),
    ).not.toBeInTheDocument();
  });
});
