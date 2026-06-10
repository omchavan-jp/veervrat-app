'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api/client';
import { io, Socket } from 'socket.io-client';
import { AlertCircle, Send, ImageIcon, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  roomId: string;
  senderId: string;
  sender: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
  content: any;
  createdAt: string;
  seqNo: number;
  tempId?: string;
}

interface ChatThreadClientProps {
  vmId: string;
}

export function ChatThreadClient({ vmId }: ChatThreadClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSeqNo, setLastSeqNo] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const roomId = user && vmId ? `chat:${[user.id, vmId].sort().join(':')}` : '';

  // Fetch initial messages
  const { data: initialMessages } = useQuery({
    queryKey: ['chat-messages', roomId],
    queryFn: async () => {
      if (!roomId) return [];
      const response = await api.get<{ data: Message[] }>(
        `/chats/${encodeURIComponent(roomId)}/messages?after=-1&limit=50`,
      );
      return response?.data || [];
    },
    enabled: !!roomId,
  });

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!user || !vmId || !roomId) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const newSocket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      toast({ title: t('chat.connected') });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('message', (data: Message) => {
      setMessages((prev) => {
        const sorted = [...prev, data].sort((a, b) => a.seqNo - b.seqNo);
        setLastSeqNo(data.seqNo);
        return sorted;
      });
    });

    newSocket.on('ack', (data: { tempId: string; id: string; seqNo: number }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === data.tempId
            ? { ...msg, id: data.id, tempId: undefined }
            : msg,
        ),
      );
    });

    newSocket.on('error', (data: { tempId: string; message: string }) => {
      toast({
        title: t('chat.error'),
        description: data.message,
        variant: 'destructive',
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, vmId, roomId, toast, t]);

  // Set initial messages and handle reconnect
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages((prev) => {
        const allMessages = [...prev, ...initialMessages].filter(
          (msg, idx, arr) =>
            idx === arr.findIndex((m) => m.id === msg.id && !msg.tempId),
        );
        const sorted = allMessages.sort((a, b) => a.seqNo - b.seqNo);
        if (sorted.length > 0) {
          setLastSeqNo(sorted[sorted.length - 1].seqNo);
        }
        return sorted;
      });
    }
  }, [initialMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!socket || !roomId) throw new Error('Socket not connected');

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const message = {
        type: 'message',
        roomId,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: content }],
            },
          ],
        },
        tempId,
      };

      // Optimistic update
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          roomId,
          senderId: user!.id,
          sender: {
            id: user!.id,
            displayName: user!.displayName || user!.email,
            username: user!.username,
            avatarUrl: user!.avatarUrl,
          },
          content: message.content,
          createdAt: new Date().toISOString(),
          seqNo: lastSeqNo + 1,
          tempId,
        },
      ]);

      socket.emit('message', message);
      setInputValue('');
    },
    onError: (error) => {
      toast({
        title: t('chat.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessageMutation.mutate(inputValue);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderMessageContent = (content: any) => {
    if (!content || !content.content) return '';
    return content.content
      .map((block: any) => {
        if (block.content) {
          return block.content
            .map((node: any) => node.text || '')
            .join('');
        }
        return '';
      })
      .join('\n');
  };

  if (!user) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t('common.auth_required')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      {/* Connection Status */}
      {!isConnected && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('chat.connecting')}</AlertDescription>
        </Alert>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted">
            <p>{t('chat.no_messages')}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.senderId === user.id ? 'flex-row-reverse' : ''
              }`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                {msg.sender.avatarUrl && (
                  <AvatarImage src={msg.sender.avatarUrl} />
                )}
                <AvatarFallback className="text-xs">
                  {getInitials(msg.sender.displayName)}
                </AvatarFallback>
              </Avatar>

              <div
                className={`flex-1 ${
                  msg.senderId === user.id ? 'items-end' : 'items-start'
                } flex flex-col`}
              >
                <div className="text-sm text-muted">
                  {msg.sender.displayName}
                </div>
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                    msg.senderId === user.id
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-fg'
                  }`}
                >
                  {renderMessageContent(msg.content)}
                </div>
                <div className="text-xs text-muted mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2 pt-4 border-t border-border">
        <Button variant="outline" size="icon" disabled={!isConnected}>
          <ImageIcon className="h-4 w-4" />
        </Button>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={t('chat.type_message')}
          disabled={!isConnected || sendMessageMutation.isPending}
          className="flex-1 px-3 py-2 rounded-md border border-border bg-bg text-fg placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
        />

        <Button
          onClick={handleSend}
          disabled={!inputValue.trim() || !isConnected || sendMessageMutation.isPending}
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
