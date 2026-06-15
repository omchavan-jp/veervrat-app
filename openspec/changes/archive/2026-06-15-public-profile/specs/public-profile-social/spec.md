## ADDED Requirements

### Requirement: Public profile includes follow data and credibility

`GET /api/v1/users/:username` SHALL include the user's follower count, following count, and — when the requester is authenticated — whether the requester follows this user (`isFollowing`) and whether this user follows the requester (`followsYou`). It SHALL include a VM credibility stat (count of COMPLETED journeys the user was the assigned VM for) only when that count is greater than zero. Private profiles SHALL continue to return 404 (existence not revealed). The endpoint SHALL resolve the requesting user when a session is present while remaining accessible to guests.

#### Scenario: authenticated requester sees follow status

- **WHEN** an authenticated user fetches another user's public profile
- **THEN** the response includes followerCount, followingCount, isFollowing, and followsYou

#### Scenario: guest sees counts but no personal status

- **WHEN** a guest fetches a public profile
- **THEN** the response includes followerCount and followingCount but no isFollowing/followsYou

#### Scenario: credibility shown only for users who have guided journeys

- **WHEN** a profile belongs to a user who was the VM on at least one completed journey
- **THEN** the response includes the guided-journeys credibility count

#### Scenario: credibility absent when zero

- **WHEN** a profile belongs to a user who has never completed a journey as VM
- **THEN** the credibility count is absent from the response

#### Scenario: private profile still 404

- **WHEN** any requester fetches a private profile
- **THEN** the response is 404

### Requirement: Public experience entries for a user

`GET /api/v1/users/:username/experience-logs` SHALL return the named user's PUBLIC, published, non-deleted experience entries, paginated (cursor-based), and SHALL be guest-accessible. Non-public, draft, and deleted entries SHALL never appear.

#### Scenario: anyone lists a user's public entries

- **WHEN** a guest or authenticated user fetches `/api/v1/users/:username/experience-logs`
- **THEN** only that user's PUBLIC, published entries are returned, paginated

#### Scenario: private/draft entries excluded

- **WHEN** the user has ONLY_ME, FRIENDS, or draft entries
- **THEN** none of those appear in the response
