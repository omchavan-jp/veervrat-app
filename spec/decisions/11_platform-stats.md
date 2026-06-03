# Platform Stats (Public)
_Last updated: 2026-05-31 | Round: R1_

## Confirmed Decisions

- **Four global stats** displayed in the right sidebar, visible to all (including guests):
  - **Vratarthis** — total registered user count
  - **Vratmitras** — count of users who have acted as VM at least once
  - **Tests solved** — total test completions across all users
  - **Practice-days completed** — computed as N(resolutions) × N(vratarthis) × days (per prototype formula)

- Stats are **approximate/cached** — not real-time exact figures. Updated every **60 minutes** via Redis cache.

- Stats are **global platform-wide** — not personalised to the viewer.

## Open Questions (area-specific)
- Cache refresh interval — TBD (hourly suggested, confirm during implementation)
- Practice-days formula — confirm exact computation before implementation
