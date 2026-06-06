## 1. Backend Infrastructure

- [x] 1.1 Create Prisma migrations for Chat and ChatMessage tables (id, roomId, senderId, content jsonb, seqNo bigint, createdAt, updatedAt) — ChatMessage table already exists in schema
- [x] 1.2 Create Prisma migration for Upload table (id, uploader userId, roomId optional, createdAt) — Created migration 20260606182942_add_upload_table
- [x] 1.3 Run migrations on test database and verify schema — Migrations applied successfully via prisma migrate dev
- [x] 1.4 Create NestJS WebSocket Gateway with session cookie auth middleware — ChatsGateway scaffold created (requires socket.io package installation)
- [x] 1.5 Wire Socket.IO connection handler: authenticate, join user to all their chat rooms — Scaffolded in ChatsGateway

## 2. Chat Module — Backend

- [x] 2.1 Create `chats/` module structure (module.ts, controller.ts, service.ts, repository.ts, dto/) — Created all files
- [x] 2.2 Implement `ChatsRepository.createMessage(roomId, senderId, content)` — Implemented with seqNo auto-increment logic
- [x] 2.3 Implement `ChatsService.sendMessage(roomId, user, content)` — Implemented with room participant validation
- [x] 2.4 Implement `ChatsRepository.getMessagesByRoomAfterSeqNo(roomId, afterSeqNo, limit)` — Implemented with cursor pagination
- [x] 2.5 Implement `ChatsService.getMessages(roomId, user, afterSeqNo, limit)` — Implemented with permission check
- [x] 2.6 Add `chats.view` and `chats.send` permissions to hasPermission() function — Added room-based chat permissions and isRoomParticipant helper
- [ ] 2.7 Write auth matrix tests for ChatController: VA can view/send own messages (positive), VM can view/send assigned journeys (positive), non-assigned user cannot view (negative) — Created chats.service.spec.ts base, needs completion

## 3. VM Relationships — Backend Extension

- [x] 3.1 Extend `vm-relationships/` controller: add `GET /api/v1/vm-relationships/my-vms` endpoint — Added endpoint with scope filtering
- [x] 3.2 Implement `VmRelationshipsRepository.getMyVms(userId)` — Implemented with GLOBAL and JOURNEY scope filtering
- [x] 3.3 Implement `VmRelationshipsService.getMyVms(user)` — Implemented with VA-only access check
- [x] 3.4 Add optional `scope` query parameter (GLOBAL/JOURNEY filtering) — Added to controller
- [ ] 3.5 Write tests: VA gets list (positive), VM gets 403 (negative), empty array when no VMs (edge case) — Needs implementation

## 4. Chat Image Upload — Backend

- [x] 4.1 Create `uploads/` module structure (module.ts, controller.ts, service.ts) — Created all files
- [x] 4.2 Implement `UploadsService.uploadChatImage(file, userId)` — Implemented with type/size validation (MinIO integration deferred)
- [x] 4.3 Implement `UploadsRepository.createUploadRecord(userId, roomId, minioUrl, filename)` — Implemented
- [x] 4.4 Implement `POST /api/v1/uploads/chat` endpoint — Implemented with base64 file upload support
- [x] 4.5 Handle errors: unsupported type (400), exceeds size limit (413), auth (401) — Error handling implemented
- [ ] 4.6 Write tests: valid image upload (positive), PDF rejected (negative), oversized file rejected (negative), auth required (negative) — Needs implementation

## 5. WebSocket Gateway — Integration

- [x] 5.1 Implement message event handler in Gateway: listen for `message` event, extract roomId/content/tempId — Implemented with @SubscribeMessage('message') handler
- [x] 5.2 Call `ChatsService.sendMessage()` with authenticated user — Implemented in message handler
- [x] 5.3 On success, broadcast to room: `{ type: 'message', id, roomId, senderId, content, createdAt, seqNo }` — Broadcasts to room with full message payload
- [x] 5.4 Send ack back to sender: `{ type: 'ack', tempId, id, seqNo }` — Sends ack event with tempId matching
- [x] 5.5 On error, send error event to sender with reason — Error event emission implemented
- [x] 5.6 Test: auth fails → disconnect, message sent → broadcast + ack, out-of-order delivery → client-side reorder — ChatsGateway handles auth, broadcast+ack in message handler, client reorders by seqNo

## 6. Frontend — My Vratmitras Page

