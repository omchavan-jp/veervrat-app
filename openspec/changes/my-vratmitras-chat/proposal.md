## Why

Vratarthis need direct, persistent communication with their assigned mentors (Vratmitras). Currently there is no way for a VA to contact their VM in-app or maintain conversation history. This feature establishes the communication backbone for the VA-VM relationship and enables real-time guidance, feedback, and synchronous mentorship. This is foundational for Tier 4 (Community & Content) features.

## What Changes

- **Backend:** New chat module with WebSocket Gateway for real-time messaging, persistent message storage in PostgreSQL with monotonic sequencing, image upload to MinIO (chat-specific), extended VM relationships endpoint to list assigned VMs.
- **Frontend:** New "My Vratmitras" two-panel page showing list of assigned VMs and selected VM detail with chat CTA. New dedicated chat thread view with message history, image preview, and entity reference chips (@/@# syntax).
- **Infrastructure:** WebSocket authentication via session cookie, chat rooms per VA-VM pair, catch-up mechanism for missed messages post-reconnect.

## Capabilities

### New Capabilities
- `vm-list-endpoint`: GET /api/v1/vm-relationships/my-vms returns list of VA's assigned VMs with scope (global or journey-specific) and journey assignments
- `websocket-chat-gateway`: NestJS WebSocket Gateway for real-time chat, authenticated via session cookie, room-based message delivery, monotonic message sequencing per room, automatic room join on connect
- `chat-message-persistence`: PostgreSQL storage of chat messages with sender, content (Tiptap JSON), room, and seqNo; catch-up query GET /api/v1/chats/:roomId/messages?after=seqNo for reconnect
- `chat-image-upload`: POST /api/v1/uploads/chat endpoint for image uploads (10MB max, images only), stored in MinIO, returns public URL for embedding in Tiptap content
- `my-vratmitras-page`: Two-panel frontend page at /my-vratmitras (VA side) showing list of assigned VMs with online status, scope label, detail panel with VM info and action CTAs (Open Chat, View Profile, settings)
- `chat-thread-view`: Full-page chat interface with message list, image preview, link previews via Open Graph, entity reference support (@user /#weakness syntax), Socket.IO connection with exponential backoff reconnect

### Modified Capabilities
- `vm-relationships`: Extended GET /api/v1/vm-relationships/my-vms to include journey assignments (currently only supports basic VM list)

## Impact

- **Backend modules:** New `chats/` module (service, repository, controller, gateway), extended `vm-relationships/` module, new `uploads/` module for chat images
- **Frontend routes:** New `(vratmitra)/my-vratmitras/` and `(vratmitra)/my-vratmitras/[vmId]/chat/` under existing `(vratmitra)` route group
- **Database:** New `Chat` and `ChatMessage` tables with sequencing, new `Upload` table for tracking images
- **Dependencies:** Socket.IO client on frontend (already approved in `@aws-sdk/client-s3` for MinIO, `sanitize-html` for Tiptap content)
- **APIs:** WebSocket endpoint at default Socket.IO path, new REST upload endpoint, extended VM list endpoint
- **Permissions:** New `chat.view` and `chat.send` permissions per spec/decisions/05_permissions.md (scoped to assigned journey VM or own chat room)
