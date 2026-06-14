## Context

VAs and VMs need persistent, real-time chat to support mentorship. Currently, no in-app messaging exists. This design establishes a WebSocket-based chat infrastructure following the contract in documentation/10_Platform-Engineering-Standard.md, integrated with existing NestJS backend and Next.js frontend.

## Goals / Non-Goals

**Goals:**
- Enable real-time bidirectional messaging between VA and assigned VM via WebSocket
- Persist all messages with ordering guarantees for history replay
- Support rich content: text + images, entity references (@user, #weakness)
- Handle network interruptions gracefully: auto-reconnect with message catch-up
- Enforce access control: chat visible only to the VA-VM pair (spec/decisions/05_permissions.md)
- Store messages in database for searchability and moderation (future)

**Non-Goals:**
- Typing indicators, read receipts, or presence heartbeat (v1 scope per spec/decisions/27_screen-specs.md)
- Admin viewing of chat (chat is permanently private, spec/decisions/05_permissions.md)
- Group chats or channel-based messaging (future feature)
- End-to-end encryption (not in v1 threat model)

## Decisions

### 1. WebSocket Gateway on NestJS
**Decision:** Use NestJS Gateway + Socket.IO following documentation/10_Platform-Engineering-Standard.md WebSocket section.
**Rationale:** Native NestJS integration, cookie-based auth reuse (no separate token), Socket.IO handles reconnect natively, aligns with existing auth layer.
**Alternatives considered:**
- Raw WebSocket: more control but loses auth & reconnect helpers
- GraphQL Subscriptions: overcomplicated for 1-1 messaging
- Server-Sent Events (SSE): one-way only, doesn't fit bidirectional need

### 2. Room-per-pair model
**Decision:** Room key = `chat:${[userId1, userId2].sort().join(':')}` (deterministic, order-independent).
**Rationale:** Ensures symmetry (both users derive same room), simple scoping, avoids collision.
**Alternatives considered:**
- UUID per relationship: requires lookup on connect, adds latency
- Separate rooms per direction: unnecessary complexity

### 3. Monotonic seqNo per room for ordering
**Decision:** Server assigns strictly increasing `seqNo` for each message in a room. Client reorders if gaps detected.
**Rationale:** Handles out-of-order socket delivery, enables reliable catch-up queries, allows offline-first UX future versions.
**Alternatives considered:**
- Timestamp ordering: subject to clock skew, not atomic
- Purely client-ordered: unreliable for multi-device scenarios

### 4. REST catch-up on reconnect, not socket replay
**Decision:** On reconnect, client sends `lastSeqNo` → server responds with missed messages via `GET /api/v1/chats/:roomId/messages?after=seqNo`.
**Rationale:** Reduces socket message volume, allows pagination if gap is large, decouples reconnect path from real-time path.
**Alternatives considered:**
- Socket replay: could backlog real-time messages during catch-up
- Redis pub/sub with retention: requires Redis bump, complexity not justified for 1-1 chat

### 5. Tiptap JSON for message content
**Decision:** Rich text stored as Tiptap JSON AST in `content` jsonb column, same as experience logs & blogs.
**Rationale:** Consistent with codebase (spec/decisions/22, 14, 16), supports images + entity refs natively, sanitized server-side per documentation/10_Platform-Engineering-Standard.md.
**Alternatives considered:**
- Plain text: loses formatting & entity ref capability
- Markdown: requires conversion, less type-safe

### 6. Image upload to MinIO (separate from message content)
**Decision:** `POST /api/v1/uploads/chat` endpoint stores images in MinIO, returns public URL embedded in Tiptap `image` node.
**Rationale:** Decouples media lifecycle from message (enables future deletion, quota, moderation), reuses existing @aws-sdk/client-s3 dependency, proven pattern in codebase.
**Alternatives considered:**
- Base64 in message: inflates message size, breaks efficient caching
- URL-only (external): loses control, privacy risk

### 7. Session cookie auth on WebSocket handshake
**Decision:** NestJS Gateway middleware validates session cookie (no separate token).
**Rationale:** Reuses existing auth, no token management overhead, meets documentation/10_Platform-Engineering-Standard.md contract.
**Alternatives considered:**
- JWT token in query param: repeats token logic, security surface
- Custom header token: loses cookie binding, stateless JWT complexity

## Risks / Trade-offs

- **[Gap recovery lag]** If a VA misses >500 messages (unlikely but possible in multi-day gap), catch-up query could timeout. Mitigation: paginate with `limit` param, show "older messages not available" UI, recommend VM outreach.
- **[Socket connection bloat]** Every connected VA-VM pair holds a socket. 10k users → ~10k concurrent sockets max (not all VMs always present). Mitigation: standard Node.js clustering, monitored via Observability-Standard.md.
- **[No message search yet]** Chat stored but not indexed in Meilisearch v1. Users cannot search own chat history. Mitigation: future feature, already structure-compatible (jsonb), add search endpoint in v1.1.
- **[Sequence wraparound]** seqNo is `bigint`, won't overflow in practice (one message per ms = 292M years). Mitigation: none needed, by design.
- **[Admin audit gap]** Admin cannot view chat for moderation (per spec). If abuse escalates, evidence unavailable. Mitigation: defer to v1.1, logged in Audit for suspension flows.

## Migration Plan

1. **Phase 1:** Deploy new `chats/` module, WebSocket Gateway, `uploads/` module. No UI yet.
2. **Phase 2:** Create database migrations for `Chat`, `ChatMessage`, `Upload` tables.
3. **Phase 3:** Deploy frontend routes (My Vratmitras, chat thread pages).
4. **Rollback:** If WebSocket Gateway fails, revert module import in AppModule; existing endpoints (VM list) unaffected.

## Open Questions

- Should chat messages be soft-deleted or hard-deleted on user anonymisation? (Defer to Item 31 account settings task, but plan for soft delete)
- Will future versions support message reactions, threads, or just flat messages? (Flat for v1, schema doesn't assume threading)
- Is there a moderation queue for flagged chat messages? (Out of v1 scope, raise for Item 28 moderation design)
