import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUseJourneys = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-journeys', () => ({
  useJourneys: mockUseJourneys,
  useJourney: vi.fn(),
  useCreateJourney: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  useUpdateJourneyState: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  useUpdateJourneyTitle: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    if (params) return Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), key);
    return key;
  },
  useFormatter: () => ({
    dateTime: (date: Date) => date.toISOString().slice(0, 10),
  }),
  useLocale: () => 'en',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ id: 'j-1' }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

import JourneysPage from '../../app/(app)/journeys/page';

const JOURNEYS = [
  {
    id: 'j-1',
    title: 'Journey Alpha',
    state: 'ACTIVE' as const,
    updatedAt: '2026-06-04T10:00:00Z',
    sentence: { textEn: 'I act with courage' },
    weaknesses: [{ weakness: { nameEn: 'Indecisiveness' } }],
  },
  {
    id: 'j-2',
    title: 'Journey Beta',
    state: 'PAUSED' as const,
    updatedAt: '2026-06-03T10:00:00Z',
    sentence: { textEn: 'I speak the truth' },
    weaknesses: [],
  },
];

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('JourneysPage', () => {
  it('renders journey cards with title and state badge', () => {
    mockUseJourneys.mockReturnValue({ data: { items: JOURNEYS, nextCursor: null }, isLoading: false });
    renderWithQuery(<JourneysPage />);
    expect(screen.getByText('Journey Alpha')).toBeInTheDocument();
    expect(screen.getByText('Journey Beta')).toBeInTheDocument();
    expect(screen.getByText('stateBadge.active')).toBeInTheDocument();
    expect(screen.getByText('stateBadge.paused')).toBeInTheDocument();
  });

  it('renders weakness tags on journey card', () => {
    mockUseJourneys.mockReturnValue({ data: { items: JOURNEYS, nextCursor: null }, isLoading: false });
    renderWithQuery(<JourneysPage />);
    expect(screen.getByText('Indecisiveness')).toBeInTheDocument();
  });

  it('renders empty state with CTA when no journeys', () => {
    mockUseJourneys.mockReturnValue({ data: { items: [], nextCursor: null }, isLoading: false });
    renderWithQuery(<JourneysPage />);
    expect(screen.getByText('list.emptyState')).toBeInTheDocument();
    // The CTA is a Button primitive rendered as a Link (base-ui forces role="button"
    // on the anchor), so query the rendered role/name and still assert the destination.
    const cta = screen.getByRole('button', { name: 'list.emptyStateCta' });
    expect(cta).toHaveAttribute('href', '/study');
  });

  it('renders a shape-matching skeleton while loading', () => {
    mockUseJourneys.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderWithQuery(<JourneysPage />);
    // List screens use skeleton placeholders (pulse) instead of a centered spinner so
    // the layout doesn't pop in. The title stays for stability.
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.getByText('list.title')).toBeInTheDocument();
  });
});
