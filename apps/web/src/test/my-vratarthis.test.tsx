import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './helpers/render';
import { MyVratarthisClient } from '@/app/(vratmitra)/vratmitra/my-vratarthis/my-vratarthis-client';
import { vmRelationshipsApi } from '@/lib/api/vm-relationships';
import enMessages from '../../messages/en.json';
import mrMessages from '../../messages/mr.json';

vi.mock('@/lib/api/vm-relationships', () => ({
  vmRelationshipsApi: { getMyVratarthis: vi.fn() },
}));

const getMyVratarthis = vi.mocked(vmRelationshipsApi.getMyVratarthis);

function vratarthi(over: Partial<Parameters<typeof Object.assign>[0]> = {}) {
  return {
    relationshipId: 'rel-1',
    since: '2026-08-01T00:00:00.000Z',
    scope: 'GLOBAL' as const,
    assignedJourneys: [] as string[],
    id: 'va-1',
    displayName: 'Aarav Joshi',
    username: 'aarav',
    avatarUrl: null,
    joinedAt: '2026-07-01T00:00:00.000Z',
    journeyCount: 2,
    ...over,
  };
}

describe('My Vratarthis roster (#193)', () => {
  beforeEach(() => vi.clearAllMocks());

  // A build does not render a page, and next-intl only throws on a missing key at render time.
  // These render for real so a key added to the component but not to messages/ fails here
  // rather than in front of a vratmitra.
  it('renders each person with their name, handle and journey count', async () => {
    getMyVratarthis.mockResolvedValue([
      vratarthi(),
      vratarthi({
        relationshipId: 'rel-2',
        id: 'va-2',
        displayName: 'Sara Kale',
        username: 'sara',
        journeyCount: 0,
      }),
    ]);

    renderWithProviders(<MyVratarthisClient />);

    expect(await screen.findByText('Aarav Joshi')).toBeInTheDocument();
    expect(screen.getByText('@aarav')).toBeInTheDocument();
    expect(screen.getByText('2 journeys')).toBeInTheDocument();
    // Zero is its own phrasing, not "0 journeys" — a vratmitra reads this as a state, not a number.
    expect(screen.getByText('No journeys')).toBeInTheDocument();
  });

  // A vratmitra who guides someone on one journey stands in a different relation to them than a
  // global vratmitra does, and the roster has to say which — otherwise the page implies a
  // standing they may not have.
  it('distinguishes a journey-scoped vratarthi from a global one', async () => {
    getMyVratarthis.mockResolvedValue([
      vratarthi(),
      vratarthi({
        relationshipId: 'rel-2',
        id: 'va-2',
        displayName: 'Sara Kale',
        username: 'sara',
        scope: 'JOURNEY',
        assignedJourneys: ['j-1'],
      }),
    ]);

    renderWithProviders(<MyVratarthisClient />);

    expect(await screen.findByText(enMessages.my_vratarthis.global_scope)).toBeInTheDocument();
    expect(screen.getByText(enMessages.my_vratarthis.journey_scope)).toBeInTheDocument();
  });

  it('links each person to their profile rather than into their material', async () => {
    getMyVratarthis.mockResolvedValue([vratarthi()]);

    renderWithProviders(<MyVratarthisClient />);

    const link = await screen.findByRole('link', { name: 'Aarav Joshi' });
    expect(link).toHaveAttribute('href', '/u/aarav');
  });

  it('shows an invitation to wait, not an error, when nobody has accepted yet', async () => {
    getMyVratarthis.mockResolvedValue([]);

    renderWithProviders(<MyVratarthisClient />);

    expect(await screen.findByText(enMessages.my_vratarthis.empty)).toBeInTheDocument();
  });
});

describe('translation parity', () => {
  it('Marathi carries every key the page asks for', () => {
    // renderWithProviders feeds English messages regardless of locale, so a rendered test cannot
    // catch a missing Marathi key. Compare the namespaces directly.
    expect(Object.keys(mrMessages.my_vratarthis).sort()).toEqual(
      Object.keys(enMessages.my_vratarthis).sort(),
    );
    expect(mrMessages.common.nav.vmMyVratarthis).toBeTruthy();
  });
});
