import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './helpers/render';

// The component measures its footer height via ResizeObserver (not provided by
// jsdom). Stub it so the page mounts; behaviour under test is unaffected.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

function renderWithQuery(ui: React.ReactElement) {
  return renderWithProviders(ui);
}

const mockSaveAnswers = vi.hoisted(() => vi.fn());

// Must use vi.hoisted so WEAKNESS_DATA is available when vi.mock factory runs
const WEAKNESS_DATA = vi.hoisted(() => ({
  id: 'w1',
  nameEn: 'Test Weakness',
  nameMr: null,
  category: 'A',
  description: null,
  subvirtues: [
    {
      id: 'sv1',
      nameEn: 'Subvirtue A',
      nameMr: null,
      description: null,
      priority: 0,
      virtue: { id: 'v1', nameEn: 'Virtue A', nameMr: null },
      sentences: [
        { sentenceId: 's1', textEn: 'I act with courage', textMr: null },
        { sentenceId: 's2', textEn: 'I speak the truth', textMr: null },
      ],
    },
  ],
  testHistory: [],
  draftTestId: null,
}));

vi.mock('@/hooks/use-weaknesses', () => ({
  useWeakness: vi.fn().mockReturnValue({ data: WEAKNESS_DATA, isLoading: false }),
  useWeaknesses: vi.fn().mockReturnValue({ data: { clusters: [] }, isLoading: false }),
}));

vi.mock('@/hooks/use-tests', () => ({
  useSaveAnswers: () => ({ mutate: mockSaveAnswers, isPending: false }),
  useCreateTest: () => ({ mutate: vi.fn(), isPending: false }),
  useSubmitTest: () => ({ mutate: vi.fn(), isPending: false }),
  useTestReport: () => ({ data: null, isLoading: true }),
  useTest: () => ({
    data: {
      id: 'tid-1',
      userId: 'u1',
      weaknessId: 'w1',
      isDraft: true,
      submittedAt: null,
      answers: [],
    },
    isLoading: false,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: 'w1', testId: 'tid-1' }),
}));

import TestQuestionPage from '../../app/(app)/study/[id]/test/[testId]/page';

describe('TestQuestionPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the first sentence in one-at-a-time mode', () => {
    renderWithQuery(<TestQuestionPage />);
    expect(screen.getByText('I act with courage')).toBeInTheDocument();
  });

  it('shows all 4 answer buttons', () => {
    renderWithQuery(<TestQuestionPage />);
    // Answer options are now ToggleGroup items rendered as buttons with aria-pressed.
    expect(screen.getByRole('button', { name: 'Always' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Often' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sometimes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Never' })).toBeInTheDocument();
  });

  it('review button is disabled when no answers selected', () => {
    renderWithQuery(<TestQuestionPage />);
    const reviewBtn = screen.getByRole('button', { name: /review responses/i });
    expect(reviewBtn).toBeDisabled();
  });

  it('review button enables after selecting an answer', async () => {
    renderWithQuery(<TestQuestionPage />);
    const alwaysBtn = screen.getByRole('button', { name: 'Always' });
    fireEvent.click(alwaysBtn);
    // Selection is exposed via aria-pressed, not a background class.
    expect(alwaysBtn).toHaveAttribute('aria-pressed', 'true');
    const reviewBtn = screen.getByRole('button', { name: /review responses/i });
    expect(reviewBtn).not.toBeDisabled();
  });

  it('only one answer is selected at a time per sentence', () => {
    renderWithQuery(<TestQuestionPage />);
    const alwaysBtn = screen.getByRole('button', { name: 'Always' });
    const oftenBtn = screen.getByRole('button', { name: 'Often' });

    fireEvent.click(alwaysBtn);
    expect(alwaysBtn).toHaveAttribute('aria-pressed', 'true');
    expect(oftenBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(oftenBtn);
    expect(oftenBtn).toHaveAttribute('aria-pressed', 'true');
    expect(alwaysBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires debounced save after answer selection', async () => {
    renderWithQuery(<TestQuestionPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Always' }));

    await act(async () => {
      vi.advanceTimersByTime(650);
      await Promise.resolve();
    });

    // mutate is now called with the payload plus a mutation-options object
    // (onSuccess/onError); assert the payload exactly, allow the options arg.
    expect(mockSaveAnswers).toHaveBeenCalledWith(
      [{ sentenceId: 's1', score: 4 }],
      expect.anything(),
    );
  });

  it('toggles to view-all mode showing all sentences', () => {
    renderWithQuery(<TestQuestionPage />);
    const toggleBtn = screen.getByRole('button', { name: 'View all' });
    fireEvent.click(toggleBtn);
    // Both sentences should now be visible
    expect(screen.getByText('I act with courage')).toBeInTheDocument();
    expect(screen.getByText('I speak the truth')).toBeInTheDocument();
  });

  it('shows progress bar label', () => {
    renderWithQuery(<TestQuestionPage />);
    expect(screen.getByText('0/2 reflected on')).toBeInTheDocument();
  });
});
