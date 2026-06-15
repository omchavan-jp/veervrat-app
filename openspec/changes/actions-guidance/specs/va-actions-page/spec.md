## ADDED Requirements

### Requirement: VA Actions page

The system SHALL render `/actions` as a single-column grouped work-queue sourced from `GET /api/v1/actions`, with sections in the screen-spec-4 order: ERC returned for revisit → VM suggestions awaiting decision → pending VM approvals (read-only) → new ERC available → journey closure pending. The VM-suggestions section SHALL offer Accept/Dismiss actions (invoking the existing sidenote acknowledge/dismiss endpoints); other items SHALL navigate to their ERC or journey context. The page SHALL handle all four states: loading, empty ("All clear — you're on top of it."), error, and success. All user-facing strings SHALL be localized via next-intl and bilingual content SHALL follow the Devanagari-primary rule. The page SHALL be reachable from the app shell navigation and SHALL render correctly at mobile, tablet, and desktop widths.

#### Scenario: VA sees grouped pending items

- **WHEN** a VA with pending items opens `/actions`
- **THEN** items render under their correct section headings in most-urgent-first order, each linking to its ERC or journey context

#### Scenario: VA accepts a VM suggestion inline

- **WHEN** a VA clicks Accept on a VM suggestion in the suggestions section
- **THEN** the suggestion is acknowledged via the existing endpoint and the item leaves the queue on success (query invalidated)

#### Scenario: empty state is not a dead end

- **WHEN** a VA with no pending items opens `/actions`
- **THEN** the page shows the localized "All clear" empty state rather than a blank or broken view

#### Scenario: error state is handled

- **WHEN** the actions request fails
- **THEN** the page shows a localized error state, not a blank screen or an unhandled exception
