# follow-system Specification

## Purpose
TBD - created by archiving change public-profile. Update Purpose after archive.
## Requirements
### Requirement: Follow a user

`POST /api/v1/users/:username/follow` SHALL create a one-way follow from the authenticated user to the named user. It SHALL require authentication (guests cannot follow), reject self-follow, and be idempotent (following an already-followed user succeeds without creating a duplicate). On a new follow (a transition from not-following to following) it SHALL fire a `NEW_FOLLOWER` notification to the followed user.

#### Scenario: authenticated user follows another user

- **WHEN** an authenticated user POSTs to `/api/v1/users/:username/follow` for a different user
- **THEN** a follow relationship is created and a `NEW_FOLLOWER` notification is sent to that user

#### Scenario: idempotent re-follow

- **WHEN** a user follows someone they already follow
- **THEN** the request succeeds with no duplicate relationship and no second notification

#### Scenario: NEGATIVE — self-follow rejected

- **WHEN** a user POSTs to follow their own username
- **THEN** the response is 400 and no relationship is created

#### Scenario: NEGATIVE — guest cannot follow

- **WHEN** an unauthenticated request POSTs to the follow endpoint
- **THEN** the response is 401

### Requirement: Unfollow a user

`DELETE /api/v1/users/:username/follow` SHALL remove the authenticated user's follow of the named user. It SHALL be idempotent (unfollowing a user not currently followed succeeds). It SHALL NOT fire a notification.

#### Scenario: user unfollows

- **WHEN** a user DELETEs the follow endpoint for someone they follow
- **THEN** the relationship is removed

#### Scenario: idempotent unfollow

- **WHEN** a user unfollows someone they do not follow
- **THEN** the request succeeds with no error

### Requirement: Mutual-follow resolution

The system SHALL expose, for internal use, whether two users mutually follow each other (both directions present), to support the "Friends" experience-log visibility tier.

#### Scenario: mutual follow detected

- **WHEN** user A follows user B and user B follows user A
- **THEN** the mutual-follow check for (A, B) returns true

#### Scenario: one-way follow is not mutual

- **WHEN** A follows B but B does not follow A
- **THEN** the mutual-follow check for (A, B) returns false

