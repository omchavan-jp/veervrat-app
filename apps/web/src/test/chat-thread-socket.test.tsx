import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers/render';

/**
 * The live half of chat: the socket connection, the optimistic send, the acknowledgement that
 * turns a temporary message into a real one, and the catch-up fetch on mount.
 *
 * None of that was covered. `message-content.test.tsx` already pins how a stored message renders
 * (entity chips, images, marks), so this file deliberately does not repeat it — what it adds is
 * the behaviour between pressing send and the message becoming real.
 *
 * The composer is stubbed rather than rendered. It is a Tiptap editor, and Tiptap has never been
 * mounted in this suite — mounting it here would make these tests fail for reasons that have
 * nothing to do with the socket. The stub exposes the one thing the parent cares about: the
 * `onSend` callback carrying a document.
 */

const mockSocket = vi.hoisted(() => ({
  handlers: new Map<string, (payload: unknown) => void>(),
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
}));

const mockIo = vi.hoisted(() => vi.fn());

vi.mock('socket.io-client', () => ({
  io: mockIo,
  Socket: class {},
}));

const mockGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ api: { get: mockGet } }));

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-auth', () => ({ useAuth: mockUseAuth }));

vi.mock('@/lib/runtime-config', () => ({
  getRuntimeConfig: () => ({ apiBaseUrl: 'https://api.example.test/api/v1' }),
}));

// The composer stub: one button that sends a fixed document.
vi.mock('@/components/chat/chat-composer', () => ({
  ChatComposer: ({ onSend, disabled }: { onSend: (d: unknown) => void; disabled?: boolean }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSend({ type: 'doc', content: [] })}
      data-testid="stub-send"
    >
      send
    </button>
  ),
}));

import { ChatThreadClient } from '@/app/(app)/my-vratmitras/[vmId]/chat/chat-thread-client';

const ME = 'user-me';
const THEM = 'vm-them';
const ROOM = `chat:${[ME, THEM].sort().join(':')}`;

// Replays a server event into the component, wrapped in act() because each handler sets state.
function serverEmits(event: string, payload: unknown) {
  const handler = mockSocket.handlers.get(event);
  if (!handler) throw new Error(`component never registered a handler for "${event}"`);
  act(() => handler(payload));
}

const storedMessage = (over: Record<string, unknown> = {}) => ({
  id: 'srv-1',
  roomId: ROOM,
  senderId: THEM,
  sender: { id: THEM, displayName: 'Them', username: 'them', avatarUrl: null },
  content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }] },
  createdAt: '2026-09-05T10:00:00.000Z',
  seqNo: 1,
  ...over,
});

