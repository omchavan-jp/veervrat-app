import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './helpers/render';

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
  return renderWithProviders(<CheckinForm journeyId="j-1" resolutionId="r-1" />);
}

// Status options are now design-system Button primitives exposed as a radiogroup
// (role="radio" + aria-checked) rather than raw <button>s. The submit control is
// the only role="button" and carries the visible/i18n "Log check-in" label.
const status = (name: string) => screen.getByRole('radio', { name });
const submit = () => screen.getByRole('button', { name: /Log check-in/i });
const querySubmit = () => screen.queryByRole('button', { name: /Log check-in/i });

describe('CheckinForm', () => {
  beforeEach(() => {
    mockLogCheckinMutate.mockReset();
    mockIsPending.value = false;
  });

  it('renders Done, Partial, Missed toggle buttons', () => {
    renderForm();
    expect(status('Done')).toBeInTheDocument();
    expect(status('Partial')).toBeInTheDocument();
    expect(status('Missed')).toBeInTheDocument();
  });

  it('does not show note textarea or submit button before selecting a status', () => {
    renderForm();
    expect(screen.queryByPlaceholderText(/Optional note/)).not.toBeInTheDocument();
    expect(querySubmit()).not.toBeInTheDocument();
  });

  it('shows note textarea and submit button after selecting Done', () => {
    renderForm();
    fireEvent.click(status('Done'));
    expect(screen.getByPlaceholderText(/Optional note/)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(submit()).toBeInTheDocument();
  });

  it('only one status is selected at a time — switching from Done to Partial', () => {
    renderForm();
    fireEvent.click(status('Done'));
    expect(status('Done')).toHaveAttribute('aria-checked', 'true');
    expect(status('Partial')).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(status('Partial'));
    // Selection moves to Partial; Done is no longer selected (exclusive selection).
    expect(status('Partial')).toHaveAttribute('aria-checked', 'true');
    expect(status('Done')).toHaveAttribute('aria-checked', 'false');
    // After clicking Partial, submit should still appear (form still open)
    expect(submit()).toBeInTheDocument();
  });

  it('calls mutate with correct status and no note when submitted without note', () => {
    renderForm();
    fireEvent.click(status('Done'));
    fireEvent.click(submit());
    expect(mockLogCheckinMutate).toHaveBeenCalledWith(
      { status: 'DONE', note: undefined },
      expect.any(Object),
    );
  });

  it('calls mutate with note when note is filled in', () => {
    renderForm();
    fireEvent.click(status('Partial'));
    fireEvent.change(screen.getByPlaceholderText(/Optional note/), {
      target: { value: 'Half done today' },
    });
    fireEvent.click(submit());
    expect(mockLogCheckinMutate).toHaveBeenCalledWith(
      { status: 'PARTIAL', note: 'Half done today' },
      expect.any(Object),
    );
  });

  it('calls mutate with correct status for Missed', () => {
    renderForm();
    fireEvent.click(status('Missed'));
    fireEvent.click(submit());
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
