# chat

## Overview

VM chat thread client with REST history, Socket.IO events, optimistic sending, and identity header. [apps/web/app/(app)/my-vratmitras/[vmId]/chat/chat-thread-client.tsx:ChatThreadClient]

## Interface

- Exports ChatThreadClient({vmId:string}); ChatPage awaits Promise params and passes vmId; metadata exports title Chat. [apps/web/app/(app)/my-vratmitras/[vmId]/chat/chat-thread-client.tsx:ChatThreadClient] [apps/web/app/(app)/my-vratmitras/[vmId]/chat/page.tsx:ChatPage] [apps/web/app/(app)/my-vratmitras/[vmId]/chat/page.tsx:metadata]
- Local Message carries id, roomId, senderId, sender, TiptapDoc content, createdAt, seqNo, optional tempId; VmSummary carries identity, GLOBAL/JOURNEY scope, and assignedJourneys. [apps/web/app/(app)/my-vratmitras/[vmId]/chat/chat-thread-client.tsx:Message] [apps/web/app/(app)/my-vratmitras/[vmId]/chat/chat-thread-client.tsx:VmSummary]

## Invariants

- Room ID sorts user.id and vmId into chat:<id>:<id>; history query is enabled only with roomId; composer is disabled while disconnected. [apps/web/app/(app)/my-vratmitras/[vmId]/chat/chat-thread-client.tsx:ChatThreadClient]
- Incoming message handlers ignore held IDs then sort by seqNo; ack replaces matching tempId with server id/seqNo; history merge deduplicates IDs while excluding temporary messages from its retained-match predicate. [apps/web/app/(app)/my-vratmitras/[vmId]/chat/chat-thread-client.tsx:ChatThreadClient]
- socketOrigin removes a trailing /api/v<digits> optional slash from runtime apiBaseUrl. [apps/web/app/(app)/my-vratmitras/[vmId]/chat/chat-thread-client.tsx:socketOrigin]

## Side Effects

- GETs /vm-relationships/my-vms (my-vms cache, 30000ms staleTime) and /chats/{encoded roomId}/messages?after=-1&limit=50; connects Socket.IO at /socket.io using websocket credentials and reconnection, and disconnects on effect cleanup. [apps/web/app/(app)/my-vratmitras/[vmId]/chat/chat-thread-client.tsx:ChatThreadClient]
- sendMessage appends a temporary optimistic message and emits message with type, roomId, content, tempId; missing socket/room/user or socket error emits destructive toast; message updates scrollIntoView using reduced-motion preference. [apps/web/app/(app)/my-vratmitras/[vmId]/chat/chat-thread-client.tsx:ChatThreadClient]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
