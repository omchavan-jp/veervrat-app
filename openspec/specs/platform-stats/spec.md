## ADDED Requirements

### Requirement: Platform-wide stats are served from a Redis-cached endpoint
The system SHALL expose `GET /api/v1/dashboard/platform-stats` returning approximate global platform counts. This endpoint is accessible to any authenticated user. Stats are cached in Redis with a 60-minute TTL (key: `platform:stats`).

Response shape:
```
{
  vratarthis: number,
  vratmitras: number,
  testsSolved: number,
  practiceDaysCompleted: number
}
```

- `vratarthis`: count of all users with the `VRATARTHI` role.
- `vratmitras`: count of distinct users who have at least one `JourneyVmAssignment` or `VmGlobalRelationship` record (i.e., have acted as VM at least once).
- `testsSolved`: count of all submitted (non-draft) `TestAttempt` rows across all users.
- `practiceDaysCompleted`: computed as `count(JourneyResolution) × count(distinct users with journeys)` (approximation per spec/11 formula — confirm during implementation; use 0 as fallback if formula TBD).

**Caching behaviour:**
- On cache hit: parse and return cached JSON.
- On cache miss: compute via Prisma, write to Redis `SET platform:stats <json> EX 3600`, then return.
- On Redis error: log the error and fall back to a direct DB query; do NOT surface the error to the client.

#### Scenario: Stats returned from cache on subsequent requests
- **WHEN** a first request triggers a DB query and populates the cache, and a second request arrives within 60 minutes
- **THEN** the second request returns the cached values without hitting the DB

#### Scenario: Redis unavailable — graceful fallback
- **WHEN** Redis is down and a request arrives for platform stats
- **THEN** the system computes stats directly from the DB and returns them (no error surfaced to client)

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request to `GET /api/v1/dashboard/platform-stats` is made without a valid session
- **THEN** the system returns `401 Unauthorized`
