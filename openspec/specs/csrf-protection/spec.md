## ADDED Requirements

### Requirement: CSRF token cookie set on every response
The system SHALL set a `csrf-token` cookie on every HTTP response. The cookie SHALL be non-HttpOnly (readable by JavaScript), SameSite=Lax, Secure in production, and contain a random 32-byte hex token. The cookie SHALL only be set if not already present (no rotation on every request — only on session creation/rotation).

#### Scenario: Cookie set on first response
- **WHEN** a client makes any HTTP request and no `csrf-token` cookie is present
- **THEN** the response includes `Set-Cookie: csrf-token=<hex>; SameSite=Lax; Secure` (Secure only in production)

#### Scenario: Cookie not rotated on subsequent requests
- **WHEN** a client makes a request and `csrf-token` cookie is already present
- **THEN** the response does NOT set a new `csrf-token` cookie

### Requirement: CSRF validation on state-changing requests
The system SHALL reject all POST, PATCH, DELETE, and PUT requests that do not include an `X-CSRF-Token` header matching the `csrf-token` cookie value.

#### Scenario: Valid CSRF token accepted
- **WHEN** a POST request includes `X-CSRF-Token` header with a value matching the `csrf-token` cookie
- **THEN** the request proceeds to the next handler

#### Scenario: Missing CSRF header rejected
- **WHEN** a POST/PATCH/DELETE request is made without an `X-CSRF-Token` header
- **THEN** the system returns 403 with error code `CSRF_INVALID`

#### Scenario: Mismatched CSRF token rejected
- **WHEN** a POST request includes `X-CSRF-Token` header but the value does not match the `csrf-token` cookie
- **THEN** the system returns 403 with error code `CSRF_INVALID`

#### Scenario: GET requests exempt
- **WHEN** a GET, HEAD, or OPTIONS request is made without an `X-CSRF-Token` header
- **THEN** the request proceeds normally (no CSRF check)

### Requirement: CSRF not applied to OAuth callback
The system SHALL exempt the `GET /auth/google/callback` route from CSRF validation, as it is a browser redirect from Google and cannot carry custom headers.

#### Scenario: OAuth callback proceeds without CSRF header
- **WHEN** a GET request arrives at `/api/v1/auth/google/callback`
- **THEN** the request is processed without any CSRF check
