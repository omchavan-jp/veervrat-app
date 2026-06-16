# moderation-custom-erc-api Specification

## Purpose
TBD - created by archiving change moderation-erc. Update Purpose after archive.
## Requirements
### Requirement: Custom ERC review queue

`GET /api/v1/moderation/custom-erc` SHALL return pending custom-ERC submissions (FIFO, paginated) for admins and moderators only. Each item SHALL include the ERC title, type, submitter, and submission date.

#### Scenario: moderator lists the pending queue

- **WHEN** a moderator calls `GET /api/v1/moderation/custom-erc`
- **THEN** pending custom-ERC submissions are returned, oldest first, paginated

#### Scenario: NEGATIVE — non-moderator is rejected

- **WHEN** a VA (non-moderator/admin) calls the endpoint
- **THEN** the response is 403

### Requirement: Custom ERC review detail with limited context

`GET /api/v1/moderation/custom-erc/:id` SHALL return the submission's ERC content (title, description, type-specific fields), the submitter (display name, username, avatar), the journey title, the journey's sentence, its subvirtue and virtue, and the journey's weakness tags. It SHALL NOT return journey contents (experience logs, other ERC selections, ERC status) or chat. Admin/moderator only.

#### Scenario: moderator views review detail

- **WHEN** a moderator opens a submission's detail
- **THEN** the ERC content + submitter + journey title + sentence + subvirtue/virtue + weakness tags are returned

#### Scenario: NEGATIVE — journey contents and chat are not exposed

- **WHEN** the review detail is returned
- **THEN** it contains no experience logs, no other ERC items/statuses, and no chat

### Requirement: Approve custom ERC with optional edits and pool promotion

`POST /api/v1/moderation/custom-erc/:id/approve` SHALL, for a pending submission: apply any moderator edits to the item, promote a copy into the global pool (a pool Exposure/Resolution/Challenge tied to the journey's sentence with the journey's weakness tags and the item's type-specific fields), mark the review approved, set the journey item's review status to approved, and notify the submitter. It SHALL be admin/moderator only and audit-logged.

#### Scenario: moderator approves and the item is promoted to the pool

- **WHEN** a moderator approves a pending submission
- **THEN** a pool entity of the correct type is created from the item, the review is marked approved, and the submitter is notified

#### Scenario: moderator edits before approving

- **WHEN** a moderator supplies edits and approves
- **THEN** the edits are applied to the item before promotion and the edit is audit-logged

#### Scenario: NEGATIVE — approving an already-decided submission

- **WHEN** approve is called on a submission that is not pending
- **THEN** the request is rejected

### Requirement: Reject custom ERC with mandatory reason

`POST /api/v1/moderation/custom-erc/:id/reject` SHALL require a non-empty reason, mark the review rejected (storing the reason), set the journey item's review status to rejected (the item stays on the VA's journey, not promoted), and notify the submitter. Admin/moderator only, audit-logged.

#### Scenario: moderator rejects with a reason

- **WHEN** a moderator rejects a submission with a reason
- **THEN** the review is marked rejected with the reason, the item is not promoted, and the submitter is notified

#### Scenario: NEGATIVE — reject without a reason

- **WHEN** reject is called without a reason
- **THEN** the response is 400

