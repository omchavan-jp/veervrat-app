## ADDED Requirements

### Requirement: VA can fetch personal dashboard stats
The system SHALL expose `GET /api/v1/dashboard/stats` returning aggregated personal stats for the authenticated VA. The response SHALL be wrapped in `{ data: { ... } }` per the global response interceptor.

Response shape:
```
{
  virtues: { count: number },
  subvirtues: { count: number },
  journeys: { active: number, completed: number },
  exposures: { active: number, completed: number },
  resolutions: { active: number, completed: number },
  challenges: { active: number, completed: number },
  weaknesses: { explored: number },
  tests: { taken: number }
}
```

- `virtues.count` and `subvirtues.count` are derived from active/not-started journeys: `journey → sentence → subvirtue → virtue`. Only distinct virtues/subvirtues are counted.
- `journeys.active` = journeys with state `ACTIVE` or `NOT_STARTED`. `journeys.completed` = state `COMPLETED`.
- ERC counts: `active` = status `IN_PROGRESS`; `completed` = status `APPROVED`.
- `weaknesses.explored` = distinct weaknesses where the user has at least one submitted `TestAttempt`.
- `tests.taken` = count of submitted (non-draft) `TestAttempt` rows for the user.

#### Scenario: Authenticated VA with active journeys
- **WHEN** an authenticated VA calls `GET /api/v1/dashboard/stats` and has 2 active journeys on sentences linked to 2 distinct virtues and 3 distinct subvirtues
- **THEN** the response contains `virtues.count = 2`, `subvirtues.count = 3`, and `journeys.active = 2`

#### Scenario: VA with no journeys or tests
- **WHEN** an authenticated VA calls `GET /api/v1/dashboard/stats` and has no journeys, no tests
- **THEN** the response returns all counts as `0`

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request to `GET /api/v1/dashboard/stats` is made without a valid session cookie
- **THEN** the system returns `401 Unauthorized`

#### Scenario: VM role cannot access VA stats endpoint
- **WHEN** a user with only the `VRATMITRA` role (no `VRATARTHI` role) calls `GET /api/v1/dashboard/stats`
- **THEN** the system returns `403 Forbidden`
