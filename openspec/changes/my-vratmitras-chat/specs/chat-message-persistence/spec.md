## ADDED Requirements

### Requirement: Persist messages with sequencing
The system SHALL store all chat messages in PostgreSQL table `Chat` (or `ChatMessage` per naming convention) with: id (UUID), roomId (string), senderId (UUID), content (jsonb — Tiptap AST), seqNo (bigint — monotonic per room), createdAt (timestamp), updatedAt (timestamp).

#### Scenario: Message is persisted on send
- **WHEN** message is received and validated
- **THEN** system stores in database with assigned seqNo and ISO timestamp

#### Scenario: seqNo is monotonic within a room
- **WHEN** multiple messages are sent to the same room
- **THEN** each receives unique increasing seqNo value

#### Scenario: Content stored as Tiptap JSON
- **WHEN** message with rich text (formatting, images, entity refs) is sent
- **THEN** content is stored as Tiptap JSON AST in jsonb column (not HTML or Markdown)

### Requirement: Retrieve missed messages after reconnect
The system SHALL provide endpoint `GET /api/v1/chats/:roomId/messages?after=seqNo` that returns all messages in the room with seqNo greater than the provided value. Pagination with optional `limit` parameter (default 50, max 200).

#### Scenario: Catch up on reconnect
- **WHEN** user reconnects and sends `after=42`
- **THEN** system returns messages with seqNo >= 43, ordered by seqNo ASC

#### Scenario: Empty result if no messages after seqNo
- **WHEN** `after` value equals or exceeds the latest seqNo
- **THEN** system returns empty array

#### Scenario: Pagination with limit
- **WHEN** user requests `after=10&limit=25`
- **THEN** system returns up to 25 messages after seqNo 10

#### Scenario: Only room participants can query
- **WHEN** user requests messages from a room they are not part of
- **THEN** system returns 403 Forbidden

### Requirement: Soft delete for user anonymisation
When a user is anonymised (Item 31), their sent messages are soft-deleted (content anonymised but record preserved for audit). Message senderId is NOT directly deleted to preserve seqNo order.

#### Scenario: Anonymised user's messages show as from deleted account
- **WHEN** VA requests messages after their assigned VM is deleted/anonymised
- **THEN** those messages display with sender anonymous, content redacted ("This message was deleted")
