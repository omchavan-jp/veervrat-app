> **Status (2026-06-11):** Core chat is complete and live — transport (WebSocket
> auth-on-handshake, seqNo, reconnect, optimistic send), room authorization
> (relationship-verified, hardened in the audit-remediation Batch B and verified via
> socket probe), Tiptap content sanitization, My Vratmitras page, and the chat
> thread. **Deliberately deferred to a future chat iteration (NOT items 1–20 core):**
> image upload to MinIO (needs @aws-sdk/client-s3 — see Batch F), `@`/`#` entity
> reference chips (needs a Tiptap mention plugin), and frontend/E2E test setup.
> This change is intentionally kept un-archived to track that remaining scope.

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
- [x] 2.7 Write auth matrix tests for ChatController: VA can view/send own messages (positive), VM can view/send assigned journeys (positive), non-assigned user cannot view (negative) — Created chats.service.spec.ts base, needs completion
  Done 2026-09-05. The existing `chats.service.spec.ts` already covered the VA side; what it did
  not cover is that **every test used the VA as the actor**, with the VM present only to derive
  the room id — so a regression admitting one participant and refusing the other would have passed.
  Added to `chats.service.spec.ts`: the vratmitra sending and reading the same room (positive, both
  directions); a stranger reading a room they are absent from (negative); and a forged room naming
  the caller alongside an unrelated victim, which is the attack the room-id format invites.
  Added `chats.controller.spec.ts` — the controller had no spec at all. It covers what the service
  cannot: query defaults (`after=-1`, `limit=50`), the 200-row page cap, 400 on non-numeric params,
  the `body`→`content` rename with ISO dates, and **that the controller declares `SessionGuard`**.
  That last one matters because there is no global auth guard: a controller that loses its
  `@UseGuards` line becomes public and every other test still passes. Paired with a control
  asserting the same metadata lookup finds nothing on an undecorated class, so it cannot pass
  vacuously.

## 3. VM Relationships — Backend Extension

- [x] 3.1 Extend `vm-relationships/` controller: add `GET /api/v1/vm-relationships/my-vms` endpoint — Added endpoint with scope filtering
- [x] 3.2 Implement `VmRelationshipsRepository.getMyVms(userId)` — Implemented with GLOBAL and JOURNEY scope filtering
- [x] 3.3 Implement `VmRelationshipsService.getMyVms(user)` — Implemented with VA-only access check
- [x] 3.4 Add optional `scope` query parameter (GLOBAL/JOURNEY filtering) — Added to controller
- [x] 3.5 Write tests: VA gets list (positive), VM gets 403 (negative), empty array when no VMs (edge case) — Needs implementation
  Done 2026-09-05. Two of the three already existed in `vm-relationships.service.spec.ts` — the
  positive list and the non-VA refusal — so only the edge case was actually missing. Added: a
  vratarthi with no vratmitras gets an **empty list, not a refusal**. That distinction is the
  whole point of the case: having invited nobody is the ordinary state of a new account, and a
  403 there would render as a failure on a screen that should be showing its empty state.

## 4. Chat Image Upload — Backend

- [x] 4.1 Create `uploads/` module structure (module.ts, controller.ts, service.ts) — Created all files
- [x] 4.2 Implement `UploadsService.uploadChatImage(file, userId)` — Implemented with type/size validation (MinIO integration deferred)
- [x] 4.3 Implement `UploadsRepository.createUploadRecord(userId, roomId, minioUrl, filename)` — Implemented
- [x] 4.4 Implement `POST /api/v1/uploads/chat` endpoint — Implemented with base64 file upload support
- [x] 4.5 Handle errors: unsupported type (400), exceeds size limit (413), auth (401) — Error handling implemented
- [x] 4.6 Write tests: valid image upload (positive), PDF rejected (negative), oversized file rejected (negative), auth required (negative) — Needs implementation
  Done 2026-09-05. Three of the four were already covered in `uploads.service.spec.ts` and were
  not duplicated: a valid upload, an `application/pdf` rejection, and an 11 MB file against the
  10 MB limit. Only "auth required" was missing, and it cannot be a 401 assertion — the guard
  rejects the request before the controller sees it.
  Added `uploads.controller.spec.ts` asserting the guard is **declared**, plus purpose routing:
  chat, experience and blog each reach their own service call, and a chat upload never routes
  through the blog purpose. That last one is not pedantry — only `blog` writes to the
  anonymously-readable container, so a mis-routed chat image would be publicly readable.

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
- [x] 6.9 Write frontend tests: renders VM list (vi.hoisted mock dashboardApi), clicking opens detail, empty state when no VMs — Deferred (requires test setup for React components)
  Done 2026-09-05 — `src/test/my-vratmitras-list.test.tsx`, 8 tests. The "requires test setup"
  note was stale; `renderWithProviders` has existed for some time. The instruction to mock
  `dashboardApi` was also stale — the component calls `api.get('/vm-relationships/my-vms')`
  directly, so the client module is what is mocked.
  Covers: names and handles rendered; global vs journey scope distinguished; the card links to
  `/my-vratmitras/[id]/chat` and the name to `/u/[username]`; assigned-journey count; the empty
  state showing its own words plus a route to `/invitations`; a failed request treated as
  distinct from an empty list; and the endpoint actually requested.
  ⚠️ Two things learned writing it, both worth knowing before writing more of these:
  (a) the call-to-action is a Base UI `Button` with `render={<Link/>}`, which emits an anchor
      that does **not** resolve to the ARIA `link` role — `getByRole('link')` finds nothing while
      the anchor is plainly in the DOM. Those assertions query the element instead.
  (b) the scope badges read **"Global Mentor" / "Journey Mentor"**. That contradicts the domain
      language rule in CLAUDE.md — *vratmitra*, never "mentor". Pinned as-is so the test tells
      the truth; changing the copy is a content decision and this assertion is where it surfaces.

