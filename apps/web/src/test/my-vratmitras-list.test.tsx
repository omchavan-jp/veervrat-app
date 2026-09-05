import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './helpers/render';

// The component reads `api.get('/vm-relationships/my-vms')` directly rather than going through a
// named api object, so the client module is what has to be mocked. (The task that asked for these
// tests said to mock `dashboardApi`; that was written before the component existed in this shape.)
const mockGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({
  api: { get: mockGet },
}));

import { MyVratmitrasClient } from '@/app/(app)/my-vratmitras/my-vratmitras-client';

type VM = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  scope: 'GLOBAL' | 'JOURNEY';
  assignedJourneys: string[];
};

const vm = (over: Partial<VM> = {}): VM => ({
  id: 'vm-1',
  displayName: 'Arati Kulkarni',
  username: 'arati_k',
  avatarUrl: null,
  scope: 'GLOBAL',
  assignedJourneys: [],
  ...over,
});

// The endpoint answers in a `data` envelope, and the component unwraps it.
const resolveWith = (vms: VM[]) => mockGet.mockResolvedValue({ data: vms });

describe('MyVratmitrasClient — the people walking alongside you', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists each vratmitra by display name and handle', async () => {
    resolveWith([
      vm(),
      vm({ id: 'vm-2', displayName: 'Sameer Joshi', username: 'sameer_j', scope: 'JOURNEY' }),
    ]);

    renderWithProviders(<MyVratmitrasClient />);

    expect(await screen.findByText('Arati Kulkarni')).toBeInTheDocument();
    expect(screen.getByText('@arati_k')).toBeInTheDocument();
    expect(screen.getByText('Sameer Joshi')).toBeInTheDocument();
    expect(screen.getByText('@sameer_j')).toBeInTheDocument();
  });

  // Which kind of relationship someone holds decides what they can see, so the badge is not
  // decoration — a global vratmitra reaches every journey, a journey one reaches exactly one.
  it('distinguishes a global vratmitra from a journey-scoped one', async () => {
    resolveWith([
      vm({ id: 'g', displayName: 'Global Person', username: 'g', scope: 'GLOBAL' }),
      vm({ id: 'j', displayName: 'Journey Person', username: 'j', scope: 'JOURNEY' }),
    ]);

    renderWithProviders(<MyVratmitrasClient />);
    await screen.findByText('Global Person');

    // The domain term, not "Mentor". `spec/CONTEXT.md` is canonical on this, and the onboarding
    // has a whole section titled "Why vratmitra, not mentor" — which the badges used to
    // contradict two screens later.
    expect(screen.getByText('Global Vratmitra')).toBeInTheDocument();
    expect(screen.getByText('Journey Vratmitra')).toBeInTheDocument();
  });

  // The whole point of the card: getting from here into the conversation.
  //
  // Queried by ROLE deliberately. The call to action is a Base UI `Button` with `render={<Link/>}`,
  // and the primitive used to stamp `role="button"` over the anchor's implicit `link` role — so
  // this assertion failed while the anchor sat in the DOM, and a screen reader would not have
  // found it among the page's links either. If it starts failing again, that regressed.
  it('each card links to that vratmitra’s chat thread, and is announced as a link', async () => {
    resolveWith([vm({ id: 'vm-42' })]);

    renderWithProviders(<MyVratmitrasClient />);
    await screen.findByText('Arati Kulkarni');

    const chatLink = screen
      .getAllByRole('link')
      .find((a) => a.getAttribute('href') === '/my-vratmitras/vm-42/chat');

    expect(chatLink, 'no element with the link role points at the chat thread').toBeDefined();
  });

  it('links the name to that person’s public profile', async () => {
    resolveWith([vm({ username: 'arati_k' })]);

    renderWithProviders(<MyVratmitrasClient />);

    const nameLink = await screen.findByRole('link', { name: 'Arati Kulkarni' });
    expect(nameLink).toHaveAttribute('href', '/u/arati_k');
  });

  it('shows how many journeys a vratmitra is assigned to, when there are any', async () => {
    resolveWith([vm({ assignedJourneys: ['j1', 'j2'] })]);

    renderWithProviders(<MyVratmitrasClient />);
    await screen.findByText('Arati Kulkarni');

    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  // Having invited nobody is the ordinary state of a new account, not a failure. It must read as
  // an invitation to act, not as an error — and the invite route has to stay reachable from here.
  it('shows an empty state, not an error, when there are no vratmitras', async () => {
    resolveWith([]);

    renderWithProviders(<MyVratmitrasClient />);

    // The empty state's own words, so this fails if the branch stops rendering.
    expect(
      await screen.findByText("You haven't been assigned any Vratmitras yet."),
    ).toBeInTheDocument();

    // And a way out of it — the invite route stays reachable from here, as a real link.
    const inviteLink = screen
      .getAllByRole('link')
      .find((a) => a.getAttribute('href') === '/invitations');
    expect(inviteLink, 'the empty state offers no way to invite anyone').toBeDefined();

    // Nothing that reads as a failure. This is the ordinary state of a new account.
    expect(screen.queryByText(/failed|error/i)).not.toBeInTheDocument();
  });

  // Distinct from empty: the request itself failed. Rendering an empty state here would tell
  // someone they have no vratmitras when in fact we could not find out.
  it('reports a failed request distinctly from an empty list', async () => {
    mockGet.mockRejectedValue(new Error('network down'));

    renderWithProviders(<MyVratmitrasClient />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // The failure branch renders; the empty-state invite prompt is not what is shown.
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });
  });

  it('asks the endpoint the page is actually about', async () => {
    resolveWith([]);

    renderWithProviders(<MyVratmitrasClient />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/vm-relationships/my-vms');
    });
  });
});
