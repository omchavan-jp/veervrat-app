## ADDED Requirements

### Requirement: Rate limits are enforced globally across all API replicas

Rate limit counters MUST be stored in Redis, shared by every API replica, so that a
configured limit is the limit for the system as a whole rather than per process.

With the default in-memory storage, N replicas permit N times the configured limit, and
every deployment resets all counters to zero. This applies to the global throttle and to
the stricter per-route auth throttles (login, signup, forgot-password, reset-password),
where it materially weakens a brute-force control — silently, and precisely as the system
scales up.

The Redis-backed storage MUST reuse the existing application Redis client rather than
opening an independent connection pool.

When no Redis is configured (`REDIS_URL` unset — the local development case), the API MUST
fall back to in-memory storage and log a warning at startup, rather than failing to boot or
wiring a client that can never connect. Per-process limiting is correct behaviour for a
single local process.

#### Scenario: Limit is shared across replicas

- **GIVEN** more than one API replica is running and a route is limited to N requests per window
- **WHEN** requests are distributed across replicas within one window
- **THEN** the N+1th request is rejected regardless of which replica receives it

#### Scenario: Counters survive a deployment

- **GIVEN** a client has consumed part of its rate-limit allowance
- **WHEN** the API is redeployed and replicas are replaced
- **THEN** the consumed allowance is still counted against that client in the same window

#### Scenario: Auth throttles remain enforced

- **WHEN** repeated failed login attempts arrive across different replicas
- **THEN** the configured auth throttle applies to their total, not per replica

#### Scenario: Local development without Redis still boots

- **GIVEN** `REDIS_URL` is not configured
- **WHEN** the API starts
- **THEN** it boots successfully using in-memory rate-limit storage
- **AND** logs a warning that rate limiting is per-process only
