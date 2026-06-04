import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseWeaknesses = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    data: {
      clusters: [
        {
          key: 'A',
          label: 'Identity & Self-Perception',
          weaknesses: [
            { id: 'w1', nameEn: 'Weakness Alpha', nameMr: null, category: 'A', description: 'Some description', stats: null },
            { id: 'w2', nameEn: 'Weakness Beta', nameMr: null, category: 'A', description: null, stats: null },
          ],
        },
        {
          key: 'B',
          label: 'Will, Effort & Relating',
          weaknesses: [
            { id: 'w3', nameEn: 'Weakness Gamma', nameMr: null, category: 'B', description: null, stats: null },
          ],
        },
      ],
    },
    isLoading: false,
  }),
);

vi.mock('@/hooks/use-weaknesses', () => ({
  useWeaknesses: mockUseWeaknesses,
  useWeakness: vi.fn().mockReturnValue({ data: null, isLoading: false }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`;
    return key;
  },
  getTranslations: async () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ id: 'w1', testId: 'tid-1' }),
  useSearchParams: () => ({ get: vi.fn().mockReturnValue(null) }),
}));

vi.mock('@/components/study/why-modal', () => ({
  WhyModal: () => <button>Why study weaknesses?</button>,
}));

// Test the dashboard page since the browser page is a server component
import DashboardPage from '../../app/(app)/dashboard/page';

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'u1', displayName: 'Om', email: 'om@example.com', roles: ['VRATARTHI'], username: 'om', language: 'EN', gender: null, dob: null, emailVerifiedAt: new Date().toISOString(), onboardingCompletedAt: new Date().toISOString() },
    isLoading: false,
    isAuthenticated: true,
  }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('Dashboard — Path card 01 (weakness study stats)', () => {
  it('renders Path card 01 with study section', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/pathCard01Title/i)).toBeInTheDocument();
  });

  it('shows 0 weaknesses explored when no tests taken', () => {
    render(<DashboardPage />);
    expect(screen.getAllByText('0')[0]).toBeInTheDocument();
  });

  it('renders go-to-study link', () => {
    render(<DashboardPage />);
    const studyLink = screen.getByRole('link', { name: /goStudy/i });
    expect(studyLink).toHaveAttribute('href', '/study');
  });

  it('shows empty state CTA when no tests taken', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/noSuggestions/i)).toBeInTheDocument();
  });
});
