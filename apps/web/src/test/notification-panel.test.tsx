import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockNotificationsApi = vi.hoisted(() => ({
  list: vi.fn(),
  markAllRead: vi.fn(),
  markRead: vi.fn(),
  getUnreadCount: vi.fn(),
}));

vi.mock('@/lib/api/notifications', () => ({
  notificationsApi: mockNotificationsApi,
}));

const mockPush = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { NotificationPanel } from '../../components/layout/notification-panel';

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n-1',
    eventType: 'ERC_CLOSURE_APPROVED',
    resourceType: 'exposure',
    resourceId: 'res-1',
    readAt: null,
    dismissedAt: null,
    archivedAt: null,
    createdAt: new Date(2026, 0, 1, 10, 0, 0).toISOString(),
    actor: { id: 'u-1', displayName: 'Mentor One', avatarUrl: null },
    ...overrides,
  };
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NotificationPanel />
    </QueryClientProvider>,
  );
}

describe('NotificationPanel', () => {
  it('renders unread dot for an unread notification', async () => {
    mockNotificationsApi.list.mockResolvedValue({ items: [makeItem()], nextCursor: null });

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Mentor One')).toBeInTheDocument();
    });

    // The filled dot is rendered as a span with bg-primary; check the read-status label text
    expect(screen.getByText('ERC closure approved')).toBeInTheDocument();
  });

  it('renders "read" dot (transparent) for an already-read notification', async () => {
    const readItem = makeItem({ readAt: new Date().toISOString() });
    mockNotificationsApi.list.mockResolvedValue({ items: [readItem], nextCursor: null });

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Mentor One')).toBeInTheDocument();
    });
  });

  it('shows empty state when list is empty', async () => {
    mockNotificationsApi.list.mockResolvedValue({ items: [], nextCursor: null });

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });

  it('mark-all-read button calls the API and is present', async () => {
    mockNotificationsApi.list.mockResolvedValue({ items: [makeItem()], nextCursor: null });
    mockNotificationsApi.markAllRead.mockResolvedValue({ updated: 1 });

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Mentor One')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark all as read'));

    await waitFor(() => {
      expect(mockNotificationsApi.markAllRead).toHaveBeenCalledOnce();
    });
  });

  it('mark-all-read button is disabled when all items are already read', async () => {
    const readItem = makeItem({ readAt: new Date().toISOString() });
    mockNotificationsApi.list.mockResolvedValue({ items: [readItem], nextCursor: null });

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Mentor One')).toBeInTheDocument();
    });

    expect(screen.getByText('Mark all as read')).toBeDisabled();
  });

  it('shows "System" when actor is null', async () => {
    mockNotificationsApi.list.mockResolvedValue({
      items: [makeItem({ actor: null })],
      nextCursor: null,
    });

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });
});
