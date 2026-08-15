## ADDED Requirements

### Requirement: Database connection usage per replica is bounded and configurable

The Prisma database adapter MUST be configured with an explicit maximum pool size, set via
`DATABASE_POOL_MAX` (default 10, matching the current effective default).

Without an explicit ceiling, each replica opens up to its own default number of connections.
Managed PostgreSQL — particularly Azure Database for PostgreSQL Flexible Server on the
Burstable tier — permits a comparatively small `max_connections`. Connection exhaustion is a
cliff rather than a slope: once the server refuses new connections, **every** request fails
at once, including the health checks that would otherwise let the platform recover the
service.

The governing arithmetic MUST be documented alongside the setting:

```
DATABASE_POOL_MAX × maxReplicas + headroom (migrations, admin tooling) ≤ server max_connections
```

A malformed value MUST fail at startup via config validation rather than silently falling
back to a default.

#### Scenario: Pool size is capped at the configured value

- **GIVEN** `DATABASE_POOL_MAX` is set to N
- **WHEN** the API is under enough load to saturate the pool
- **THEN** that replica holds at most N database connections
- **AND** further queries queue rather than opening additional connections

#### Scenario: Default applies when unset

- **GIVEN** `DATABASE_POOL_MAX` is not configured
- **WHEN** the API starts
- **THEN** the pool ceiling is 10, matching prior behaviour

#### Scenario: Invalid configuration fails fast

- **GIVEN** `DATABASE_POOL_MAX` is set to a non-numeric or non-positive value
- **WHEN** the API starts
- **THEN** startup fails with a configuration validation error
