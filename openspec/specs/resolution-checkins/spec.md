### Requirement: VA can log a check-in against an in-progress resolution
The system SHALL allow a VA to log a single check-in (status: `done` | `partial` | `missed`, optional note up to 500 characters) against a `JourneyResolution` that is in `IN_PROGRESS` status. The check-in is recorded with the server timestamp at the moment of submission. Logging a check-in does NOT automatically change the resolution's `ErcStatus`.

#### Scenario: Successful done check-in
- **WHEN** a VA sends `POST /api/v1/journeys/:id/resolutions/:rid/checkins` with `{ "status": "done" }` and the resolution is `IN_PROGRESS` and the VA owns the journey
- **THEN** the system creates a `ResolutionCheckin` record with `status = DONE`, `checked_in_at = now()`, and returns `201` with the created check-in object

#### Scenario: Successful partial check-in with note
- **WHEN** a VA sends `POST /api/v1/journeys/:id/resolutions/:rid/checkins` with `{ "status": "partial", "note": "Did half the reading" }` and the resolution is `IN_PROGRESS`
- **THEN** the system creates a `ResolutionCheckin` record with `status = PARTIAL`, `note = "Did half the reading"`, and returns `201`

#### Scenario: Check-in rejected when resolution is not in_progress
- **WHEN** a VA sends `POST /api/v1/journeys/:id/resolutions/:rid/checkins` and the resolution's status is `NOT_STARTED`, `SUBMITTED`, or `APPROVED`
- **THEN** the system returns `422` with error `INVALID_CHECKIN_STATE`

#### Scenario: Check-in rejected for non-owner VA
- **WHEN** a VA who does not own the journey sends `POST /api/v1/journeys/:id/resolutions/:rid/checkins`
- **THEN** the system returns `403` with error `ACCESS_DENIED`

#### Scenario: Check-in rejected for unknown resolution
- **WHEN** a VA sends `POST /api/v1/journeys/:id/resolutions/:rid/checkins` with a `rid` that does not exist or does not belong to the journey
- **THEN** the system returns `404` with error `ENTITY_NOT_FOUND`

#### Scenario: Check-in rejected when note exceeds 500 characters
- **WHEN** a VA sends `POST` with `note` longer than 500 characters
- **THEN** the system returns `400` with a validation error

---

### Requirement: System returns check-in history with streak for a resolution
The system SHALL return a list of all check-ins for a given `JourneyResolution`, ordered by `checked_in_at` ascending (oldest first), along with a computed `streak` count. Streak is defined as the number of trailing consecutive check-ins with `status = done`. A `partial` or `missed` check-in resets the streak to zero. Calendar gaps between check-ins do NOT break the streak — only a non-`done` submission breaks it.

#### Scenario: Empty history
- **WHEN** a VA sends `GET /api/v1/journeys/:id/resolutions/:rid/checkins` and no check-ins have been logged
- **THEN** the system returns `200` with `{ "data": { "checkins": [], "streak": 0 } }`

#### Scenario: Streak of consecutive done check-ins
- **WHEN** a VA has logged 3 check-ins all with status `done`
- **THEN** `GET /api/v1/journeys/:id/resolutions/:rid/checkins` returns `streak: 3`

#### Scenario: Streak resets on partial or missed
- **WHEN** a VA has logged: done, done, missed, done, done
- **THEN** `GET` returns `streak: 2` (only the trailing `done` run counts)

#### Scenario: Streak is zero when last check-in is not done
- **WHEN** the most recent check-in has status `partial` or `missed`
- **THEN** `GET` returns `streak: 0`

#### Scenario: VM can view check-in history
- **WHEN** an assigned VM sends `GET /api/v1/journeys/:id/resolutions/:rid/checkins`
- **THEN** the system returns `200` with the full history (VM has `journey.view` permission)

#### Scenario: Non-participant gets 403
- **WHEN** a user who is neither the journey owner nor an assigned VM sends `GET`
- **THEN** the system returns `403` with error `ACCESS_DENIED`

---

### Requirement: Resolution card shows inline check-in form when in_progress
On the Resolutions tab, each resolution card in `IN_PROGRESS` status SHALL display an inline check-in form with three toggle buttons (Done / Partial / Missed), an optional note textarea (max 500 characters visible client-side), and a "Log check-in" submit button. The form SHALL be disabled while a submission is pending.

#### Scenario: Log check-in inline form visible only for in_progress resolutions
- **WHEN** a resolution card has status `IN_PROGRESS` and is not deactivated
- **THEN** the inline check-in form is rendered with Done/Partial/Missed toggle buttons

#### Scenario: Form not shown for non-in_progress resolutions
- **WHEN** a resolution card has status `NOT_STARTED`, `SUBMITTED`, or `APPROVED`
- **THEN** no check-in form is shown

#### Scenario: Successful check-in submission updates history
- **WHEN** the VA selects "Done" and clicks "Log check-in"
- **THEN** the form submits, the check-in history refreshes, and the streak count updates

---

### Requirement: Resolution card shows check-in history and streak
Each resolution card SHALL display the current streak count when `streak > 0`. The check-in history SHALL be accessible via an expandable "History" toggle below the card. Each history entry shows the check-in status (icon or label), the timestamp, and the note (if any).

#### Scenario: Streak badge visible when streak is non-zero
- **WHEN** a resolution has one or more trailing done check-ins
- **THEN** the card shows a streak badge (e.g., "🔥 3")

#### Scenario: No streak badge when streak is zero
- **WHEN** the streak is 0 (no check-ins, or last is partial/missed)
- **THEN** no streak badge is displayed

#### Scenario: History toggle shows/hides check-in list
- **WHEN** the VA clicks the "History" toggle on a resolution card
- **THEN** the list of check-ins expands, showing each entry with status, timestamp, and note
