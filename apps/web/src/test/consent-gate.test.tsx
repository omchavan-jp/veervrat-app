import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const outstandingConsents = vi.fn();
const acceptConsents = vi.fn();
vi.mock('@/lib/api/auth', () => ({
  authApi: {
    outstandingConsents: () => outstandingConsents(),
    acceptConsents: () => acceptConsents(),
  },
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { ConsentGate } from '@/components/shared/consent-gate';

function renderGate(enabled = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ConsentGate enabled={enabled} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  outstandingConsents.mockReset().mockResolvedValue([]);
  acceptConsents.mockReset().mockResolvedValue([]);
});

describe('ConsentGate', () => {
  it('renders nothing when nothing is outstanding', async () => {
    renderGate();
    await waitFor(() => expect(outstandingConsents).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('blocks with a dialog when a document needs accepting', async () => {
    outstandingConsents.mockResolvedValue([{ documentKey: 'privacy', version: 2 }]);
    renderGate();

    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('links to each document so nobody accepts text they cannot read', async () => {
    outstandingConsents.mockResolvedValue([
      { documentKey: 'terms', version: 2 },
      { documentKey: 'privacy', version: 2 },
    ]);
    renderGate();

    await screen.findByRole('dialog');
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href')).sort()).toEqual(['/privacy', '/terms']);
  });

  it('accepts, then clears once the server agrees', async () => {
    outstandingConsents
      .mockResolvedValueOnce([{ documentKey: 'privacy', version: 2 }])
      .mockResolvedValue([]);
    renderGate();

    fireEvent.click(await screen.findByRole('button'));

    await waitFor(() => expect(acceptConsents).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('stays open and says so when accepting fails', async () => {
    // Silently closing on failure would be the worst outcome: it would look accepted while
    // nothing was recorded.
    outstandingConsents.mockResolvedValue([{ documentKey: 'privacy', version: 2 }]);
    acceptConsents.mockRejectedValue(new Error('network'));
    renderGate();

    fireEvent.click(await screen.findByRole('button'));

    await screen.findByText('failed');
    expect(screen.queryByRole('dialog')).not.toBeNull();
  });

  it('does not lock anyone out when the check itself fails', async () => {
    // A failed lookup must not render an unclearable gate. Missing one re-prompt is a small
    // cost; an app nobody can use is not.
    outstandingConsents.mockRejectedValue(new Error('boom'));
    renderGate();

    await waitFor(() => expect(outstandingConsents).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('asks nothing while signed out', async () => {
    renderGate(false);
    await new Promise((r) => setTimeout(r, 10));
    expect(outstandingConsents).not.toHaveBeenCalled();
  });
});
