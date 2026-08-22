import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockDashboardApi = vi.hoisted(() => ({
  getStats: vi.fn(),
  getSuggestions: vi.fn(),
  getPlatformStats: vi.fn(),
}));

vi.mock('@/lib/api/dashboard', () => ({
  dashboardApi: mockDashboardApi,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`;
    return key;
  },
  useLocale: () => 'en',
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { DashboardSuggestions } from '../../components/dashboard/dashboard-suggestions';

function renderSuggestions() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardSuggestions />
    </QueryClientProvider>,
  );
}

function makeSuggestion(overrides = {}) {
  return {
    sentenceId: 's-1',
    sentenceTextEn: 'I avoid difficult conversations',
    sentenceTextMr: null,
    score: 1,
    subvirtueId: 'sv-1',
    subvirtueNameEn: 'Courage',
    subvirtueNameMr: null,
    virtueId: 'v-1',
    virtueNameEn: 'Bravery',
    virtueNameMr: null,
    weaknessId: 'w-1',
    weaknessNameEn: 'Avoidance',
    ...overrides,
  };
}

describe('DashboardSuggestions', () => {
  it('shows empty state when suggestions is empty array', async () => {
    mockDashboardApi.getSuggestions.mockResolvedValue({ suggestions: [] });
    renderSuggestions();
    await waitFor(() => {
      expect(screen.getByText('suggestionsEmpty')).toBeInTheDocument();
    });
    expect(screen.getByText('suggestionsEmptyCta')).toBeInTheDocument();
  });

  it('renders suggestion card with sentence text', async () => {
    mockDashboardApi.getSuggestions.mockResolvedValue({ suggestions: [makeSuggestion()] });
    renderSuggestions();
    await waitFor(() => {
      expect(screen.getByText('I avoid difficult conversations')).toBeInTheDocument();
    });
  });

  it('renders "Start journey" link with correct sentenceId', async () => {
    mockDashboardApi.getSuggestions.mockResolvedValue({
      suggestions: [makeSuggestion({ sentenceId: 'sent-abc' })],
    });
    renderSuggestions();
    await waitFor(() => {
      const link = screen.getByText('suggestionsStartJourney').closest('a');
      expect(link).toHaveAttribute('href', '/study?sentenceId=sent-abc');
    });
  });

  it('renders subvirtue badge', async () => {
    mockDashboardApi.getSuggestions.mockResolvedValue({ suggestions: [makeSuggestion()] });
    renderSuggestions();
    await waitFor(() => {
      expect(screen.getByText('Courage')).toBeInTheDocument();
    });
  });

  it('renders multiple suggestions', async () => {
    mockDashboardApi.getSuggestions.mockResolvedValue({
      suggestions: [
        makeSuggestion({ sentenceId: 's-1', sentenceTextEn: 'First sentence' }),
        makeSuggestion({ sentenceId: 's-2', sentenceTextEn: 'Second sentence' }),
      ],
    });
    renderSuggestions();
    await waitFor(() => {
      expect(screen.getByText('First sentence')).toBeInTheDocument();
      expect(screen.getByText('Second sentence')).toBeInTheDocument();
    });
  });
});
