'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api/client';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, UserRound } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChatComposer } from '@/components/chat/chat-composer';
import { MessageContent, type TiptapDoc } from '@/components/chat/message-content';
import { getRuntimeConfig } from '@/lib/runtime-config';

interface MessageSender {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface Message {
  id: string;
  roomId: string;
  senderId: string;
  sender: MessageSender;
  content: TiptapDoc;
  createdAt: string;
  seqNo: number;
  tempId?: string;
}

interface VmSummary {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  scope: 'GLOBAL' | 'JOURNEY';
  assignedJourneys: string[];
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// The browser API origin without the REST path suffix — socket.io connects to the
// server root, not the `/api/v1` namespace (which it would otherwise treat as a
// Socket.IO namespace and fail to find).
function socketOrigin(): string {
  const base = getRuntimeConfig().apiBaseUrl;
  return base.replace(/\/api\/v\d+\/?$/, '');
}

export function ChatThreadClient({ vmId }: { vmId: string }) {
  const t = useTranslations();
  const { toast } = useToast();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSeqNo, setLastSeqNo] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const roomId = user && vmId ? `chat:${[user.id, vmId].sort().join(':')}` : '';

  // Resolve the VM's identity (name, handle, profile link) from the cached VM list.
  const {
    data: vms,
    isLoading: vmsLoading,
    isError: vmsError,
  } = useQuery({
    queryKey: ['my-vms'],
    queryFn: async () => {
      const response = await api.get<{ data: VmSummary[] }>('/vm-relationships/my-vms');
      return response?.data ?? [];
    },
    staleTime: 30000,
  });
  const vm = useMemo(() => (vms ?? []).find((v) => v.id === vmId), [vms, vmId]);

  const {
    data: initialMessages,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['chat-messages', roomId],
    queryFn: async () => {
      if (!roomId) return [];
      const response = await api.get<{ data: Message[] }>(
        `/chats/${encodeURIComponent(roomId)}/messages?after=-1&limit=50`,
      );
      return response?.data ?? [];
    },
    enabled: !!roomId,
  });

  useEffect(() => {
    if (!user || !vmId || !roomId) return;

    const newSocket = io(socketOrigin(), {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
    });

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('message', (data: Message) => {
      setMessages((prev) => {
        // Ignore an id we already hold (reconnect echo, or our own message that the
        // ack already finalized) so a message can never render twice.
        if (prev.some((m) => m.id === data.id)) return prev;
        const sorted = [...prev, data].sort((a, b) => a.seqNo - b.seqNo);
        setLastSeqNo(data.seqNo);
        return sorted;
      });
    });

    newSocket.on('ack', (data: { tempId: string; id: string; seqNo: number }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === data.tempId
            ? { ...msg, id: data.id, seqNo: data.seqNo, tempId: undefined }
            : msg,
        ),
      );
    });

    newSocket.on('error', (data: { tempId: string; message: string }) => {
      toast({ title: t('chat.error'), description: data.message, variant: 'destructive' });
    });

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [user, vmId, roomId, toast, t]);

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages((prev) => {
        const merged = [...prev, ...initialMessages].filter(
          (msg, idx, arr) => idx === arr.findIndex((m) => m.id === msg.id && !msg.tempId),
        );
        const sorted = merged.sort((a, b) => a.seqNo - b.seqNo);
        if (sorted.length > 0) setLastSeqNo(sorted[sorted.length - 1].seqNo);
        return sorted;
      });
    }
  }, [initialMessages]);

  useEffect(() => {
    // Respect prefers-reduced-motion: jump instantly instead of smooth-scrolling.
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    messagesEndRef.current?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
  }, [messages]);

  const sendMessage = (content: TiptapDoc) => {
    if (!socket || !roomId || !user) {
      toast({ title: t('chat.error'), description: t('chat.connecting'), variant: 'destructive' });
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        roomId,
        senderId: user.id,
        sender: {
          id: user.id,
          displayName: user.displayName || user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
        },
        content,
        createdAt: new Date().toISOString(),
        seqNo: lastSeqNo + 1,
        tempId,
      },
    ]);

    socket.emit('message', { type: 'message', roomId, content, tempId });
  };

  if (!user) {
    return <p className="text-muted">{t('common.auth_required')}</p>;
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-13rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card md:h-[calc(100dvh-10rem)]">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link
          href="/my-vratmitras"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-fg/[0.05] hover:text-fg"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Avatar className="h-9 w-9 shrink-0">
          {vm?.avatarUrl && <AvatarImage src={vm.avatarUrl} />}
          <AvatarFallback className="text-xs">
            {vm ? (
              initialsOf(vm.displayName)
            ) : (
              <UserRound className="h-4 w-4 text-muted" aria-hidden="true" />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {vm ? (
            <Link
              href={`/u/${vm.username}`}
              className="block truncate font-medium leading-tight hover:text-accent"
            >
              {vm.displayName}
            </Link>
          ) : vmsLoading ? (
            <span className="block h-4 w-32 animate-pulse rounded bg-fg/[0.08] motion-reduce:animate-none" />
          ) : vmsError ? (
            <span className="block truncate font-medium leading-tight text-danger">
              {t('chat.identity_error')}
            </span>
          ) : (
            <span className="block truncate font-medium leading-tight">{t('chat.title')}</span>
          )}
          <span className="flex items-center gap-1.5 text-[12px] text-muted" aria-live="polite">
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-success' : 'bg-warning'}`}
            />
            {isConnected ? t('chat.connected') : t('chat.connecting')}
          </span>
        </div>
        {vm && (
          <span
            className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${
              vm.scope === 'GLOBAL' ? 'bg-accent/12 text-accent' : 'bg-accent-2/15 text-accent-2'
            }`}
          >
            {vm.scope === 'GLOBAL' ? t('my_vratmitras.global_vm') : t('my_vratmitras.journey_vm')}
          </span>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && historyLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" label={t('common.loading')} />
          </div>
        ) : messages.length === 0 && historyError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-danger">
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
              <AlertDescription className="flex flex-col items-center gap-2 text-destructive">
                {t('chat.history_error')}
                <Button size="sm" variant="outline" onClick={() => refetchHistory()}>
                  {t('common.status.retry')}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted">
            <p>{t('chat.no_messages')}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const mine = msg.senderId === user.id;
            return (
              <div key={msg.id} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                <Avatar className="h-7 w-7 shrink-0">
                  {msg.sender.avatarUrl && <AvatarImage src={msg.sender.avatarUrl} />}
                  <AvatarFallback className="text-[10px]">
                    {initialsOf(msg.sender.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`flex max-w-[78%] flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`break-words rounded-2xl px-3.5 py-2 text-sm ${
                      mine
                        ? 'rounded-br-sm bg-accent text-bg'
                        : 'rounded-bl-sm border border-border bg-bg text-fg'
                    } ${msg.tempId ? 'opacity-60' : ''}`}
                  >
                    <MessageContent content={msg.content} />
                  </div>
                  <span className="px-1 font-mono text-[10px] text-muted">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <ChatComposer roomId={roomId} disabled={!isConnected} onSend={sendMessage} />
    </div>
  );
}
