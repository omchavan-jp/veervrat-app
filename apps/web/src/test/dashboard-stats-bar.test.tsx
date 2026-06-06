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
}));

import { DashboardStatsBar } from '../../components/dashboard/dashboard-stats-bar';

function renderBar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardStatsBar />
    </QueryClientProvider>,
  );
}

const makeStats = (overrides = {}) => ({
  virtues: { count: 2 },
  subvirtues: { count: 3 },
  journeys: { active: 2, completed: 1 },
  exposures: { active: 0, completed: 0 },
  resolutions: { active: 0, completed: 0 },
  challenges: { active: 0, completed: 0 },
  weaknesses: { explored: 2 },
  tests: { taken: 3 },
  ...overrides,
});

describe('DashboardStatsBar', () => {
  it('renders virtue and subvirtue counts from API', async () => {
    mockDashboardApi.getStats.mockResolvedValue(makeStats());
    renderBar();
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('renders loading skeleton when data is not yet available', () => {
    mockDashboardApi.getStats.mockReturnValue(new Promise(() => {}));
    const { container } = renderBar();
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders zero state without crashing', async () => {
    mockDashboardApi.getStats.mockResolvedValue(
      makeStats({ virtues: { count: 0 }, subvirtues: { count: 0 }, journeys: { active: 0, completed: 0 } }),
    );
    renderBar();
    await waitFor(() => {
      // Two 0s rendered (virtues + subvirtues)
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2);
    });
  });
});
