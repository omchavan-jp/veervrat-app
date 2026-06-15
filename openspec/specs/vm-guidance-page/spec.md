# vm-guidance-page Specification

## Purpose
TBD - created by archiving change actions-guidance. Update Purpose after archive.
## Requirements
### Requirement: VM Guidance page

The system SHALL render `/vratmitra/guidance` as a single-column grouped work-queue sourced from `GET /api/v1/vm-actions`, with sections in the screen-spec-5 order: closure requests awaiting approval → journey completion requests → suggestion status updates (read-only) → custom ERC review status (read-only). The closure-requests section SHALL offer Approve and Return actions with an inline note field (invoking the existing ERC approve / revisit endpoints); the journey-completion section SHALL offer Approve (invoking the existing completion-approval endpoint). The page SHALL be a separate route from the VA `/actions` page (not a conditional render of one route). It SHALL render inside the shared app shell (sidebar, auth gate, providers present), handle all four states (loading, empty "No pending actions from your vratarthis.", error, success), localize all strings via next-intl, and render correctly at mobile, tablet, and desktop widths.

#### Scenario: VM approves a closure request inline

- **WHEN** a VM clicks Approve on a closure request
- **THEN** the ERC item is approved via the existing endpoint and removed from the queue on success (query invalidated)

#### Scenario: VM returns an item for revisit with a note

- **WHEN** a VM enters a note and clicks Return on a closure request
- **THEN** the item is returned via the existing revisit endpoint carrying the note, and it leaves the closure-requests section on success

#### Scenario: read-only sections expose no mutation controls

- **WHEN** a VM views the suggestion-status and custom-ERC-review-status sections
- **THEN** those items are displayed without Approve/Return controls

#### Scenario: page renders within the app shell

- **WHEN** a VM opens `/vratmitra/guidance`
- **THEN** the shared sidebar navigation is present (the page is not shell-less) and the route is behind the authenticated gate

#### Scenario: empty state for a VM with no pending items

- **WHEN** a VM with assignments but no pending items opens `/vratmitra/guidance`
- **THEN** the localized "No pending actions from your vratarthis." empty state is shown

