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
  invitationsApi: { accept: vi.fn(), decline: vi.fn() },
}));

const accept = vi.mocked(invitationsApi.accept);

describe('accepting an invitation — what the page says when it fails', () => {
  beforeEach(() => vi.clearAllMocks());

  // This is the wiring test for the error sweep. `errorMessage` is unit-tested on its own; this
  // proves a real call site actually passes the error through, which is the part that was broken
  // at 36 sites — the helper existing changes nothing if `onError` still ignores its argument.
  it('shows the reason the API gave, not a generic sentence', async () => {
    accept.mockRejectedValue(
      new ApiError(410, 'INVITATION_EXPIRED', 'This invitation expired on 20 August.'),
    );

    renderWithProviders(<InvitationAcceptPage />);
    await userEvent.click(screen.getByRole('button', { name: enMessages.invitation.accept }));

    expect(await screen.findByText('This invitation expired on 20 August.')).toBeInTheDocument();
    expect(screen.queryByText(enMessages.invitation.errorBody)).not.toBeInTheDocument();
  });

  it('falls back to the generic sentence when the failure carries no usable message', async () => {
    accept.mockRejectedValue(new TypeError('Failed to fetch'));

    renderWithProviders(<InvitationAcceptPage />);
    await userEvent.click(screen.getByRole('button', { name: enMessages.invitation.accept }));

    expect(await screen.findByText(enMessages.invitation.errorBody)).toBeInTheDocument();
  });

  it('does not leak a 5xx message, which is written for a log', async () => {
    accept.mockRejectedValue(
      new ApiError(500, 'INTERNAL_ERROR', 'connect ECONNREFUSED 10.0.0.4:5432'),
    );

    renderWithProviders(<InvitationAcceptPage />);
    await userEvent.click(screen.getByRole('button', { name: enMessages.invitation.accept }));

    expect(await screen.findByText(enMessages.invitation.errorBody)).toBeInTheDocument();
    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument();
  });
});
