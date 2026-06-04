## ADDED Requirements

### Requirement: Create or resume draft test
`POST /api/v1/tests` SHALL create a new draft TestAttempt for a weakness. If a draft already exists for the user+weakness pair, it SHALL return the existing draft (idempotent — no 409).

#### Scenario: POSITIVE — VA creates a new draft test
- **WHEN** `POST /api/v1/tests { weaknessId }` is called by an authenticated VA with no existing draft for that weakness
- **THEN** a new TestAttempt SHALL be created with `isDraft: true`
- **THEN** the response SHALL return `{ data: { id, weaknessId, isDraft: true, answeredCount: 0, totalSentences, existed: false } }` with status 201

#### Scenario: POSITIVE — VA resumes existing draft (idempotent create)
- **WHEN** `POST /api/v1/tests { weaknessId }` is called and a draft already exists for that user+weakness
- **THEN** the existing draft SHALL be returned with `existed: true` and status 200
- **THEN** no new TestAttempt row SHALL be created

#### Scenario: NEGATIVE — unauthenticated request
- **WHEN** `POST /api/v1/tests` is called without a session cookie
- **THEN** the response SHALL return 401

#### Scenario: NEGATIVE — non-VA role cannot take test
- **WHEN** `POST /api/v1/tests` is called by a user without the VRATARTHI role
- **THEN** the response SHALL return 403

### Requirement: Save test answers (partial upsert)
`PATCH /api/v1/tests/:id/answers` SHALL upsert answers for a draft test. Each answer is `{ sentenceId, score }` where score is 1-4.

#### Scenario: POSITIVE — VA saves partial answers
- **WHEN** `PATCH /api/v1/tests/:id/answers { answers: [{ sentenceId, score }] }` is called by the test owner
- **THEN** each answer SHALL be created or updated in `test_answers` (upsert on unique testAttemptId+sentenceId)
- **THEN** the response SHALL return 200 with updated answered count

#### Scenario: NEGATIVE — cannot save answers to submitted test
- **WHEN** `PATCH /api/v1/tests/:id/answers` is called on a test where `isDraft: false`
- **THEN** the response SHALL return 409 with error `TEST_ALREADY_SUBMITTED`

#### Scenario: NEGATIVE — invalid score value
- **WHEN** `PATCH /api/v1/tests/:id/answers` is called with a score not in [1, 2, 3, 4]
- **THEN** the response SHALL return 400

#### Scenario: NEGATIVE — non-owner cannot save answers
- **WHEN** `PATCH /api/v1/tests/:id/answers` is called by a user who does not own the test
- **THEN** the response SHALL return 403

### Requirement: Submit test
`POST /api/v1/tests/:id/submit` SHALL mark a draft test as submitted (`isDraft: false`, `submittedAt: now`).

#### Scenario: POSITIVE — VA submits draft test
- **WHEN** `POST /api/v1/tests/:id/submit` is called by the test owner on a draft test
- **THEN** `isDraft` SHALL be set to `false` and `submittedAt` set to current timestamp
- **THEN** the response SHALL return 200 with the updated test metadata

#### Scenario: NEGATIVE — cannot submit already-submitted test
- **WHEN** `POST /api/v1/tests/:id/submit` is called on a non-draft test
- **THEN** the response SHALL return 409 with error `TEST_ALREADY_SUBMITTED`

#### Scenario: NEGATIVE — unauthenticated request
- **WHEN** `POST /api/v1/tests/:id/submit` is called without a session cookie
- **THEN** the response SHALL return 401

### Requirement: Test question screen — one-at-a-time and view-all modes
The test question page SHALL support two view modes toggled client-side. Answers SHALL be saved to the backend on each change (debounced).

#### Scenario: One-at-a-time mode navigation
- **WHEN** the user is in one-at-a-time mode
- **THEN** one sentence SHALL be displayed at a time with previous/next navigation
- **THEN** skipping (navigating without answering) SHALL be allowed

#### Scenario: View-all mode
- **WHEN** the user toggles to view-all mode
- **THEN** all sentences SHALL render in a scrollable list with inline answer buttons

#### Scenario: Save draft and exit
- **WHEN** the user clicks "Save draft & exit"
- **THEN** a confirmation SHALL appear ("Save as draft" / "Discard")
- **THEN** on confirm: current answers are saved and user is returned to the weakness detail page

#### Scenario: Submit enabled when at least one answer exists
- **WHEN** the user has answered at least one sentence
- **THEN** the "Submit" button SHALL be enabled in the sticky footer
- **WHEN** the user has answered zero sentences
- **THEN** the "Submit" button SHALL be disabled
