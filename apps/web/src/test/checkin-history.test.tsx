import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUseCheckins = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-journeys', () => ({
  useCheckins: mockUseCheckins,
}));

import { CheckinHistory } from '../../components/journey/checkin-history';

function makeCheckin(id: string, status: 'DONE' | 'PARTIAL' | 'MISSED', note: string | null = null) {
  return {
    id,
    journeyResolutionId: 'r-1',
    status,
    note,
    checkedInAt: new Date(2026, 0, 1, 10, 0, 0).toISOString(),
    createdAt: new Date(2026, 0, 1, 10, 0, 0).toISOString(),
  };
}

function renderHistory(checkins = [] as ReturnType<typeof makeCheckin>[], streak = 0) {
  mockUseCheckins.mockReturnValue({ data: { checkins, streak } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CheckinHistory journeyId="j-1" resolutionId="r-1" />
    </QueryClientProvider>,
  );
}

describe('CheckinHistory', () => {
  it('shows "History (0)" with 0 entries', () => {
    renderHistory([], 0);
    expect(screen.getByText(/History \(0\)/)).toBeInTheDocument();
  });

  it('shows correct count in toggle label', () => {
    renderHistory([makeCheckin('c1', 'DONE'), makeCheckin('c2', 'PARTIAL')], 1);
    expect(screen.getByText(/History \(2\)/)).toBeInTheDocument();
  });

  it('history list is not visible before toggling', () => {
    renderHistory([makeCheckin('c1', 'DONE')], 1);
    expect(screen.queryByText('No check-ins yet.')).not.toBeInTheDocument();
    // The check-in icon should not be visible before expand
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('expands and shows entries when toggle is clicked', () => {
    renderHistory([makeCheckin('c1', 'DONE', 'Great session'), makeCheckin('c2', 'MISSED')], 0);
    fireEvent.click(screen.getByText(/History \(2\)/));
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
    expect(screen.getByText('Great session')).toBeInTheDocument();
  });

  it('collapses when toggle is clicked again', () => {
    renderHistory([makeCheckin('c1', 'DONE')], 1);
    const toggle = screen.getByText(/History \(1\)/);
    fireEvent.click(toggle);
    expect(screen.getByText('✓')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('shows streak badge when streak > 0', () => {
    renderHistory([makeCheckin('c1', 'DONE'), makeCheckin('c2', 'DONE')], 2);
    expect(screen.getByText('🔥 2')).toBeInTheDocument();
  });

  it('does not show streak badge when streak is 0', () => {
    renderHistory([makeCheckin('c1', 'MISSED')], 0);
    expect(screen.queryByText(/🔥/)).not.toBeInTheDocument();
  });

  it('shows "No check-ins yet." when list is empty and expanded', () => {
    renderHistory([], 0);
    fireEvent.click(screen.getByText(/History \(0\)/));
    expect(screen.getByText('No check-ins yet.')).toBeInTheDocument();
  });

  it('shows partial status icon ◑', () => {
    renderHistory([makeCheckin('c1', 'PARTIAL', 'Almost there')], 0);
    fireEvent.click(screen.getByText(/History \(1\)/));
    expect(screen.getByText('◑')).toBeInTheDocument();
    expect(screen.getByText('Almost there')).toBeInTheDocument();
  });

  it('does not show note span when note is null', () => {
    renderHistory([makeCheckin('c1', 'DONE', null)], 1);
    fireEvent.click(screen.getByText(/History \(1\)/));
    expect(screen.getByText('✓')).toBeInTheDocument();
    // No note rendered — just the timestamp
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });
});