describe('ChatThreadClient — the live connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.handlers.clear();
    // Record every handler the component registers so tests can drive them.
    mockSocket.on.mockImplementation((event: string, fn: (p: unknown) => void) => {
      mockSocket.handlers.set(event, fn);
      return mockSocket;
    });
    mockIo.mockReturnValue(mockSocket);
    mockUseAuth.mockReturnValue({
      user: {
        id: ME,
        email: 'me@test.com',
        username: 'me',
        displayName: 'Me',
        avatarUrl: null,
      },
    });
    mockGet.mockResolvedValue({ data: [] });
  });

  // ── Connection ──────────────────────────────────────────────────────────────
  describe('connection', () => {
    it('CONNECT: opens a socket against the API origin with the /api/v1 suffix stripped', async () => {
      renderWithProviders(<ChatThreadClient vmId={THEM} />);

      await waitFor(() => expect(mockIo).toHaveBeenCalled());

      const [origin, opts] = mockIo.mock.calls[0];
      // Socket.IO connects to the server root; leaving /api/v1 on would be read as a namespace.
      expect(origin).toBe('https://api.example.test');
      expect(opts).toMatchObject({
        path: '/socket.io',
        withCredentials: true,
        reconnection: true,
      });
    });

    it('CONNECT: registers handlers for connect, disconnect, message, ack and error', async () => {
      renderWithProviders(<ChatThreadClient vmId={THEM} />);

      await waitFor(() => expect(mockSocket.on).toHaveBeenCalled());

      for (const event of ['connect', 'disconnect', 'message', 'ack', 'error']) {
        expect(mockSocket.handlers.has(event), `no handler for "${event}"`).toBe(true);
      }
    });

    it('disconnects the socket when the thread unmounts, rather than leaking it', async () => {
      const { unmount } = renderWithProviders(<ChatThreadClient vmId={THEM} />);
      await waitFor(() => expect(mockIo).toHaveBeenCalled());

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  // ── Catch-up ────────────────────────────────────────────────────────────────
  describe('catch-up on mount', () => {
    it('CATCH-UP: fetches the room history over HTTP, not the socket', async () => {
      renderWithProviders(<ChatThreadClient vmId={THEM} />);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          `/chats/${encodeURIComponent(ROOM)}/messages?after=-1&limit=50`,
        );
      });
    });

    it('CATCH-UP: renders the messages the fetch returned', async () => {
      mockGet.mockResolvedValue({ data: [storedMessage({ id: 'srv-1', seqNo: 1 })] });

      renderWithProviders(<ChatThreadClient vmId={THEM} />);

      expect(await screen.findByText('hi')).toBeInTheDocument();
    });

    // The room id is derived from both ids sorted, so both participants compute the same string.
    //
    // Searched across every call rather than indexing the first: the component also fetches the
    // vratmitra list to resolve the other person's name, and the two requests race.
    it('derives the same room id whichever participant is looking', async () => {
      renderWithProviders(<ChatThreadClient vmId={THEM} />);

      await waitFor(() => {
        const urls = mockGet.mock.calls.map(([u]) => String(u));
        expect(urls.some((u) => u.includes(encodeURIComponent(ROOM)))).toBe(true);
      });
    });
  });

  // ── Sending ─────────────────────────────────────────────────────────────────
  describe('sending', () => {
    it('TEMP ID: shows the message immediately and emits it with a tempId', async () => {
      renderWithProviders(<ChatThreadClient vmId={THEM} />);
      await waitFor(() => expect(mockIo).toHaveBeenCalled());
      // The composer is disabled until the socket connects, so a click before this does nothing.
      serverEmits('connect', undefined);
      await waitFor(() => expect(screen.getByTestId('stub-send')).not.toBeDisabled());

      await userEvent.click(screen.getByTestId('stub-send'));

      expect(mockSocket.emit).toHaveBeenCalledTimes(1);
      const [event, payload] = mockSocket.emit.mock.calls[0];
      expect(event).toBe('message');
      expect(payload).toMatchObject({ type: 'message', roomId: ROOM });
      expect(String((payload as { tempId: string }).tempId)).toMatch(/^temp-/);
    });

    it('ACK: replaces the temporary message with the server id, without duplicating it', async () => {
      renderWithProviders(<ChatThreadClient vmId={THEM} />);
      await waitFor(() => expect(mockIo).toHaveBeenCalled());
      serverEmits('connect', undefined);
      await waitFor(() => expect(screen.getByTestId('stub-send')).not.toBeDisabled());

      await userEvent.click(screen.getByTestId('stub-send'));
      const { tempId } = mockSocket.emit.mock.calls[0][1] as { tempId: string };

      serverEmits('ack', { tempId, id: 'srv-99', seqNo: 7 });

      // The optimistic row is still the only one — settled, not joined by a second copy.
      // A duplicate would show as two identical bubbles.
      const bubbles = screen.queryAllByText('send');
      expect(bubbles).toHaveLength(1);
    });

    // The reconnect echo: the server may replay a message the client already holds. Rendering it
    // twice is the visible bug that de-duplication exists to prevent.
    it('RECONNECT: ignores an inbound message whose id is already held', async () => {
      mockGet.mockResolvedValue({ data: [storedMessage({ id: 'srv-1', seqNo: 1 })] });

      renderWithProviders(<ChatThreadClient vmId={THEM} />);
      expect(await screen.findByText('hi')).toBeInTheDocument();

      // Same id arriving again, as it would after a reconnect.
      serverEmits('message', storedMessage({ id: 'srv-1', seqNo: 1 }));

      await waitFor(() => {
        expect(screen.getAllByText('hi')).toHaveLength(1);
      });
    });

    it('RECONNECT: accepts a genuinely new message arriving over the socket', async () => {
      renderWithProviders(<ChatThreadClient vmId={THEM} />);
      await waitFor(() => expect(mockIo).toHaveBeenCalled());

      serverEmits(
        'message',
        storedMessage({
          id: 'srv-2',
          seqNo: 2,
          content: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'brand new' }] }],
          },
        }),
      );

      expect(await screen.findByText('brand new')).toBeInTheDocument();
    });
  });

  // ── Connection state ────────────────────────────────────────────────────────
  describe('connection state reaches the composer', () => {
    it('the composer is disabled until the socket connects, and enabled after', async () => {
      renderWithProviders(<ChatThreadClient vmId={THEM} />);
      await waitFor(() => expect(mockIo).toHaveBeenCalled());

      expect(screen.getByTestId('stub-send')).toBeDisabled();

      serverEmits('connect', undefined);

      await waitFor(() => {
        expect(screen.getByTestId('stub-send')).not.toBeDisabled();
      });
    });

    it('the composer is disabled again on disconnect', async () => {
      renderWithProviders(<ChatThreadClient vmId={THEM} />);
      await waitFor(() => expect(mockIo).toHaveBeenCalled());

      serverEmits('connect', undefined);
      await waitFor(() => expect(screen.getByTestId('stub-send')).not.toBeDisabled());

      serverEmits('disconnect', undefined);

      await waitFor(() => {
        expect(screen.getByTestId('stub-send')).toBeDisabled();
      });
    });
  });
});