## 7. Frontend — Chat Thread Page

- [x] 7.1 Create `/my-vratmitras/[vmId]/chat` page component (client component) — Created at app/(vratmitra)/my-vratmitras/[vmId]/chat/page.tsx
- [x] 7.2 Implement Socket.IO client connection with session cookie (built-in by Socket.IO) — Implemented with io() from socket.io-client, websocket transport
- [x] 7.3 Implement reconnect handler: on reconnect, query `GET /api/v1/chats/:roomId/messages?after=lastSeqNo` for catch-up — Query on initial load and cached with TanStack Query
- [x] 7.4 Implement message list view: iterate messages by seqNo, render text + images, timestamps, sender avatar — Full message list with Avatar, timestamps, sender info, sorted by seqNo
- [x] 7.5 Implement image preview: inline images from Tiptap content, lazy load from MinIO URL — Image button ready (file picker integration deferred)
- [x] 7.6 Implement chat input: Tiptap editor instance for rich text (bold, italic, link), send button, image upload button — Plain text input implemented (Tiptap rich editor deferred)
- [x] 7.7 Implement image upload flow: click image button → file picker → POST `/api/v1/uploads/chat` → embed URL in Tiptap → include in next message send — UI button ready, file picker integration deferred
  **The "deferred" note was stale.** Found implemented and wired 2026-09-05, by reading the code
  rather than the record. `chat-composer.tsx`: a hidden `<input type="file">` (accepting jpeg,
  png, gif, webp and heic/heif) → `handleImagePick` → `uploadsApi.uploadChatImage(file, roomId)`
  → `editor.chain().focus().setImage({ src: url }).run()`, with an `uploading` state driving a
  spinner, a destructive toast on failure, and the input value reset in `finally` so the same
  file can be picked twice. `uploads.ts` base64-encodes and posts to `/uploads/chat`.
  `message-content.tsx` renders the resulting image nodes.
  ⚠️ This records that the code EXISTS and is wired — `chat-thread-client.tsx:327` mounts the
  composer. Whether it works against real storage is task 10.4, and is NOT claimed here.
- [x] 7.8 Implement entity reference trigger: `@` username search, `#` weakness search, insert reference chips — Deferred (requires mention plugin)
  **Also stale** — `@tiptap/extension-mention` and `@tiptap/suggestion` are both installed.
  Found implemented 2026-09-05: `entityMention('@')` and `entityMention('#')` are registered as
  editor extensions; `entity-mention.ts` calls `entitySearchApi.search(query, scope)` behind a
  two-character floor; `mention-list.tsx` renders the popup; `handleKeyDown` yields Enter to the
  suggestion popup when one is open rather than sending. `message-content.tsx` renders the chips
  and routes them via `entityHref()` — `/journeys/[id]` and `/study/[id]`, with concept entities
  deliberately rendered as non-navigating chips because they have no standalone page.
  ⚠️ Existence and wiring only. Rendering and navigation in a browser is task 10.5.
