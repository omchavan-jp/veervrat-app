## ADDED Requirements

### Requirement: Journey creation entry point
The `/journeys/new` page SHALL read `sentenceId` and `weaknessId` from query params, call `POST /journeys` on mount, and redirect to `/journeys/[id]` on success. No form is shown — the user already made the decision from the report page.

#### Scenario: Valid params — journey created and redirected
- **WHEN** the user navigates to `/journeys/new?sentenceId=X&weaknessId=Y`
- **THEN** the page SHALL display a loading spinner
- **THEN** on success, the browser SHALL navigate to `/journeys/[id]`

#### Scenario: Conflict — existing journey for sentence
- **WHEN** the API returns 409 JOURNEY_ALREADY_EXISTS
- **THEN** the page SHALL redirect to the existing journey at `/journeys/[existingId]`

#### Scenario: Missing params
- **WHEN** `sentenceId` is absent from the URL
- **THEN** the page SHALL redirect to `/study` with an error state

### Requirement: Journey list page
`/journeys` SHALL display the authenticated VA's journeys grouped or sorted by state, with links to each journey.

#### Scenario: Journey list renders with state badges
- **WHEN** an authenticated VA visits `/journeys`
- **THEN** each journey card SHALL show: title, sentence excerpt, state badge (Active/Paused/Dormant/Completed), weakness tags, last updated date
- **THEN** clicking a card SHALL navigate to `/journeys/[id]`

#### Scenario: Empty state
- **WHEN** the VA has no journeys
- **THEN** the page SHALL show an empty state with a CTA to `/study`

### Requirement: Journey shell header
The `/journeys/[id]` page SHALL render a persistent header with the journey's full context and a tab bar.

#### Scenario: Shell header renders journey context
- **WHEN** an authenticated VA views `/journeys/[id]`
- **THEN** the header SHALL display: journey title (editable inline), sentence text (EN), "Cultivating [subvirtue] → [virtue]", weakness tag(s), state indicator, VM name or "No VM", Pause/Resume button
- **THEN** clicking Pause SHALL call `PATCH /journeys/:id/state { action: "pause" }` and update the UI

#### Scenario: Inline title edit
- **WHEN** the VA clicks the journey title
- **THEN** it SHALL become an editable input
- **THEN** on blur, `PATCH /journeys/:id/title { title }` SHALL be called to persist the change

### Requirement: Status Overview tab
The Status Overview tab SHALL show ERC progress summary and empty state for a new journey.

#### Scenario: Empty state for new journey
- **WHEN** a newly created journey has no ERC items selected
- **THEN** the Status Overview SHALL show "Select your first exposures and resolutions to begin" with tab CTAs

#### Scenario: ERC progress cards when items exist
- **WHEN** the journey has ERC items (populated by item 12)
- **THEN** Status Overview SHALL show cards: Exposures (active/approved/total), Resolutions (active/approved/streak), Challenges (active/approved/total)
