# experience-log-image-upload Specification

## Purpose
TBD - created by archiving change experience-logging. Update Purpose after archive.
## Requirements
### Requirement: Experience-log image upload

`POST /api/v1/uploads/experience` SHALL accept an image for embedding in an experience-log body, authenticated via session guard. It SHALL reuse the existing upload pipeline: MIME type validated server-side against the allowed image set, max 10MB per file, HEIC/HEIF converted to JPEG before storage, stored in MinIO under a randomized path, and an upload record persisted. It SHALL return the public URL for embedding in the Tiptap document.

#### Scenario: VA uploads a JPEG for an experience entry

- **WHEN** a VA POSTs a valid JPEG to `/api/v1/uploads/experience`
- **THEN** the image is stored and a public URL is returned

#### Scenario: HEIC converted to JPEG

- **WHEN** a VA POSTs an `image/heic` file
- **THEN** it is converted to JPEG server-side and the returned URL points to a `.jpg`

#### Scenario: NEGATIVE — disallowed type rejected

- **WHEN** a non-image MIME type is uploaded
- **THEN** the response is 400

#### Scenario: NEGATIVE — oversized file rejected

- **WHEN** a file larger than 10MB is uploaded
- **THEN** the response is 413

#### Scenario: NEGATIVE — unauthenticated

- **WHEN** the endpoint is called without a valid session
- **THEN** the response is 401