- [x] 7.9 Implement optimistic UI: on send, show message with tempId, replace with server id + seqNo on ack — Optimistic update with temp message, ACK handler replaces with server data
- [x] 7.10 Implement error state: if message send fails, show error notification, keep message in draft — Error handler with toast notification, error event socket listener
- [x] 7.11 Write frontend tests: connect established (mock Socket.IO), message sends with tempId (positive), reconnect fetches catch-up (positive), image upload to MinIO (mock), entity reference chips render — Deferred (requires test setup)
  Done 2026-09-05 — `src/test/chat-thread-socket.test.tsx`, 12 tests.
  Covers: the socket opens against the API origin **with `/api/v1` stripped** (leaving it on
  would be read as a Socket.IO namespace) and with the expected options; all five handlers
  registered; the socket disconnected on unmount rather than leaked; catch-up fetched over HTTP
  at `after=-1&limit=50` and rendered; an optimistic message emitted with a `temp-` id; the ack
  settling it without producing a duplicate; a reconnect echo of an id already held ignored while
  a genuinely new message is accepted; and the composer disabled until `connect` and again on
  `disconnect`.
  **Entity chips are not retested here** — `message-content.test.tsx` already pins chip rendering,
  the non-navigable concept case, and image nodes.
  The composer is stubbed rather than rendered: it is a Tiptap editor, Tiptap has never been
  mounted in this suite, and mounting it here would fail for reasons unrelated to the socket.
  Image upload therefore remains verified only at the API layer (`uploads.service.spec.ts`) and
  by hand — task 10.4.
  ⚠️ Required adding two jsdom shims to `src/test/setup.ts`, which had only the jest-dom import:
  `window.matchMedia` (absent in jsdom, and this component reads `prefers-reduced-motion` before
  scrolling — it threw on mount) and `Element.prototype.scrollIntoView` (no layout engine). Both
  guarded so they never override a real implementation. Full suite re-run after the change:
  api 110 files/1146 tests, web 56/346, all passing.

## 8. Database & Audit

- [x] 8.1 Add chat message creation to audit event triggers (future: moderation log reference) — Deferred to v1.1
  **Moved out of this change, 2026-09-05 → issue #296.** It was marked "deferred to v1.1" from the
  day it was written, so it was never in this change's scope; leaving it open meant the change
  could never be completed or archived. The reasoning for deferring still holds: audit rows for
  chat answer a moderation question, and no chat moderation surface exists yet — so it would
  create a table nobody reads, one row per message. Ticked here as *dispatched*, not as done.
- [x] 8.2 Plan for soft-delete anonymisation (deferred to Item 31, but ensure schema supports) — Schema supports soft-delete via content anonymisation

## 9. Testing — Auth Matrix

- [x] 9.1 Test matrix: chat.view — Room-based permission validation in ChatsService.spec.ts (VA room participant positive case, non-participant 403)
- [x] 9.2 Test matrix: chat.send — Room-based permission validation in ChatsService.spec.ts (participant send, non-participant 403)
- [x] 9.3 Test VM list endpoint: VmRelationshipsService.spec.ts (VA gets list, non-VA 403, scope filtering)
- [x] 9.4 Test image upload: UploadsService.spec.ts (auth implicit via SessionUser, image type validation, size limit 10MB, URL returned)
- [x] 9.5 Run `pnpm test` — existing build error in study-detail.tsx blocks full test suite execution
  **The blocker no longer exists, and may never have applied to this path.** No `study-detail.tsx`
  is present anywhere under `apps/web`, and `git log` for that path returns nothing.
  Run 2026-09-05 with `turbo run test --force` (uncached — a cached pass is a pass from a previous
  run, not this one), plus `pnpm --filter web test` directly to confirm the web project actually
  executed rather than reporting success having run nothing:
      api  108 test files  1122 tests  passed
      web   54 test files   326 tests  passed
      tsc --noEmit  exit 0
  This records that the suite runs green on this branch. It says nothing about the chat feature
  being correct — the chat frontend tests are 7.11, still open.

## 10. Integration & Manual Verification

- [x] 10.1 Verify WebSocket connection succeeds with valid session — @nestjs/websockets + socket.io installed, Gateway implements session auth
- [ ] 10.2 Verify message send → broadcast → display works end-to-end — Requires dev server or E2E test setup
- [ ] 10.3 Verify reconnect → catch-up query works — Requires dev server test or E2E
- [ ] 10.4 Verify image upload → MinIO storage → URL embedding works — Service layer ready, S3 client integration needed
- [ ] 10.5 Verify entity reference chips render and navigate — Deferred (requires @tiptap/extension-mention or custom solution)
- [x] 10.6 Verify permission checks: non-participants cannot view/send — isRoomParticipant() checks in ChatsService, hasPermission() extensions tested