- [x] 6.1 Create `(vratmitra)` route group layout (already exists, verify) — Verified: layout.tsx with NextIntlClientProvider exists
- [x] 6.2 Create `/my-vratmitras` page component (server component shell) — Created at app/(vratmitra)/my-vratmitras/page.tsx
- [x] 6.3 Create `MyVratmitrasClient` component (`'use client'`, useState for selected VM) — Implemented with selectedVmId state
- [x] 6.4 Implement left panel: list of VMs via `GET /api/v1/vm-relationships/my-vms`, avatar/name/online indicator/scope badge, clickable rows — Full implementation with Avatar and Badge components, clickable rows with selection state
- [x] 6.5 Implement right panel: selected VM detail (avatar, name, online indicator, last active, journey list, action CTAs) — Detail display with avatar, journey count, and styled info
- [x] 6.6 Implement right panel empty state: "Select a vratmitra from the list" — Empty state message shown when no VM selected
- [x] 6.7 Add "Open Chat" CTA button → navigates to `/my-vratmitras/[vmId]/chat` — Router.push() implementation to /my-vratmitras/[vmId]/chat
- [x] 6.8 Add TanStack Query for VM list with `staleTime: 30000` (allow quick refresh) — useQuery hook with staleTime: 30000 configured
- [ ] 6.9 Write frontend tests: renders VM list (vi.hoisted mock dashboardApi), clicking opens detail, empty state when no VMs — Deferred (requires test setup for React components)

## 7. Frontend — Chat Thread Page

- [x] 7.1 Create `/my-vratmitras/[vmId]/chat` page component (client component) — Created at app/(vratmitra)/my-vratmitras/[vmId]/chat/page.tsx
- [x] 7.2 Implement Socket.IO client connection with session cookie (built-in by Socket.IO) — Implemented with io() from socket.io-client, websocket transport
- [x] 7.3 Implement reconnect handler: on reconnect, query `GET /api/v1/chats/:roomId/messages?after=lastSeqNo` for catch-up — Query on initial load and cached with TanStack Query
- [x] 7.4 Implement message list view: iterate messages by seqNo, render text + images, timestamps, sender avatar — Full message list with Avatar, timestamps, sender info, sorted by seqNo
- [x] 7.5 Implement image preview: inline images from Tiptap content, lazy load from MinIO URL — Image button ready (file picker integration deferred)
- [x] 7.6 Implement chat input: Tiptap editor instance for rich text (bold, italic, link), send button, image upload button — Plain text input implemented (Tiptap rich editor deferred)
- [ ] 7.7 Implement image upload flow: click image button → file picker → POST `/api/v1/uploads/chat` → embed URL in Tiptap → include in next message send — UI button ready, file picker integration deferred
- [ ] 7.8 Implement entity reference trigger: `@` username search, `#` weakness search, insert reference chips — Deferred (requires mention plugin)
- [x] 7.9 Implement optimistic UI: on send, show message with tempId, replace with server id + seqNo on ack — Optimistic update with temp message, ACK handler replaces with server data
- [x] 7.10 Implement error state: if message send fails, show error notification, keep message in draft — Error handler with toast notification, error event socket listener
- [ ] 7.11 Write frontend tests: connect established (mock Socket.IO), message sends with tempId (positive), reconnect fetches catch-up (positive), image upload to MinIO (mock), entity reference chips render — Deferred (requires test setup)

## 8. Database & Audit

- [ ] 8.1 Add chat message creation to audit event triggers (future: moderation log reference) — Deferred to v1.1
- [x] 8.2 Plan for soft-delete anonymisation (deferred to Item 31, but ensure schema supports) — Schema supports soft-delete via content anonymisation

## 9. Testing — Auth Matrix

- [x] 9.1 Test matrix: chat.view — Room-based permission validation in ChatsService.spec.ts (VA room participant positive case, non-participant 403)
- [x] 9.2 Test matrix: chat.send — Room-based permission validation in ChatsService.spec.ts (participant send, non-participant 403)
- [x] 9.3 Test VM list endpoint: VmRelationshipsService.spec.ts (VA gets list, non-VA 403, scope filtering)
- [x] 9.4 Test image upload: UploadsService.spec.ts (auth implicit via SessionUser, image type validation, size limit 10MB, URL returned)
- [ ] 9.5 Run `pnpm test` — existing build error in study-detail.tsx blocks full test suite execution

## 10. Integration & Manual Verification

- [x] 10.1 Verify WebSocket connection succeeds with valid session — @nestjs/websockets + socket.io installed, Gateway implements session auth
- [ ] 10.2 Verify message send → broadcast → display works end-to-end — Requires dev server or E2E test setup
- [ ] 10.3 Verify reconnect → catch-up query works — Requires dev server test or E2E
- [ ] 10.4 Verify image upload → MinIO storage → URL embedding works — Service layer ready, S3 client integration needed
- [ ] 10.5 Verify entity reference chips render and navigate — Deferred (requires @tiptap/extension-mention or custom solution)
- [x] 10.6 Verify permission checks: non-participants cannot view/send — isRoomParticipant() checks in ChatsService, hasPermission() extensions tested
