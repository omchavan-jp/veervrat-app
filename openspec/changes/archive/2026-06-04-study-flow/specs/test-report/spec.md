## ADDED Requirements

### Requirement: Test report computed on demand
`GET /api/v1/tests/:id/report` SHALL compute and return a scored report for a submitted test. The report is NOT stored — computed from test_answers joined to sentences, subvirtues, and virtues.

#### Scenario: POSITIVE — VA fetches own test report
- **WHEN** `GET /api/v1/tests/:id/report` is called by the test owner after submission
- **THEN** the response SHALL include:
  - Test metadata: `weaknessId`, `weaknessNameEn`, `submittedAt`, `totalSentences`, `answeredCount`
  - `flaggedSentences`: sentences with score 1 (Never) or 2 (Sometimes), sorted lowest score first
  - `otherSentences`: sentences with score 3 or 4, or unanswered
  - `virtuesToExplore`: deduplicated list of `{ virtueId, virtueNameEn, virtueNameMr }` derived from flagged sentences' subvirtue→virtue chain
  - Each sentence entry: `sentenceId`, `textEn`, `textMr`, `score` (null if unanswered), `subvirtueNameEn`, `virtueNameEn`

#### Scenario: NEGATIVE — cannot fetch report for draft test
- **WHEN** `GET /api/v1/tests/:id/report` is called on a test where `isDraft: true`
- **THEN** the response SHALL return 404 or 409 with error `TEST_NOT_SUBMITTED`

#### Scenario: NEGATIVE — non-owner cannot view report (unless assigned VM)
- **WHEN** `GET /api/v1/tests/:id/report` is called by a user who does not own the test and is not an assigned VM for the test owner
- **THEN** the response SHALL return 403

#### Scenario: NEGATIVE — unauthenticated request
- **WHEN** `GET /api/v1/tests/:id/report` is called without a session
- **THEN** the response SHALL return 401

### Requirement: Test report reveal — virtue-first framing
The TestReport page SHALL display flagged sentences expanded at the top, all other sentences collapsed below. A "Virtues to explore" badges section SHALL appear above the sentence list.

#### Scenario: Report builds progressively
- **WHEN** the TestReport page loads after submission confirmation
- **THEN** the report content SHALL animate in progressively (not instant page load) using Framer Motion

#### Scenario: Flagged sentences displayed expanded
- **WHEN** the report has flagged sentences (score 1 or 2)
- **THEN** they SHALL appear in the expanded section, sorted: score 1 (Never) first, then score 2 (Sometimes)
- **THEN** each flagged sentence SHALL show: text (EN + MR), score tag (color-coded), subvirtue badge, "Start journey" button

#### Scenario: Other sentences collapsed
- **WHEN** the report renders
- **THEN** sentences with score 3, 4, or unanswered SHALL appear in a collapsed "See all sentences" section
- **THEN** expanding SHALL animate the section open
- **THEN** each sentence in this section SHALL also have a "Start journey" button (full freedom)

#### Scenario: Virtues to explore badges
- **WHEN** any flagged sentences exist
- **THEN** a "Virtues to explore" section SHALL display deduplicated virtue badges derived from flagged sentences
- **WHEN** no sentences are flagged
- **THEN** the section SHALL not render (or show "No areas flagged — well done")

### Requirement: Submission preview before final submit
The TestSubmissionPreview page SHALL list all sentences with their selected answers before the user confirms submission.

#### Scenario: Preview shows all answers
- **WHEN** the preview page renders
- **THEN** all sentences from the weakness test SHALL be listed
- **THEN** answered sentences SHALL show the selected answer (color-coded)
- **THEN** unanswered sentences SHALL show "—"
- **THEN** [Confirm submission] and [Go back to review] actions SHALL be available

#### Scenario: Unanswered warning on submit from question screen
- **WHEN** the user clicks Submit from the question screen and there are unanswered sentences
- **THEN** a popup SHALL appear: "X sentences unanswered. Submit anyway or continue?"
- **THEN** [Submit anyway] navigates to preview; [Continue] dismisses the popup
