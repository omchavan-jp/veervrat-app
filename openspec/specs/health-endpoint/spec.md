## MODIFIED Requirements

### Requirement: Health check at /health (outside api/v1 prefix)
The system SHALL expose `GET /health` outside the `/api/v1` global prefix, returning HTTP 200 with body `{ "data": { "status": "ok" } }`. The endpoint SHALL require no authentication and SHALL NOT exist at `/api/v1/health`.

#### Scenario: Health check responds at /health
- **WHEN** `GET /health` is called without any session cookie
- **THEN** the response is HTTP 200 with body `{ "data": { "status": "ok" } }`

#### Scenario: Health check not accessible under api/v1
- **WHEN** `GET /api/v1/health` is called
- **THEN** the response is HTTP 404

#### Scenario: No auth required
- **WHEN** `GET /health` is called with no session or invalid session
- **THEN** the response is HTTP 200 (no auth guard applied to this route)
