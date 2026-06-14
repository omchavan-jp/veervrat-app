import { ChatThreadClient } from './chat-thread-client';

export const metadata = {
  title: 'Chat',
};

export default async function ChatPage({ params }: { params: Promise<{ vmId: string }> }) {
  const { vmId } = await params;
  return <ChatThreadClient vmId={vmId} />;
}
