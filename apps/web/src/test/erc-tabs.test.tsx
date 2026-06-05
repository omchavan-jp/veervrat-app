import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSelectMutate = vi.hoisted(() => vi.fn());
const mockUpdateStatusMutate = vi.hoisted(() => vi.fn());
const mockDeactivateMutate = vi.hoisted(() => vi.fn());
const mockReactivateMutate = vi.hoisted(() => vi.fn());
const mockRemoveMutate = vi.hoisted(() => vi.fn());

const POOL_ITEMS = vi.hoisted(() => [
  { id: 'p1', titleEn: 'Pool Exposure A', descriptionEn: null, tier: 'LOCAL', weaknessTags: [] },
  { id: 'p2', titleEn: 'Pool Exposure B', descriptionEn: 'Do this daily', tier: 'NATIONAL', weaknessTags: [] },
]);

const ACTIVE_ITEMS = vi.hoisted(() => [
  { id: 'e1', journeyId: 'j-1', status: 'NOT_STARTED', isDeactivated: false, isCustom: false, titleEn: 'Selected Exposure', descriptionEn: null, tier: 'LOCAL', startedAt: null, submittedAt: null, approvedAt: null },
  { id: 'e2', journeyId: 'j-1', status: 'IN_PROGRESS', isDeactivated: false, isCustom: false, titleEn: 'Active Exposure', descriptionEn: null, tier: 'LOCAL', startedAt: new Date().toISOString(), submittedAt: null, approvedAt: null },
  { id: 'e3', journeyId: 'j-1', status: 'APPROVED', isDeactivated: true, isCustom: false, titleEn: 'Deactivated Exposure', descriptionEn: null, tier: 'LOCAL', startedAt: null, submittedAt: null, approvedAt: null },
]);

// useErcItems returns empty by default so pool opens (defaultOpen = !hasItems = true)
const mockUseErcItems = vi.hoisted(() => vi.fn().mockReturnValue({ data: [], isLoading: false }));

vi.mock('@/hooks/use-journeys', () => ({
  useErcPool: vi.fn().mockReturnValue({ data: POOL_ITEMS, isLoading: false }),
  useErcItems: mockUseErcItems,
  useSelectErc: vi.fn().mockReturnValue({ mutate: mockSelectMutate, isPending: false }),
  useUpdateErcStatus: vi.fn().mockReturnValue({ mutate: mockUpdateStatusMutate, isPending: false }),
  useDeactivateErc: vi.fn().mockReturnValue({ mutate: mockDeactivateMutate, isPending: false }),
  useReactivateErc: vi.fn().mockReturnValue({ mutate: mockReactivateMutate, isPending: false }),
  useRemoveErc: vi.fn().mockReturnValue({ mutate: mockRemoveMutate, isPending: false }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { ExposuresTab } from '../../components/journey/exposures-tab';

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('ExposuresTab — pool section (no items selected)', () => {
  it('renders pool items when pool is open', () => {
    // mockUseErcItems returns [] by default → pool opens
    wrap(<ExposuresTab journeyId="j-1" hasVm={false} />);
    expect(screen.getByText('Pool Exposure A')).toBeInTheDocument();
    expect(screen.getByText('Pool Exposure B')).toBeInTheDocument();
  });

  it('Select button calls selectErc mutation', () => {
    wrap(<ExposuresTab journeyId="j-1" hasVm={false} />);
    const selectBtns = screen.getAllByText('Select');
    fireEvent.click(selectBtns[0]);
    expect(mockSelectMutate).toHaveBeenCalledWith({ poolItemId: 'p1' });
  });

  it('empty active state shown when no items selected', () => {
    wrap(<ExposuresTab journeyId="j-1" hasVm={false} />);
    expect(screen.getByText(/Browse the pool above/)).toBeInTheDocument();
  });
});

describe('ExposuresTab — active items', () => {
  beforeEach(() => {
    mockUseErcItems.mockReturnValue({ data: ACTIVE_ITEMS, isLoading: false });
  });
  afterEach(() => {
    mockUseErcItems.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders active item titles', () => {
    wrap(<ExposuresTab journeyId="j-1" hasVm={false} />);
    expect(screen.getByText('Selected Exposure')).toBeInTheDocument();
    expect(screen.getByText('Active Exposure')).toBeInTheDocument();
  });

  it('NOT_STARTED item shows Start button', () => {
    wrap(<ExposuresTab journeyId="j-1" hasVm={false} />);
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('IN_PROGRESS item shows Submit button', () => {
    wrap(<ExposuresTab journeyId="j-1" hasVm={false} />);
    expect(screen.getByText('Submit for closure')).toBeInTheDocument();
  });

  it('Start button calls updateStatus with in_progress', () => {
    wrap(<ExposuresTab journeyId="j-1" hasVm={false} />);
    fireEvent.click(screen.getByText('Start'));
    expect(mockUpdateStatusMutate).toHaveBeenCalledWith({ itemId: 'e1', status: 'in_progress' });
  });

  it('deactivated item shows Reactivate and Remove buttons', () => {
    wrap(<ExposuresTab journeyId="j-1" hasVm={false} />);
    expect(screen.getByText('Reactivate')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('Deactivate button calls deactivate mutation', () => {
    wrap(<ExposuresTab journeyId="j-1" hasVm={false} />);
    const deactivateBtns = screen.getAllByText('Deactivate');
    fireEvent.click(deactivateBtns[0]);
    expect(mockDeactivateMutate).toHaveBeenCalledWith({ itemId: 'e1' });
  });
});
