import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers/render';
import InvitationsPage from '@/app/(app)/invitations/page';
import { usersApi, type UserSearchResult } from '@/lib/api/users';
import { invitationsApi } from '@/lib/api/invitations';
import enMessages from '../../messages/en.json';
import mrMessages from '../../messages/mr.json';

vi.mock('@/lib/api/users', () => ({ usersApi: { search: vi.fn() } }));
vi.mock('@/lib/api/invitations', () => ({
  invitationsApi: { list: vi.fn(), send: vi.fn(), sendReminder: vi.fn(), cancel: vi.fn() },
}));
vi.mock('@/components/invitations/received-invitations', () => ({
  ReceivedInvitations: () => null,
}));

const search = vi.mocked(usersApi.search);

const user = (username: string, displayName: string): UserSearchResult => ({
  username,
  displayName,
  isFollowing: false,
  followsYou: false,
});

const flow = enMessages.invitations_flow;

async function type(text: string) {
  await userEvent.type(screen.getByPlaceholderText(flow.searchPlaceholder), text);
}

describe('invitation search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invitationsApi.list).mockResolvedValue([]);
  });

  it('does not search below two characters', async () => {
    renderWithProviders(<InvitationsPage />);
    await type('a');
    await new Promise((r) => setTimeout(r, 400));
    expect(search).not.toHaveBeenCalled();
  });

  it('shows only what the API returned for the query', async () => {
    search.mockResolvedValue([user('rahul', 'Rahul Patil'), user('rahulk', 'Rahul K')]);
    renderWithProviders(<InvitationsPage />);
    await type('rahul');

    expect(await screen.findByText('Rahul Patil')).toBeInTheDocument();
    expect(screen.getByText('Rahul K')).toBeInTheDocument();
    expect(search).toHaveBeenLastCalledWith('rahul');
  });

  it('shows the empty state, not a list, for a query nobody matches', async () => {
    search.mockResolvedValue([]);
    renderWithProviders(<InvitationsPage />);
    await type('zzzzzzzz');

    expect(await screen.findByText(flow.noResults)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /@/ })).not.toBeInTheDocument();
  });

  it('shows an error, not the empty state, when the search fails', async () => {
    search.mockRejectedValue(new Error('500'));
    renderWithProviders(<InvitationsPage />);
    await type('rahul');

    expect(await screen.findByText(flow.searchError)).toBeInTheDocument();
    expect(screen.queryByText(flow.noResults)).not.toBeInTheDocument();
  });

  it('shows the latest query, even when an earlier response arrives last', async () => {
    let resolveSlow!: (v: UserSearchResult[]) => void;
    search.mockImplementation((q) =>
      q === 'ra'
        ? new Promise<UserSearchResult[]>((r) => {
            resolveSlow = r;
          })
        : Promise.resolve([user('rahul', 'Rahul Patil')]),
    );
    renderWithProviders(<InvitationsPage />);
    const input = screen.getByPlaceholderText(flow.searchPlaceholder);
    await userEvent.type(input, 'ra');
    await waitFor(() => expect(search).toHaveBeenCalledWith('ra'));
    await userEvent.type(input, 'hul');

    expect(await screen.findByText('Rahul Patil')).toBeInTheDocument();
    resolveSlow([user('ramesh', 'Ramesh Stale')]);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Ramesh Stale')).not.toBeInTheDocument();
    expect(screen.getByText('Rahul Patil')).toBeInTheDocument();
  });

  it('clearing the query removes the results', async () => {
    search.mockResolvedValue([user('rahul', 'Rahul Patil')]);
    renderWithProviders(<InvitationsPage />);
    await type('rahul');
    await screen.findByText('Rahul Patil');

    await userEvent.clear(screen.getByPlaceholderText(flow.searchPlaceholder));
    await waitFor(() => expect(screen.queryByText('Rahul Patil')).not.toBeInTheDocument());
  });

  it('renders the Marathi empty and error states', async () => {
    const mr = mrMessages.invitations_flow;
    search.mockResolvedValue([]);
    const first = renderWithProviders(<InvitationsPage />, 'mr');
    await userEvent.type(screen.getByPlaceholderText(mr.searchPlaceholder), 'zzzzzzzz');
    expect(await screen.findByText(mr.noResults)).toBeInTheDocument();
    first.unmount();

    search.mockRejectedValue(new Error('500'));
    renderWithProviders(<InvitationsPage />, 'mr');
    await userEvent.type(screen.getByPlaceholderText(mr.searchPlaceholder), 'rahul');
    expect(await screen.findByText(mr.searchError)).toBeInTheDocument();
  });
});
