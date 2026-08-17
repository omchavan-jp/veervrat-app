## MODIFIED Requirements

### Requirement: CSRF token cookie set on every response

The system SHALL set a `csrf-token` cookie on every HTTP response. The cookie SHALL be
non-HttpOnly (readable by JavaScript), SameSite=Lax, Secure in production, and contain a random
32-byte hex token. The cookie SHALL only be set if not already present (no rotation on every
request — only on session creation/rotation).

**When the web and api tiers are served from different hosts** that share a registrable domain,
the cookie SHALL additionally be scoped with an explicit `Domain` attribute naming the shared
parent domain, so that the web origin can read it.

CSRF protection here is double-submit: the client must read this cookie and echo its value in
the `X-CSRF-Token` header. A cookie scoped to the api's own host is delivered to the api but is
**unreadable by the web origin**, so every state-changing request would carry the cookie and no
header, and would be rejected. The failure presents as a CSRF fault rather than a cookie-scoping
fault, so the scope is stated here as a requirement rather than left to configuration.

Where the two tiers share an origin (local development), the cookie SHALL remain host-only.

#### Scenario: Cookie set on first response

- **WHEN** a client makes any HTTP request and no `csrf-token` cookie is present
- **THEN** the response includes `Set-Cookie: csrf-token=<hex>; SameSite=Lax; Secure` (Secure
  only in production)

#### Scenario: Cookie not rotated on subsequent requests

- **WHEN** a client makes a request and `csrf-token` cookie is already present
- **THEN** the response does NOT set a new `csrf-token` cookie

#### Scenario: Cookie readable by the web origin across hosts

- **GIVEN** web served from `veervrat.example.org` and api from `api.veervrat.example.org`
- **WHEN** the api sets the `csrf-token` cookie
- **THEN** the cookie is scoped to the shared parent domain, and JavaScript running on the web
  origin can read its value

#### Scenario: State-changing request succeeds across hosts

- **GIVEN** web and api served from different hosts sharing a registrable domain
- **WHEN** the client issues a POST including `X-CSRF-Token` read from the cookie
- **THEN** the request passes CSRF validation
