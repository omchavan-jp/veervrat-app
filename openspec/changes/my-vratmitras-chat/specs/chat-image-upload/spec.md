## ADDED Requirements

### Requirement: Image upload endpoint for chat
The system SHALL provide endpoint `POST /api/v1/uploads/chat` that accepts file uploads (images only: jpg, jpeg, png, webp), max 10MB per image. Response is JSON with public MinIO URL where image is stored. Only authenticated users (VA or VM) can upload.

#### Scenario: Valid image upload returns public URL
- **WHEN** user POSTs image file to `/api/v1/uploads/chat`
- **THEN** system stores in MinIO and returns `{ data: { url: "https://minio.example.com/chat/..." } }`

#### Scenario: Non-image file rejected
- **WHEN** user uploads PDF, video, or other non-image format
- **THEN** system returns 400 Bad Request with error "File type not supported"

#### Scenario: File exceeds 10MB limit
- **WHEN** user uploads image > 10MB
- **THEN** system returns 413 Payload Too Large

#### Scenario: Unauthenticated upload rejected
- **WHEN** unauthenticated user POSTs to endpoint
- **THEN** system returns 401 Unauthorized

### Requirement: Embedded images in Tiptap content
The returned public URL SHALL be embedded in Tiptap message content as `{ type: 'image', attrs: { src: 'https://minio.example.com/...' } }` node.

#### Scenario: Image embedded in message
- **WHEN** user includes uploaded image in chat message
- **THEN** Tiptap content contains image node with MinIO URL

#### Scenario: Image alt text supported
- **WHEN** image node is created
- **THEN** alt attribute is optional but supported for accessibility

### Requirement: Uploaded images linked to chat room
The system SHALL store metadata tracking: image id, uploader userId, roomId (optional — images not yet in a message), createdAt. Images older than 30 days with no chat message reference are eligible for cleanup (future feature).

#### Scenario: Image metadata persisted
- **WHEN** image is uploaded
- **THEN** system stores uploader, timestamp, optional room reference

#### Scenario: Multiple images in single message
- **WHEN** user sends message with 2+ images
- **THEN** message content contains 2+ image nodes, each with distinct URL
