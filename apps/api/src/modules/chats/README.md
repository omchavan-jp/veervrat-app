# chats

## Overview

Authenticated chat history and Socket.IO delivery use relationship-scoped room authorization. [chats.controller.ts:ChatsController] [chats.gateway.ts:ChatsGateway] [chats.service.ts:ChatsService]

## Interface

- Session GET chats/:roomId/messages accepts after (default -1) and limit (default 50, maximum 200); rejects NaN and serializes body as content with ISO createdAt. [chats.controller.ts:getMessages]
- ChatsGateway subscribes to message and emits message, ack and error; public ChatsService exposes sendMessage, getMessages, getLastMessageSeqNo and deriveRoomId, and ChatsModule exports ChatsService. [chats.gateway.ts:handleMessage] [chats.service.ts:ChatsService] [chats.module.ts:ChatsModule]
- [dto](./dto/README.md): Message DTO declares object content and room/journey/client correlation fields.

## Invariants

- Every service room read/send checks chat.view/chat.send through hasPermission after parsing chat:<a>:<b>, confirming caller participation and querying an active relationship between participants; room ids sort both user ids. [chats.service.ts:authorizeRoom] [chats.service.ts:otherParticipant] [chats.service.ts:deriveRoomId]
- Gateway authenticates the configured session cookie (default veervrat_session), disconnects failures, joins rooms derived from getMyVms and notifications:<userId>; message requires socket.user and type=message. CORS uses FRONTEND_URL or localhost:3000 with credentials. [chats.gateway.ts:authenticateSocket] [chats.gateway.ts:handleConnection] [chats.gateway.ts:deriveRoomIds] [chats.gateway.ts:handleMessage] [chats.gateway.ts:ChatsGateway]
- Send sanitizes Tiptap content before persistence; reads cap limit at 200; new seqNo is current room maximum plus one, or one for an empty room. [chats.service.ts:sendMessage] [chats.service.ts:getMessages] [chats.repository.ts:getNextSeqNo]

## Side Effects

- Reads relationships and session validation, mutates socket.user and room memberships, disconnects failed connections and logs initialization/connections/disconnections/send failures. [chats.gateway.ts:ChatsGateway] [chats.service.ts:authorizeRoom]
- Prisma reads chat history/sequences and writes messages including sender/journey/body/sequence; gateway broadcasts to other sockets in the room and acknowledges the sender with tempId/id/seqNo or emits error. [chats.repository.ts:ChatsRepository] [chats.gateway.ts:handleMessage]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
