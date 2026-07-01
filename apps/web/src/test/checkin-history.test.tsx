import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './helpers/render';

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
  return renderWithProviders(<CheckinHistory journeyId="j-1" resolutionId="r-1" />);
}

// The expander is now a Collapsible whose trigger renders a real <button>
// carrying the "History (N)" label. Status glyphs (✓/◑/✗) became lucide icons
// paired with sr-only translated labels (Done/Partial/Missed); the 🔥 streak
// glyph became a Flame icon inside a span labelled via aria-label.
function getToggle(count: number) {
  return screen.getByRole('button', { name: new RegExp(`History \\(${count}\\)`) });
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
    expect(getToggle(1)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('No check-ins yet.')).not.toBeInTheDocument();
    // The DONE status label should not be visible before expand
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('expands and shows entries when toggle is clicked', () => {
    renderHistory([makeCheckin('c1', 'DONE', 'Great session'), makeCheckin('c2', 'MISSED')], 0);
    const toggle = getToggle(2);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Missed')).toBeInTheDocument();
    expect(screen.getByText('Great session')).toBeInTheDocument();
  });

  it('collapses when toggle is clicked again', () => {
    renderHistory([makeCheckin('c1', 'DONE')], 1);
    const toggle = getToggle(1);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Done')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('shows streak badge when streak > 0', () => {
    renderHistory([makeCheckin('c1', 'DONE'), makeCheckin('c2', 'DONE')], 2);
    const streak = screen.getByLabelText('2-day streak');
    expect(streak).toBeInTheDocument();
    expect(streak).toHaveTextContent('2');
  });

  it('does not show streak badge when streak is 0', () => {
    renderHistory([makeCheckin('c1', 'MISSED')], 0);
    expect(screen.queryByLabelText(/streak/)).not.toBeInTheDocument();
  });

  it('shows "No check-ins yet." when list is empty and expanded', () => {
    renderHistory([], 0);
    fireEvent.click(getToggle(0));
    expect(screen.getByText('No check-ins yet.')).toBeInTheDocument();
  });

  it('shows partial status icon ◑', () => {
    renderHistory([makeCheckin('c1', 'PARTIAL', 'Almost there')], 0);
    fireEvent.click(getToggle(1));
    expect(screen.getByText('Partial')).toBeInTheDocument();
    expect(screen.getByText('Almost there')).toBeInTheDocument();
  });

  it('does not show note span when note is null', () => {
    renderHistory([makeCheckin('c1', 'DONE', null)], 1);
    fireEvent.click(getToggle(1));
    expect(screen.getByText('Done')).toBeInTheDocument();
    // No note rendered — just the timestamp
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });
});
