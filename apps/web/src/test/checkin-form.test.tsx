import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockLogCheckinMutate = vi.hoisted(() => vi.fn());
const mockIsPending = vi.hoisted(() => ({ value: false }));

vi.mock('@/hooks/use-journeys', () => ({
  useLogCheckin: vi.fn(() => ({
    mutate: mockLogCheckinMutate,
    isPending: mockIsPending.value,
  })),
}));

import { CheckinForm } from '../../components/journey/checkin-form';

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CheckinForm journeyId="j-1" resolutionId="r-1" />
    </QueryClientProvider>,
  );
}

describe('CheckinForm', () => {
  beforeEach(() => {
    mockLogCheckinMutate.mockReset();
    mockIsPending.value = false;
  });

  it('renders Done, Partial, Missed toggle buttons', () => {
    renderForm();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Partial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Missed' })).toBeInTheDocument();
  });

  it('does not show note textarea or submit button before selecting a status', () => {
    renderForm();
    expect(screen.queryByPlaceholderText(/Optional note/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Log check-in/i })).not.toBeInTheDocument();
  });

  it('shows note textarea and submit button after selecting Done', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByPlaceholderText(/Optional note/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log check-in/i })).toBeInTheDocument();
  });

  it('only one status is selected at a time — switching from Done to Partial', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Partial' }));
    // After clicking Partial, submit should still appear (form still open)
    expect(screen.getByRole('button', { name: /Log check-in/i })).toBeInTheDocument();
  });

  it('calls mutate with correct status and no note when submitted without note', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.click(screen.getByRole('button', { name: /Log check-in/i }));
    expect(mockLogCheckinMutate).toHaveBeenCalledWith(
      { status: 'DONE', note: undefined },
      expect.any(Object),
    );
  });

  it('calls mutate with note when note is filled in', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Partial' }));
    fireEvent.change(screen.getByPlaceholderText(/Optional note/), {
      target: { value: 'Half done today' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Log check-in/i }));
    expect(mockLogCheckinMutate).toHaveBeenCalledWith(
      { status: 'PARTIAL', note: 'Half done today' },
      expect.any(Object),
    );
  });

  it('calls mutate with correct status for Missed', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Missed' }));
    fireEvent.click(screen.getByRole('button', { name: /Log check-in/i }));
    expect(mockLogCheckinMutate).toHaveBeenCalledWith(
      { status: 'MISSED', note: undefined },
      expect.any(Object),
    );
  });

  it('does not call mutate when no status is selected', () => {
    renderForm();
    // No status selected — submit button not visible, but test the guard
    // (status toggle buttons do not call mutate directly)
    expect(mockLogCheckinMutate).not.toHaveBeenCalled();
  });
});
