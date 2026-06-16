## ADDED Requirements

### Requirement: Moderation dashboard

The system SHALL provide a `/moderation` dashboard reachable from a navigation entry visible only to moderators and admins, rendering inside the shared app shell. It SHALL show section cards (Custom ERC Review with a pending count; other sections may be present as placeholders). Non-moderators SHALL NOT reach it.

#### Scenario: moderator sees the dashboard

- **WHEN** a moderator opens /moderation
- **THEN** the dashboard renders inside the app shell with a Custom ERC Review card and its pending count

#### Scenario: nav entry hidden from non-moderators

- **WHEN** a regular VA views the navigation
- **THEN** no Moderation entry is shown

### Requirement: Custom ERC review panel

The system SHALL provide a Custom ERC Review panel (queue + review detail) for moderators. The queue lists pending submissions; selecting one shows read-only context (submitter, journey title, sentence, subvirtue → virtue, weakness tags) and the editable ERC content (title, description, type-specific fields). Actions: Approve (promotes to the pool, with any edits) and Reject (mandatory reason). It handles loading/empty/error/success, is localized, and responsive.

#### Scenario: moderator approves from the panel

- **WHEN** a moderator selects a submission and approves
- **THEN** the item is approved/promoted and removed from the pending queue

#### Scenario: moderator rejects with a reason

- **WHEN** a moderator enters a reason and rejects
- **THEN** the submission is rejected and leaves the queue

#### Scenario: empty queue state

- **WHEN** there are no pending submissions
- **THEN** a localized empty state ("No custom ERC submissions pending review.") is shown
