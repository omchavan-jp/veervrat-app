## ADDED Requirements

### Requirement: WebSocket Gateway authenticates via session cookie on handshake
The system SHALL establish a NestJS WebSocket Gateway that validates the user's session cookie during the WebSocket handshake. Unauthenticated connections are rejected immediately. The gateway follows the contract in documentation/Platform-Engineering-Standard.md WebSocket section.

#### Scenario: Authenticated user connects
- **WHEN** authenticated user initiates WebSocket handshake with valid session cookie
- **THEN** gateway accepts connection and user is joined to their chat rooms

#### Scenario: Unauthenticated connection rejected
- **WHEN** WebSocket handshake occurs without session cookie or with expired cookie
- **THEN** gateway rejects connection with 401 or 403 status

#### Scenario: User joined to all their chat rooms on connect
- **WHEN** user connects, gateway identifies all VA-VM pairs involving this user
- **THEN** user is automatically subscribed to all corresponding room channels (no explicit join command)

### Requirement: Room-based message delivery per VA-VM pair
The system SHALL use a deterministic room naming scheme: `chat:${[userId1, userId2].sort().join(':')}` (lexicographically sorted user IDs). Messages sent to a room are delivered to all connected clients in that room.

#### Scenario: Message delivery in room
- **WHEN** VA sends message to VM in their chat room
- **THEN** message is broadcast to all connected clients in that room (both users if connected)

#### Scenario: Disconnected user does not receive real-time message
- **WHEN** user is offline and message is sent to their room
- **THEN** message is persisted to database but user does not receive it via socket (catch-up on reconnect)

### Requirement: Message sequencing with monotonic seqNo
The system SHALL assign a strictly increasing `seqNo` to each message in a room, starting from 1. Server assigns seqNo when message is persisted, before broadcasting.

#### Scenario: First message in room gets seqNo 1
- **WHEN** first message is sent to a new chat room
- **THEN** server assigns seqNo=1 and broadcasts with that sequence number

#### Scenario: Subsequent messages increment seqNo
- **WHEN** messages are sent sequentially
- **THEN** each receives seqNo > previous (no gaps)

#### Scenario: Out-of-order delivery reordered by client
- **WHEN** messages arrive out-of-order at client (socket delivery race)
- **THEN** client reorders by seqNo before displaying

### Requirement: Message contract for socket communication
Messages between client and server follow a specific JSON structure. Client → Server: `{ type: 'message', roomId: string, content: TiptapJSON, tempId: string }`. Server → Client broadcast: `{ type: 'message', id: string, roomId: string, senderId: string, content: TiptapJSON, createdAt: string, seqNo: number }`. Server → Client ack: `{ type: 'ack', tempId: string, id: string, seqNo: number }`.

#### Scenario: Client sends message with tempId
- **WHEN** client sends `{ type: 'message', roomId, content, tempId: 'abc123' }`
- **THEN** server persists message and broadcasts with assigned `id` and `seqNo`

#### Scenario: Server acknowledges with tempId match
- **WHEN** message is persisted
- **THEN** server sends ack `{ type: 'ack', tempId, id, seqNo }` to sender (optimistic UI confirmation)

#### Scenario: Broadcast message includes all fields
- **WHEN** message is persisted and seqNo assigned
- **THEN** broadcast includes id, roomId, senderId, content, createdAt (ISO timestamp), seqNo
