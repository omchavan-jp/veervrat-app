import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './helpers/render';
import InvitationAcceptPage from '@/app/(public)/invitations/[token]/accept/page';
import { invitationsApi } from '@/lib/api/invitations';
import en from '../../messages/en.json';

/**
 * An invitation is the one link in the product routinely opened by somebody with no account.
 *
 * It used to send them to /login with no inviter, no mention of an invitation, and no reason for
 * being there — because the page sat in the auth-guarded route group, so the guard fired before
 * it could render (#252). Its own comment already said it should be "readable without a session,
 * because whoever holds the link may not have an account yet"; the route group disagreed.
 *
 * Accepting still needs a session. Reading who invited you does not.
 */
vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'tok-1' }) }));
vi.mock('@/lib/api/invitations', () => ({
  invitationsApi: { accept: vi.fn(), decline: vi.fn(), byToken: vi.fn() },
}));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: null, isLoading: false, isAuthenticated: false }),
}));

const byToken = vi.mocked(invitationsApi.byToken);

const PENDING = {
  id: 'inv-1',
  token: 'tok-1',
  type: 'VM_GLOBAL' as const,
  scopeId: null,
  status: 'PENDING' as const,
  invitedAt: '2026-08-20T00:00:00.000Z',
  expiresAt: '2026-09-20T00:00:00.000Z',
  inviter: { id: 'u9', displayName: 'Om Chavan', username: 'om_chavan', avatarUrl: null },
};

beforeEach(() => byToken.mockReset());

describe('an invitation opened by somebody with no account', () => {
  it('names the inviter — the whole point of task 5.4', async () => {
    byToken.mockResolvedValue(PENDING);
    renderWithProviders(<InvitationAcceptPage />);

    // Accepting grants read access to journeys, weaknesses and reflections. Nobody should be
    // asked to sign up for that without being told whose it is.
    expect(await screen.findByText('Om Chavan')).toBeInTheDocument();
  });

  it('offers a way in, instead of two buttons that cannot work', async () => {
    byToken.mockResolvedValue(PENDING);
    renderWithProviders(<InvitationAcceptPage />);

    expect(
      await screen.findByText(en.invitation.createAccountToAccept),
    ).toBeInTheDocument();
    expect(screen.getByText(en.invitation.signIn)).toBeInTheDocument();
    expect(screen.getByText(en.invitation.signInToRespond)).toBeInTheDocument();
  });

  it('does not show accept or decline to somebody who cannot use them', async () => {
    byToken.mockResolvedValue(PENDING);
    renderWithProviders(<InvitationAcceptPage />);
    await screen.findByText('Om Chavan');

    expect(screen.queryByRole('button', { name: en.invitation.accept })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en.invitation.decline })).not.toBeInTheDocument();
  });

  it('still refuses an unusable invitation before offering anything', async () => {
    byToken.mockResolvedValue({ ...PENDING, status: 'ACCEPTED' as const });
    renderWithProviders(<InvitationAcceptPage />);

    // Told before pressing, signed in or not — task 5.3, which already passed and must stay so.
    expect(await screen.findByText(en.invitation.errorTitle)).toBeInTheDocument();
    expect(screen.queryByText(en.invitation.createAccountToAccept)).not.toBeInTheDocument();
  });
});
