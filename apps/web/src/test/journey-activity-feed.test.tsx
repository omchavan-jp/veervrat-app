import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../messages/en.json';
import { JourneyActivityFeed } from '@/components/journey/journey-activity-feed';
import type { JourneyActivityEvent } from '@/lib/api/journeys';

const mockUseActivity = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-journeys', () => ({
  useJourneyActivity: () => mockUseActivity(),
}));

function renderFeed() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <JourneyActivityFeed journeyId="j1" />
    </NextIntlClientProvider>,
  );
}

describe('JourneyActivityFeed', () => {
  beforeEach(() => mockUseActivity.mockReset());

  it('shows the empty state when there are no events', () => {
    mockUseActivity.mockReturnValue({ data: [], isLoading: false });
    renderFeed();
    expect(screen.getByText(enMessages.journey.activity.empty)).toBeInTheDocument();
  });

  it('renders an event row with its item title', () => {
    const events: JourneyActivityEvent[] = [
      {
        id: 'exposure:e1:erc_approved',
        type: 'erc_approved',
        at: new Date().toISOString(),
        ercType: 'exposure',
        itemId: 'e1',
        titleEn: 'Talk to a stranger',
        titleMr: null,
      },
    ];
    mockUseActivity.mockReturnValue({ data: events, isLoading: false });
    renderFeed();
    expect(screen.getByText('Talk to a stranger')).toBeInTheDocument();
  });

  it('prefers Devanagari title when available', () => {
    const events: JourneyActivityEvent[] = [
      {
        id: 'resolution:r1:checkin',
        type: 'checkin',
        at: new Date().toISOString(),
        ercType: 'resolution',
        itemId: 'r1',
        titleEn: 'Daily walk',
        titleMr: 'रोज चालणे',
        checkinStatus: 'DONE',
      },
    ];
    mockUseActivity.mockReturnValue({ data: events, isLoading: false });
    renderFeed();
    expect(screen.getByText('रोज चालणे')).toBeInTheDocument();
    expect(screen.queryByText('Daily walk')).not.toBeInTheDocument();
  });
});
