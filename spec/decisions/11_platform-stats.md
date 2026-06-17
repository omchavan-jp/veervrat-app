# Platform Stats (Public)
_Last updated: 2026-06-18 | Round: R1 (open questions resolved at Item 33 implementation)_

## Confirmed Decisions

- **Four global stats** exposed via `GET /api/v1/stats/platform` and displayed in the dashboard right rail, visible to all (including guests — the route carries no `SessionGuard`):
  - **Vratarthis** — total users holding the `VRATARTHI` role (`userRole` count).
  - **Vratmitras** — distinct users who have acted as VM at least once (`vmRelationship` distinct `vmId`).
  - **Tests solved** — total non-draft test attempts (`testAttempt` where `isDraft = false`).
  - **Practice-days completed** — total resolution check-ins where the VA actually practised (`resolutionCheckin` with status `DONE` or `PARTIAL`; `MISSED` excluded). See the formula note below.

- Stats are **approximate/cached** — not real-time exact figures. Cached in Redis under key `platform:stats` with a **60-minute TTL**; a cache miss recomputes from Postgres and re-populates. Redis read/write failures degrade gracefully (fall back to a live DB query; the response is never blocked).

- Stats are **global platform-wide** — not personalised to the viewer.

## Resolved (formerly open) questions
- **Cache refresh interval** → **60 minutes** (Redis TTL on `platform:stats`). Matches the "approximate/cached" intent.
- **Practice-days formula** → the prototype's synthetic `N(resolutions) × N(vratarthis) × days` is **superseded**. With real check-in data now in the schema, practice-days = the honest count of logged check-ins where the VA practised (`DONE` + `PARTIAL`). This is exact, not multiplicative, and grows only with genuine activity.
