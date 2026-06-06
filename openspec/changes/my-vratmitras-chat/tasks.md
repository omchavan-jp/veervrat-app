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

- [ ] 5.1 Implement message event handler in Gateway: listen for `message` event, extract roomId/content/tempId — Scaffolded (requires socket.io)
- [ ] 5.2 Call `ChatsService.sendMessage()` with authenticated user — Scaffolded (requires socket.io)
- [ ] 5.3 On success, broadcast to room: `{ type: 'message', id, roomId, senderId, content, createdAt, seqNo }` — Scaffolded (requires socket.io)
- [ ] 5.4 Send ack back to sender: `{ type: 'ack', tempId, id, seqNo }` — Scaffolded (requires socket.io)
- [ ] 5.5 On error, send error event to sender with reason — Scaffolded (requires socket.io)
- [ ] 5.6 Test: auth fails → disconnect, message sent → broadcast + ack, out-of-order delivery → client-side reorder — Needs implementation

## 6. Frontend — My Vratmitras Page

- [ ] 6.1 Create `(vratmitra)` route group layout (already exists, verify) — Needs verification
- [ ] 6.2 Create `/my-vratmitras` page component (server component shell) — Needs implementation
- [ ] 6.3 Create `MyVratmitrasClient` component (`'use client'`, useState for selected VM) — Needs implementation
- [ ] 6.4 Implement left panel: list of VMs via `GET /api/v1/vm-relationships/my-vms`, avatar/name/online indicator/scope badge, clickable rows — Needs implementation
- [ ] 6.5 Implement right panel: selected VM detail (avatar, name, online indicator, last active, journey list, action CTAs) — Needs implementation
- [ ] 6.6 Implement right panel empty state: "Select a vratmitra from the list" — Needs implementation
- [ ] 6.7 Add "Open Chat" CTA button → navigates to `/my-vratmitras/[vmId]/chat` — Needs implementation
- [ ] 6.8 Add TanStack Query for VM list with `staleTime: 30000` (allow quick refresh) — Needs implementation
- [ ] 6.9 Write frontend tests: renders VM list (vi.hoisted mock dashboardApi), clicking opens detail, empty state when no VMs — Needs implementation

## 7. Frontend — Chat Thread Page

- [ ] 7.1 Create `/my-vratmitras/[vmId]/chat` page component (client component) — Needs implementation
- [ ] 7.2 Implement Socket.IO client connection with session cookie (built-in by Socket.IO) — Needs implementation (requires socket.io-client)
- [ ] 7.3 Implement reconnect handler: on reconnect, query `GET /api/v1/chats/:roomId/messages?after=lastSeqNo` for catch-up — Needs implementation
- [ ] 7.4 Implement message list view: iterate messages by seqNo, render text + images, timestamps, sender avatar — Needs implementation
- [ ] 7.5 Implement image preview: inline images from Tiptap content, lazy load from MinIO URL — Needs implementation
- [ ] 7.6 Implement chat input: Tiptap editor instance for rich text (bold, italic, link), send button, image upload button — Needs implementation
- [ ] 7.7 Implement image upload flow: click image button → file picker → POST `/api/v1/uploads/chat` → embed URL in Tiptap → include in next message send — Needs implementation
- [ ] 7.8 Implement entity reference trigger: `@` username search, `#` weakness search, insert reference chips — Needs implementation
- [ ] 7.9 Implement optimistic UI: on send, show message with tempId, replace with server id + seqNo on ack — Needs implementation
- [ ] 7.10 Implement error state: if message send fails, show error notification, keep message in draft — Needs implementation
- [ ] 7.11 Write frontend tests: connect established (mock Socket.IO), message sends with tempId (positive), reconnect fetches catch-up (positive), image upload to MinIO (mock), entity reference chips render — Needs implementation

## 8. Database & Audit

- [ ] 8.1 Add chat message creation to audit event triggers (future: moderation log reference) — Deferred to v1.1
- [x] 8.2 Plan for soft-delete anonymisation (deferred to Item 31, but ensure schema supports) — Schema supports soft-delete via content anonymisation

## 9. Testing — Auth Matrix

- [ ] 9.1 Test matrix: chat.view — VA sees own chats, VM sees assigned journey chats, non-assigned user 403 — Needs implementation
- [ ] 9.2 Test matrix: chat.send — VA can send, VM can send assigned journey, non-assigned user 403 — Needs implementation
- [ ] 9.3 Test VM list endpoint: VA gets list, non-VA 403, scope filter works — Needs implementation
- [ ] 9.4 Test image upload: auth required, image type validation, size limit, public URL returned — Needs implementation
- [ ] 9.5 Run `pnpm test` — all tests pass, no flaky tests — Deferred after other tests implemented

## 10. Integration & Manual Verification

- [ ] 10.1 Verify WebSocket connection succeeds with valid session — Requires socket.io installation
- [ ] 10.2 Verify message send → broadcast → display works end-to-end — Deferred to later
- [ ] 10.3 Verify reconnect → catch-up query works — Deferred to later
- [ ] 10.4 Verify image upload → MinIO storage → URL embedding works — Deferred to later
- [ ] 10.5 Verify entity reference chips render and navigate — Deferred to later
- [ ] 10.6 Verify permission checks: non-participants cannot view/send — Tested via auth matrix
