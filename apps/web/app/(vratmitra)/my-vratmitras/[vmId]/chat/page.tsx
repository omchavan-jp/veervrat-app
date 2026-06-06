import { ChatThreadClient } from './chat-thread-client';

export const metadata = {
  title: 'Chat',
};

export default function ChatPage({ params }: { params: { vmId: string } }) {
  return <ChatThreadClient vmId={params.vmId} />;
}
