# API Conventions — v1

## 1. Base URL and versioning

- all API routes are prefixed with `/api/v1/`
- version is in the URL path, not headers
- bump version only for breaking changes — additive changes (new fields, new endpoints) do not require a new version
- when v2 is needed, v1 continues to work until explicitly deprecated

## 2. Route design

### Resource-oriented URLs
Routes represent resources, not actions.

```
GET    /api/v1/journeys            → list journeys
POST   /api/v1/journeys            → create journey
GET    /api/v1/journeys/:id         → get journey
PATCH  /api/v1/journeys/:id         → update journey
DELETE /api/v1/journeys/:id         → soft-delete journey

GET    /api/v1/journeys/:id/stages  → list stages for a journey
POST   /api/v1/journeys/:id/stages  → create a stage
```

### Naming rules
- plural nouns for resource collections: `/journeys`, `/users`, not `/journey`, `/user`
- kebab-case for multi-word resources: `/auth-accounts`, `/journey-stages`
- nest sub-resources max one level deep: `/journeys/:id/stages` is fine, `/journeys/:id/stages/:stageId/reflections` should become `/stages/:stageId/reflections` or `/reflections?stageId=...`
- no verbs in URLs except for non-CRUD actions (see below)

### Non-CRUD actions
When an action doesn't map cleanly to a CRUD operation, use a verb sub-path on the resource:

```
POST   /api/v1/journeys/:id/pause
POST   /api/v1/journeys/:id/resume
POST   /api/v1/journeys/:id/complete
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
```

These are always POST — they represent actions with side effects.

## 3. HTTP methods

| Method | Meaning | Idempotent | Request body |
|---|---|---|---|
| GET | Read resource(s) | Yes | No |
| POST | Create resource or trigger action | No | Yes |
| PATCH | Partial update | No | Yes (partial fields) |
| PUT | Not used — prefer PATCH | — | — |
| DELETE | Remove resource (soft-delete unless specified) | Yes | No |

### Rules
- GET must never mutate state
- DELETE is idempotent — deleting an already-deleted resource returns 204, not 404
- prefer PATCH over PUT — we always do partial updates, never full replacement

## 4. Request conventions

### Path parameters
- used for resource identity: `/journeys/:id`
- always UUIDs

### Query parameters
- used for filtering, sorting, pagination on list endpoints
- use camelCase: `?pageSize=20&sortBy=createdAt`

### Request body
- JSON only (`Content-Type: application/json`)
- camelCase field names
- validated by DTO in the controller

## 5. Response conventions

Defined in Backend Conventions (sections 5–6). Summary:

### Success — single resource
```json
{ "data": { "id": "...", "title": "...", "createdAt": "..." } }
```

### Success — list
```json
{
  "data": [{ ... }, { ... }],
  "meta": { "nextCursor": "abc123", "pageSize": 20, "total": 142 }
}
```

### Success — action with no return data
```
204 No Content (empty body)
```

### Error
```json
{
  "statusCode": 422,
  "error": "VALIDATION_ERROR",
  "message": "Title is required",
  "details": [{ "field": "title", "message": "must not be empty" }]
}
```

### Field naming in responses
- camelCase for all JSON fields
- dates as ISO 8601 strings: `"2026-05-19T10:30:00.000Z"`
- IDs as UUID strings

## 6. Status codes

### Success
| Code | When |
|---|---|
| 200 | Successful read or update |
| 201 | Resource created |
| 204 | Successful action with no response body (logout, delete) |

### Client error
| Code | When |
|---|---|
| 400 | Malformed request (bad JSON, missing required header) |
| 401 | Not authenticated (no session, expired session) |
| 403 | Authenticated but not authorized for this action |
| 404 | Resource not found (or user not allowed to know it exists) |
| 409 | Conflict (duplicate email, concurrent edit) |
| 422 | Validation failed (input structurally valid but semantically wrong) |
| 429 | Rate limited |

### Server error
| Code | When |
|---|---|
| 500 | Unexpected server error — always logged, never exposes internals |

### Rules
- use 404 rather than 403 when revealing the resource's existence is itself a privacy leak
- never return 200 with an error body — use proper status codes

## 7. Filtering and sorting

For list endpoints:

```
GET /api/v1/journeys?status=active&sortBy=createdAt&sortOrder=desc
```

### Rules
- filter params match field names in camelCase
- `sortBy` accepts a single field name
- `sortOrder` is `asc` or `desc`, defaults to `desc` for time-based, `asc` for alphabetical
- unsupported filter/sort fields return 400, not silently ignored
- multiple values for the same filter use comma separation: `?status=active,paused`

## 8. Pagination

Defined in Backend Conventions (section 7). Summary:

- cursor-based by default: `?cursor=abc&pageSize=20`
- default page size: 20, max: 100
- response includes `meta.nextCursor` (null if last page)
- `meta.total` included when cost is acceptable (small tables, cached counts), omitted for expensive counts

## 9. Idempotency

### Naturally idempotent
- GET, DELETE — safe to retry

### Non-idempotent actions that need protection
For critical POST operations (e.g., creating a payment, submitting an assessment), use an `Idempotency-Key` header:

```
POST /api/v1/assessments/:id/complete
Idempotency-Key: client-generated-uuid
```

### Rules
- not required on every POST — only on actions where duplicate execution causes problems
- server stores the idempotency key + result, returns cached result on duplicate
- idempotency keys expire after 24 hours

## 10. Authentication in requests

- session cookie is sent automatically by the browser — no `Authorization` header needed
- API endpoints behind auth return 401 if no valid session
- public endpoints (login, register, OAuth callback, health check) do not require a session

## 11. Rate limiting

- rate limits are applied per-session or per-IP for unauthenticated requests
- rate-limited responses return 429 with a `Retry-After` header
- stricter limits on auth endpoints (login, register, forgot-password) to prevent brute-force
- standard endpoints get reasonable defaults (e.g., 100 requests/minute)
- exact limits are configured server-side, not documented in API contracts

## 12. Health and meta endpoints

⚠️ **Corrected 2026-08-16** — the paths below were documented wrong. Verified against the
running app.

```
GET /health              → { "data": { "status": "ok" } }
                           Liveness only. Cheap, no dependency checks — must NOT flap on a
                           transient DB blip, or the platform restarts a healthy container.

GET /ready               → { "data": { "status": "ok",
                                       "checks": { "database": "up", "redis": "up" } } }
                           Readiness. Actually pings Postgres and Redis; returns 503 if either
                           is down. **This is the check that matters on deploy** — a green
                           /ready proves images, Key Vault secrets, networking and schema are
                           all correct together.

GET /api/v1/auth/me      → current authenticated user + roles
```

Both `/health` and `/ready` deliberately sit **outside** the `/api/v1` prefix so probes do not
depend on API versioning. `/api/v1/health` returns 404 — that is expected, not a bug.
